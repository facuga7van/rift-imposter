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
    // [T8] votacion
    // [T9] despues del reveal
    // [T10] salidas y expulsiones
    default:
      return s;
  }
}

/** Despues de cada evento: el rol de anfitrion siempre queda en un lugar valido. */
function normalizeHost(s: RoomState, now: number, connected: readonly string[]): RoomState {
  // [T11] gracia del anfitrion
  if (s.hostId !== null && isLive(s, s.hostId)) return s;
  const hostId = pickHost(s, connected);
  return hostId === s.hostId && s.hostGraceUntil === null ? s : { ...s, hostId, hostGraceUntil: null };
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
