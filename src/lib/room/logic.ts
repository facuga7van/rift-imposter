/**
 * Logica pura de una sala online: (estado, evento, contexto) -> estado nuevo.
 *
 * Sin I/O, sin reloj y sin tipos de DOM ni de Workers. El Durable Object
 * (worker/room.ts) es una capa delgada: arma el contexto (hora, quien tiene
 * socket abierto), llama a `reduce`, guarda y difunde. Por eso las reglas se
 * testean con Node directo: scripts/test-room.mjs.
 *
 * Contrato: si un evento no cambia nada, `reduce` devuelve EL MISMO objeto.
 * Room usa esa identidad para no escribir en storage (cada escritura cuenta
 * contra el tope diario del plan Free).
 */
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  TARGET_POINTS,
  applyDeltas,
  createRound,
  scoreRound,
  type Outcome,
  type Player,
  type PlayerStats,
  type Round,
} from "../game.ts";
import {
  NAME_MAX,
  PROTOCOL_VERSION,
  type ClientMessage,
  type ErrorCode,
  type Phase,
  type Snapshot,
  type YourRole,
} from "./protocol.ts";

export const HOST_GRACE_MS = 30_000;
export const ROOM_TTL_MS = 6 * 60 * 60 * 1000;

export type Seat = {
  id: string;
  /** SHA-256 del token del cliente. */
  tokenHash: string;
  /** Unico en la sala. */
  name: string;
  /** Se fue o lo expulsaron a mitad de ronda. */
  gone: boolean;
  joinedAt: number;
};

export type RoomState = {
  /** PROTOCOL_VERSION con que se creo. */
  v: number;
  code: string;
  createdAt: number;
  lastActivity: number;
  hostId: string | null;
  hostGraceUntil: number | null;
  phase: Phase;
  settings: { roleHint: boolean };
  /** Orden de llegada. */
  seats: Seat[];
  /** NUNCA sale en un snapshot. */
  round: Round | null;
  /** Ids que juegan la ronda en curso. */
  participants: string[];
  ready: string[];
  /** Voto de cada participante. `null` = "nadie". La clave presente = ya voto. */
  votes: Record<string, string | null>;
  outcome: Outcome | null;
  deltas: Record<string, Partial<PlayerStats>>;
  tally: Record<string, number> | null;
  stats: Record<string, PlayerStats>;
  roundsPlayed: number;
};

export type RoomEvent =
  | { type: "hello"; tokenHash: string; name: string }
  /** Cambio una conexion o sono la alarm: solo normaliza. */
  | { type: "sync" }
  | (Exclude<ClientMessage, { type: "hello" }> & { from: string });

export type RoomCtx = {
  now: number;
  /** Ids de asiento con socket abierto. Se deriva de los sockets, no se guarda. */
  connected: readonly string[];
  newId: () => string;
};

export type RoomError = { error: ErrorCode };

export function isRoomError(r: RoomState | RoomError): r is RoomError {
  return "error" in r;
}

export function createRoom(code: string, now: number): RoomState {
  return {
    v: PROTOCOL_VERSION,
    code,
    createdAt: now,
    lastActivity: now,
    hostId: null,
    hostGraceUntil: null,
    phase: "lobby",
    settings: { roleHint: true },
    seats: [],
    round: null,
    participants: [],
    ready: [],
    votes: {},
    outcome: null,
    deltas: {},
    tally: null,
    stats: {},
    roundsPlayed: 0,
  };
}

// ------------------------------------------------------------ borde de confianza

/** 1 a NAME_MAX caracteres despues de trim, sin caracteres de control. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const stripped = raw.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim();
  const name = [...stripped].slice(0, NAME_MAX).join("").trim();
  return name.length > 0 ? name : null;
}

/** Valida un `hello` crudo. `null` si no es un hello valido. */
export function parseHello(msg: unknown): { token: string; name: string } | "bad_version" | null {
  if (!msg || typeof msg !== "object") return null;
  const m = msg as Record<string, unknown>;
  if (m.type !== "hello") return null;
  if (m.v !== PROTOCOL_VERSION) return "bad_version";
  if (typeof m.token !== "string" || !/^[0-9a-f]{32}$/.test(m.token)) return null;
  return { token: m.token, name: typeof m.name === "string" ? m.name : "" };
}

/** Valida cualquier otro mensaje de cliente y le pega el emisor. */
export function toEvent(msg: unknown, from: string): RoomEvent | null {
  if (!msg || typeof msg !== "object") return null;
  const m = msg as Record<string, unknown>;
  const type = m.type;
  switch (type) {
    case "start":
    case "ready":
    case "advance":
    case "closeVote":
    case "nextRound":
    case "cancelRound":
    case "newGame":
    case "leave":
      return { type, from } as RoomEvent;
    case "settings":
      return typeof m.roleHint === "boolean" ? { type: "settings", roleHint: m.roleHint, from } : null;
    case "vote":
      return m.target === null || typeof m.target === "string"
        ? { type: "vote", target: m.target, from }
        : null;
    case "kick":
      return typeof m.id === "string" ? { type: "kick", id: m.id, from } : null;
    default:
      return null;
  }
}

// ----------------------------------------------------------------- helpers

const isLive = (s: RoomState, id: string) => s.seats.some((x) => x.id === id && !x.gone);

const midRound = (phase: Phase) => phase === "deal" || phase === "clues" || phase === "vote";

/** Participantes de la ronda que no se fueron. */
function activeParticipants(s: RoomState): string[] {
  return s.participants.filter((id) => isLive(s, id));
}

function connectedSeats(s: RoomState, connected: readonly string[]): Seat[] {
  return s.seats.filter((x) => !x.gone && connected.includes(x.id));
}

/** El asiento conectado y no retirado mas antiguo (los asientos van en orden de llegada). */
function pickHost(s: RoomState, connected: readonly string[], exclude?: string): string | null {
  return connectedSeats(s, connected).find((x) => x.id !== exclude)?.id ?? null;
}

function toPlayers(seats: Seat[]): Player[] {
  return seats.map(({ id, name }) => ({ id, name }));
}

/** "Ana" -> "Ana 2" -> "Ana 3". Sin importar mayusculas.
 *  ponytail: el sufijo puede pasar NAME_MAX por 2-3 caracteres; no rompe nada. */
function uniqueName(seats: Seat[], name: string, selfId?: string): string {
  const taken = new Set(seats.filter((x) => x.id !== selfId).map((x) => x.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let n = 2; ; n++) {
    const candidate = `${name} ${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

// ------------------------------------------------------------------ eventos

function hello(s: RoomState, e: { tokenHash: string; name: string }, ctx: RoomCtx): RoomState | RoomError {
  const name = cleanName(e.name);
  const seat = s.seats.find((x) => !x.gone && x.tokenHash === e.tokenHash);

  if (seat) {
    // Recupera su lugar, su carta y su puntaje. El nombre solo se aplica en lobby.
    if (s.phase !== "lobby" || name === null) return s;
    const unique = uniqueName(s.seats, name, seat.id);
    if (unique === seat.name) return s;
    return { ...s, seats: s.seats.map((x) => (x.id === seat.id ? { ...x, name: unique } : x)) };
  }

  if (s.seats.filter((x) => !x.gone).length >= MAX_PLAYERS) return { error: "room_full" };
  // El cliente valida el nombre antes de mandarlo: esto solo frena basura.
  if (name === null) return s;

  const created: Seat = {
    id: ctx.newId(),
    tokenHash: e.tokenHash,
    name: uniqueName(s.seats, name),
    gone: false,
    joinedAt: ctx.now,
  };
  return { ...s, seats: [...s.seats, created] };
}

function clearRound(s: RoomState): RoomState {
  return { ...s, round: null, participants: [], ready: [], votes: {}, outcome: null, deltas: {}, tally: null };
}

/** Saca los asientos retirados y sus puntajes. */
function dropGone(s: RoomState): RoomState {
  const seats = s.seats.filter((x) => !x.gone);
  const ids = new Set(seats.map((x) => x.id));
  return { ...s, seats, stats: Object.fromEntries(Object.entries(s.stats).filter(([id]) => ids.has(id))) };
}

/** En lobby no hay asientos retirados: un `gone` solo tiene sentido con una ronda en curso. */
function toLobby(s: RoomState): RoomState {
  return { ...clearRound(dropGone(s)), phase: "lobby" };
}

/** Participantes = asientos conectados y no retirados al arrancar. */
function startRound(s: RoomState, connected: readonly string[]): RoomState {
  const players = toPlayers(connectedSeats(s, connected));
  return {
    ...clearRound(s),
    phase: "deal",
    round: createRound(players, s.settings.roleHint),
    participants: players.map((p) => p.id),
  };
}

/** Cierra la votacion: acusa al mas votado y puntua. Siempre pasa a reveal. */
function closeVote(s: RoomState): RoomState {
  const round = s.round;
  if (!round) return s;

  const tally: Record<string, number> = {};
  let nobody = 0;
  for (const target of Object.values(s.votes)) {
    if (target === null) nobody++;
    else tally[target] = (tally[target] ?? 0) + 1;
  }
  const top = Math.max(nobody, ...Object.values(tally));
  const leaders = Object.keys(tally).filter((id) => tally[id] === top);
  // Empate en el primer puesto, o "nadie" arriba (solo o empatado): el impostor zafa.
  const accused = leaders.length === 1 && nobody < top ? leaders[0]! : null;

  const outcome: Outcome =
    accused === round.impostorPlayerId ? { kind: "caught" } : { kind: "escaped", accusedPlayerId: accused };
  const active = activeParticipants(s);
  const deltas = scoreRound(round, toPlayers(s.seats.filter((x) => active.includes(x.id))), outcome);

  return {
    ...s,
    phase: "reveal",
    outcome,
    deltas,
    tally,
    stats: applyDeltas(s.stats, deltas),
    roundsPlayed: s.roundsPlayed + 1,
  };
}

function nextRound(s: RoomState, connected: readonly string[]): RoomState {
  const clean = dropGone(s);
  // `end` conserva la ronda y el resultado: el snapshot de end los sigue mostrando.
  if (Object.values(clean.stats).some((st) => st.points >= TARGET_POINTS)) return { ...clean, phase: "end" };
  if (connectedSeats(clean, connected).length < MIN_PLAYERS) return toLobby(clean);
  return startRound(clean, connected);
}

/** Borra (en lobby) o retira (con ronda) un asiento. */
function removeSeat(s: RoomState, id: string): RoomState {
  if (!isLive(s, id)) return s;
  if (s.phase === "lobby") return dropGone({ ...s, seats: s.seats.map((x) => (x.id === id ? { ...x, gone: true } : x)) });

  const next: RoomState = {
    ...s,
    // hello solo busca asientos no retirados: si vuelve con el mismo token, entra como nuevo.
    seats: s.seats.map((x) => (x.id === id ? { ...x, gone: true } : x)),
    ready: s.ready.filter((r) => r !== id),
    votes: Object.fromEntries(
      Object.entries(s.votes).filter(([voter, target]) => voter !== id && target !== id),
    ),
  };
  if (midRound(s.phase) && (s.round?.impostorPlayerId === id || activeParticipants(next).length < MIN_PLAYERS)) {
    return toLobby(next);
  }
  return next;
}

function apply(s: RoomState, e: RoomEvent, ctx: RoomCtx): RoomState | RoomError {
  if (e.type === "sync") return s;
  if (e.type === "hello") return hello(s, e, ctx);

  const me = s.seats.find((x) => x.id === e.from && !x.gone);
  if (!me) return s;
  const isHost = s.hostId === me.id;
  const active = activeParticipants(s);
  const playing = active.includes(me.id);

  switch (e.type) {
    case "settings":
      return isHost && s.phase === "lobby" ? { ...s, settings: { roleHint: e.roleHint } } : s;
    case "start":
      return isHost && s.phase === "lobby" && connectedSeats(s, ctx.connected).length >= MIN_PLAYERS
        ? startRound(s, ctx.connected)
        : s;
    case "ready":
      return s.phase === "deal" && playing && !s.ready.includes(me.id) ? { ...s, ready: [...s.ready, me.id] } : s;
    case "advance":
      if (!isHost) return s;
      if (s.phase === "deal") return { ...s, phase: "clues" };
      if (s.phase === "clues") return { ...s, phase: "vote" };
      return s;
    case "cancelRound":
      return isHost && midRound(s.phase) ? toLobby(s) : s;
    case "vote": {
      if (s.phase !== "vote" || !playing) return s;
      if (e.target !== null && (e.target === me.id || !active.includes(e.target))) return s;
      const next = { ...s, votes: { ...s.votes, [me.id]: e.target } };
      // Cierra sola cuando votaron todos los participantes no retirados, esten
      // conectados o no. Solo aca: una desconexion nunca cierra la votacion.
      return active.every((id) => id in next.votes) ? closeVote(next) : next;
    }
    case "closeVote": {
      if (!isHost || s.phase !== "vote") return s;
      const voted = active.filter((id) => id in s.votes).length;
      // Mas de la mitad: asi un anfitrion impostor no puede cerrar con 0 votos.
      return voted * 2 > active.length ? closeVote(s) : s;
    }
    case "nextRound":
      return isHost && s.phase === "reveal" ? nextRound(s, ctx.connected) : s;
    case "newGame":
      return isHost && s.phase === "end" ? { ...toLobby(s), stats: {}, roundsPlayed: 0 } : s;
    case "kick":
      return isHost && e.id !== me.id ? removeSeat(s, e.id) : s;
    case "leave":
      // Si el que se va es el anfitrion, normalizeHost traspasa el rol sin gracia.
      return removeSeat(s, me.id);
    default:
      return s;
  }
}

/** Despues de cada evento: el rol de anfitrion siempre queda en un lugar valido. */
function normalizeHost(s: RoomState, now: number, connected: readonly string[]): RoomState {
  // Sin anfitrion, o se fue (leave): toma el rol el conectado mas antiguo, sin gracia.
  if (s.hostId === null || !isLive(s, s.hostId)) {
    const hostId = pickHost(s, connected);
    return hostId === s.hostId && s.hostGraceUntil === null ? s : { ...s, hostId, hostGraceUntil: null };
  }
  if (connected.includes(s.hostId)) return s.hostGraceUntil === null ? s : { ...s, hostGraceUntil: null };
  if (s.hostGraceUntil === null) return { ...s, hostGraceUntil: now + HOST_GRACE_MS };
  if (now < s.hostGraceUntil) return s;
  // Vencio la gracia. Si el original vuelve despues, no lo recupera.
  return { ...s, hostId: pickHost(s, connected, s.hostId), hostGraceUntil: null };
}

export function reduce(state: RoomState, event: RoomEvent, ctx: RoomCtx): RoomState | RoomError {
  const result = apply(state, event, ctx);
  if (isRoomError(result)) return result;

  // El socket que manda el hello todavia no figura como conectado: lo sumamos.
  let connected = ctx.connected;
  if (event.type === "hello") {
    const seat = result.seats.find((x) => !x.gone && x.tokenHash === event.tokenHash);
    if (seat && !connected.includes(seat.id)) connected = [...connected, seat.id];
  }

  const next = normalizeHost(result, ctx.now, connected);
  // ponytail: comparar por JSON es mas robusto que cuidar referencias en cada
  // rama; el estado pesa menos de 10 KB.
  if (JSON.stringify(next) === JSON.stringify(state)) return state;
  return { ...next, lastActivity: ctx.now };
}

// ------------------------------------------------------------------- alarm

/** Una sola alarm por objeto: lo que venza primero entre la gracia y la expiracion. */
export function nextAlarmAt(s: RoomState): number {
  return Math.min(s.hostGraceUntil ?? Infinity, s.lastActivity + ROOM_TTL_MS);
}

export function isExpired(s: RoomState, now: number): boolean {
  return now >= s.lastActivity + ROOM_TTL_MS;
}

// ---------------------------------------------------------------- snapshot

/**
 * Estado filtrado para un jugador. Se arma por LISTA BLANCA, campo por campo:
 * nunca se clona RoomState para borrarle cosas, porque un campo nuevo en el
 * estado se filtraria solo. `round` no sale nunca; el impostor no sale hasta
 * el reveal; tokenHash no sale jamas.
 */
export function snapshotFor(s: RoomState, seatId: string, connected: readonly string[]): Snapshot | null {
  const me = s.seats.find((x) => x.id === seatId);
  if (!me || me.gone) return null;

  const r = s.round;
  let role: YourRole | null = null;
  if (r && (midRound(s.phase) || s.phase === "reveal")) {
    if (!s.participants.includes(me.id)) role = { kind: "waiting" };
    else if (r.impostorPlayerId === me.id) role = { kind: "impostor", roleHint: r.roleHint ? r.role : null };
    else role = { kind: "crew", championId: r.secret.id };
  }

  const revealed = r !== null && s.outcome !== null && (s.phase === "reveal" || s.phase === "end");

  return {
    type: "snapshot",
    code: s.code,
    phase: s.phase,
    hostId: s.hostId,
    seats: s.seats.map((x) => ({ id: x.id, name: x.name, connected: connected.includes(x.id), gone: x.gone })),
    settings: { roleHint: s.settings.roleHint },
    stats: Object.fromEntries(
      Object.entries(s.stats).map(([id, st]) => [
        id,
        { points: st.points, roundsAsImpostor: st.roundsAsImpostor, impostorWins: st.impostorWins },
      ]),
    ),
    roundsPlayed: s.roundsPlayed,
    // En reveal y end la ronda ya se puntuo; en el resto todavia esta en curso.
    roundNumber: s.phase === "reveal" || s.phase === "end" ? s.roundsPlayed : s.roundsPlayed + 1,
    clueOrder: r && s.phase !== "lobby" ? [...r.clueOrder] : [],
    ready: [...s.ready],
    voted: Object.keys(s.votes),
    you: { id: me.id, isHost: s.hostId === me.id, role },
    reveal:
      revealed && r && s.outcome
        ? {
            championId: r.secret.id,
            impostorId: r.impostorPlayerId,
            outcome: s.outcome,
            deltas: s.deltas,
            tally: s.tally ?? {},
          }
        : null,
  };
}
