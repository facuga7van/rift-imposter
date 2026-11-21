/**
 * Durable Object de una sala. Capa delgada: sockets, storage, alarm y
 * difusion. Toda regla de juego vive en src/lib/room/logic.ts.
 *
 * - Un objeto por codigo (idFromName(code)), storage SQLite.
 * - WebSockets con la API de hibernacion: el objeto duerme entre mensajes. El
 *   attachment de cada socket ({ seatId, v }) es lo que lo reconoce al despertar.
 * - `connected` no se guarda: se deriva de los sockets abiertos en cada evento,
 *   asi un reinicio no deja asientos fantasma.
 * - Prohibido setTimeout/setInterval: una sola alarm, min(gracia, expiracion).
 */
import { DurableObject } from "cloudflare:workers";
import {
  CLOSE_CODES,
  MAX_MESSAGE_BYTES,
  PROTOCOL_VERSION,
  RATE_LIMIT,
  type ErrorCode,
  type ServerMessage,
} from "../src/lib/room/protocol.ts";
import {
  createRoom,
  isExpired,
  isRoomError,
  nextAlarmAt,
  parseHello,
  reduce,
  snapshotFor,
  toEvent,
  type RoomCtx,
  type RoomEvent,
  type RoomState,
} from "../src/lib/room/logic.ts";

type Attachment = { seatId: string; v: number };

const STATE_KEY = "state";
const OPEN = 1; // WebSocket.READY_STATE_OPEN
const HOUR = 60 * 60 * 1000;

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class Room extends DurableObject<Env> {
  /** ponytail: contador en memoria. Si el objeto hiberna se reinicia, y eso solo
   *  lo vuelve mas permisivo; persistirlo costaria una escritura por mensaje. */
  private rate = new WeakMap<WebSocket, { start: number; count: number }>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Responde el ping del cliente sin despertar al objeto ni cobrarse.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  /** RPC desde POST /api/sala. "taken" si este codigo ya tiene una sala viva. */
  async init(code: string): Promise<"ok" | "taken"> {
    if (await this.load()) return "taken";
    const state = createRoom(code, Date.now());
    await this.ctx.storage.put(STATE_KEY, state);
    await this.ctx.storage.setAlarm(nextAlarmAt(state));
    return "ok";
  }

  /** Siempre acepta el upgrade: el navegador no puede leer el status de un
   *  upgrade fallido, asi que los errores viajan como mensaje + cierre 4xxx. */
  async fetch(): Promise<Response> {
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
    if (new TextEncoder().encode(text).length > MAX_MESSAGE_BYTES) return this.fail(ws, "too_big");
    if (!this.allow(ws)) return this.fail(ws, "rate_limited");

    let msg: unknown;
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }

    // Una pestana vieja que sobrevivio a un deploy sigue conectada sin pasar por hello.
    const att = this.attachment(ws);
    if (att && att.v !== PROTOCOL_VERSION) return this.fail(ws, "bad_version");

    const hello = parseHello(msg);
    if (hello === "bad_version") return this.fail(ws, "bad_version");
    // El hash ANTES de leer el estado: entre load() y reduce() no puede haber
    // otro await, o un evento concurrente trabajaria sobre un estado viejo.
    const tokenHash = hello ? await sha256(hello.token) : null;

    const state = await this.load();
    if (!state) return this.fail(ws, "room_not_found");

    if (hello && tokenHash) return this.hello(ws, state, tokenHash, hello.name);

    if (!att) return; // todavia no mando hello
    const event = toEvent(msg, att.seatId);
    if (event) await this.commit(state, event);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    try {
      ws.close(1000, "bye");
    } catch {
      // Ya estaba cerrado (auto-reply del runtime).
    }
    const state = await this.load();
    if (state) await this.commit(state, { type: "sync" }, ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  /** Idempotente: re-lee el estado y decide. */
  async alarm(): Promise<void> {
    const state = await this.load();
    if (!state) {
      await this.ctx.storage.deleteAll();
      return;
    }
    const now = Date.now();
    const next = reduce(state, { type: "sync" }, this.ctxFor());
    if (isRoomError(next)) return;

    if (isExpired(next, now) && this.open().length === 0) {
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
      return;
    }
    if (next !== state) await this.ctx.storage.put(STATE_KEY, next);
    const at = nextAlarmAt(next);
    // Vencida pero con sockets abiertos (gente quieta 6 h con la pestana abierta):
    // se vuelve a mirar en una hora en vez de sonar en loop.
    await this.ctx.storage.setAlarm(at > now ? at : now + HOUR);
    this.broadcast(next);
  }

  // ------------------------------------------------------------------ privado

  private async hello(ws: WebSocket, state: RoomState, tokenHash: string, name: string): Promise<void> {
    const next = reduce(state, { type: "hello", tokenHash, name }, this.ctxFor());
    if (isRoomError(next)) return this.fail(ws, next.error);

    const seat = next.seats.find((s) => !s.gone && s.tokenHash === tokenHash);
    if (!seat) return; // nombre invalido: el cliente valida antes, asi que no pasa

    // Mismo token en otra pestana: gana la nueva, la vieja se cierra con 4002.
    for (const other of this.ctx.getWebSockets()) {
      if (other !== ws && this.attachment(other)?.seatId === seat.id) this.fail(other, "replaced");
    }
    ws.serializeAttachment({ seatId: seat.id, v: PROTOCOL_VERSION } satisfies Attachment);
    await this.save(state, next, true);
  }

  private async commit(state: RoomState, event: RoomEvent, except?: WebSocket): Promise<void> {
    const next = reduce(state, event, this.ctxFor(except));
    if (isRoomError(next)) return; // solo hello devuelve errores

    // Sockets cuyo asiento dejo de estar activo: se fue o lo expulsaron.
    for (const ws of this.ctx.getWebSockets()) {
      const att = this.attachment(ws);
      if (!att || ws === except || next.seats.some((s) => s.id === att.seatId && !s.gone)) continue;
      if (event.type === "leave" && event.from === att.seatId) {
        try {
          ws.close(1000, "left");
        } catch {
          // ya cerrado
        }
      } else {
        this.fail(ws, "kicked");
      }
    }
    await this.save(state, next, event.type === "sync", except);
  }

  /** Escribe solo si cambio el estado. Difunde si cambio el estado o una conexion. */
  private async save(prev: RoomState, next: RoomState, connChanged: boolean, except?: WebSocket): Promise<void> {
    if (next !== prev) {
      await this.ctx.storage.put(STATE_KEY, next);
      const at = nextAlarmAt(next);
      const armed = await this.ctx.storage.getAlarm();
      if (armed === null || at < armed) await this.ctx.storage.setAlarm(at);
    }
    if (next !== prev || connChanged) this.broadcast(next, except);
  }

  private broadcast(state: RoomState, except?: WebSocket): void {
    const connected = this.connected(except);
    for (const ws of this.open(except)) {
      const att = this.attachment(ws);
      const snap = att && snapshotFor(state, att.seatId, connected);
      if (snap) this.send(ws, snap);
    }
  }

  private async load(): Promise<RoomState | null> {
    const state = await this.ctx.storage.get<RoomState>(STATE_KEY);
    // Un estado guardado con otra version se trata como sala inexistente.
    return state && state.v === PROTOCOL_VERSION ? state : null;
  }

  private ctxFor(except?: WebSocket): RoomCtx {
    return { now: Date.now(), connected: this.connected(except), newId: () => crypto.randomUUID() };
  }

  private open(except?: WebSocket): WebSocket[] {
    return this.ctx.getWebSockets().filter((ws) => ws !== except && ws.readyState === OPEN);
  }

  /** Ids de asiento con al menos un socket abierto. */
  private connected(except?: WebSocket): string[] {
    const ids = new Set<string>();
    for (const ws of this.open(except)) {
      const att = this.attachment(ws);
      if (att) ids.add(att.seatId);
    }
    return [...ids];
  }

  private attachment(ws: WebSocket): Attachment | null {
    return (ws.deserializeAttachment() as Attachment | null) ?? null;
  }

  private allow(ws: WebSocket): boolean {
    const now = Date.now();
    const r = this.rate.get(ws);
    if (!r || now - r.start >= RATE_LIMIT.windowMs) {
      this.rate.set(ws, { start: now, count: 1 });
      return true;
    }
    r.count++;
    return r.count <= RATE_LIMIT.messages;
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // socket cerrandose: el proximo evento lo saca de la lista
    }
  }

  private fail(ws: WebSocket, code: ErrorCode): void {
    this.send(ws, { type: "error", code });
    try {
      ws.close(CLOSE_CODES[code], code);
    } catch {
      // ya cerrado
    }
  }
}
