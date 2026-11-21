/**
 * Protocolo de las salas online. Lo comparten el Worker y el frontend, asi que
 * aca no entra nada de DOM, de React ni de Workers: solo tipos y constantes.
 *
 * Imports relativos con extension `.ts` a proposito: Node corre los tests sin
 * bundler y wrangler no depende del alias `@/`.
 */
import type { Role } from "../../data/champions.ts";
import type { Outcome, PlayerStats } from "../game.ts";

/** Subirlo cuando cambie la forma de RoomState o de los mensajes. Un estado
 *  guardado con otra version se trata como sala inexistente, y un socket que
 *  sobrevivio a un deploy con otra version recibe `bad_version`. */
export const PROTOCOL_VERSION = 1;

/** 31 simbolos sin ambiguos (sin 0 O 1 I L): 31^4 = 923.521 codigos. */
export const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const ROOM_CODE_LENGTH = 4;

export function isRoomCode(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === ROOM_CODE_LENGTH &&
    [...value].every((ch) => ROOM_CODE_ALPHABET.includes(ch))
  );
}

export const NAME_MAX = 20;
export const MAX_MESSAGE_BYTES = 1024;
/** Por socket. Protege el tope de 100.000 filas escritas por dia del plan Free. */
export const RATE_LIMIT = { messages: 20, windowMs: 10_000 } as const;

export type ErrorCode =
  | "replaced"
  | "kicked"
  | "room_not_found"
  | "room_full"
  | "bad_version"
  | "too_big"
  | "rate_limited";

/**
 * El navegador no puede leer el status HTTP de un upgrade fallido, asi que los
 * errores fatales viajan como mensaje `error` seguido de un cierre 4000-4999.
 * El cliente NO reconecta ante un cierre 4xxx.
 */
export const CLOSE_CODES: Record<ErrorCode, number> = {
  replaced: 4002,
  kicked: 4003,
  room_not_found: 4004,
  room_full: 4009,
  bad_version: 4010,
  too_big: 4013,
  rate_limited: 4029,
};

export type Phase = "lobby" | "deal" | "clues" | "vote" | "reveal" | "end";

/** Cliente -> servidor. Lo que llega fuera de fase o sin permiso se descarta en silencio. */
export type ClientMessage =
  | { type: "hello"; v: number; token: string; name: string }
  | { type: "settings"; roleHint: boolean }
  | { type: "start" }
  | { type: "ready" }
  | { type: "advance" }
  | { type: "vote"; target: string | null }
  | { type: "closeVote" }
  | { type: "nextRound" }
  | { type: "cancelRound" }
  | { type: "newGame" }
  | { type: "kick"; id: string }
  | { type: "leave" };

export type SeatView = { id: string; name: string; connected: boolean; gone: boolean };

/** La clase solo le llega al impostor, y solo si la pista estaba prendida. */
export type YourRole =
  | { kind: "crew"; championId: string }
  | { kind: "impostor"; roleHint: Role | null }
  | { kind: "waiting" };

export type RevealView = {
  championId: string;
  impostorId: string;
  outcome: Outcome;
  deltas: Record<string, Partial<PlayerStats>>;
  tally: Record<string, number>;
};

/** Estado filtrado para UN jugador. Se arma por lista blanca en logic.ts. */
export type Snapshot = {
  type: "snapshot";
  code: string;
  phase: Phase;
  hostId: string | null;
  seats: SeatView[];
  settings: { roleHint: boolean };
  stats: Record<string, PlayerStats>;
  roundsPlayed: number;
  roundNumber: number;
  /** Ids de los participantes de la ronda, en orden de pista. Vacio en lobby. */
  clueOrder: string[];
  ready: string[];
  /** Quien voto, nunca a quien. */
  voted: string[];
  you: { id: string; isHost: boolean; role: YourRole | null };
  /** Solo en `reveal` y `end`. */
  reveal: RevealView | null;
};

export type ServerMessage = Snapshot | { type: "error"; code: ErrorCode };
