import { CHAMPIONS, type Champion, type Role } from "@/data/champions";

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;
export const TARGET_POINTS = 10;

const ALL_ROLES: Role[] = ["Assassin", "Fighter", "Mage", "Marksman", "Support", "Tank"];

/**
 * Rol principal del campeon. Riot pone la clase primaria primera en `tags`.
 *
 * Filtrar con `tags.includes(role)` era un bug: los tags secundarios de Riot
 * son laxisimos y metian a Taliyah, Ashe, Xerath, Orianna y Heimerdinger en
 * "Soportes". Si la categoria no es la que el jugador tiene en la cabeza, la
 * pista del impostor no vale nada. Lo reporto el usuario jugando.
 */
export function primaryRole(champion: Champion): Role {
  return champion.tags[0]!;
}

const POOL: Record<Role, Champion[]> = Object.fromEntries(
  ALL_ROLES.map((r) => [r, CHAMPIONS.filter((c) => primaryRole(c) === r)]),
) as Record<Role, Champion[]>;

/**
 * Roles con suficientes campeones para sortear sin que el pozo quede ridiculo.
 * Se calcula del dato en vez de hardcodearse: si Riot reclasifica campeones y
 * un rol queda flaco, deja de salir sorteado solo, sin romper nada.
 */
export const ROLES: Role[] = ALL_ROLES.filter((r) => POOL[r].length >= 12);

/** Los rotulos traducidos de cada rol viven en el diccionario (lib/i18n). */

export type Player = { id: string; name: string };

export type PlayerStats = {
  points: number;
  /** Cuantas veces le toco ser impostor. Contexto para leer impostorWins. */
  roundsAsImpostor: number;
  /** Rondas en las que, siendo impostor, no lo agarraron. */
  impostorWins: number;
};

export const EMPTY_STATS: PlayerStats = { points: 0, roundsAsImpostor: 0, impostorWins: 0 };

export type Round = {
  /** Clase del campeon. Solo se muestra si `roleHint` esta prendido. */
  role: Role;
  /** Se guarda en la ronda, no solo en los ajustes: si alguien toca el switch
   *  a mitad de partida, la ronda en curso sigue con la regla con la que
   *  empezo. */
  roleHint: boolean;
  secret: Champion;
  impostorPlayerId: string;
  /** Ids de jugador en orden de pista. El primero es aleatorio a proposito. */
  clueOrder: string[];
};

export type Outcome =
  /** Zafo: votaron a un inocente, o hubo empate y nadie salio. */
  | { kind: "escaped"; accusedPlayerId: string | null }
  /** Lo agarraron. Gana el resto. */
  | { kind: "caught" };

/**
 * Id unico para un jugador nuevo.
 *
 * OJO con `crypto.randomUUID()`: solo existe en contextos seguros (HTTPS o
 * localhost). Servido por HTTP plano en una IP de LAN o de Tailscale —que es
 * justo como corre en moraserver— es `undefined` y agregar un jugador
 * explotaba. Lo encontro el E2E corriendo contra el deploy real, no contra
 * localhost, donde el bug es invisible.
 */
function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createPlayer(name: string): Player {
  return { id: newId(), name };
}

function shuffle<T>(items: readonly T[]): T[] {
  // Fisher-Yates. Cada permutacion con la misma probabilidad; barajar con
  // sort(() => Math.random() - 0.5) NO es uniforme, es un bug clasico.
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

/**
 * Arma una ronda: sortea un campeon y reparte el papel de impostor.
 *
 * No hay tablero de candidatos a la vista. En LoL el "tablero" ya lo comparten
 * todos de memoria; mostrarlo solo regalaba informacion y afeaba la pantalla.
 *
 * Como se sortea el campeon depende de si la pista de clase esta prendida:
 *  - CON pista, se elige primero la clase y despues el campeon, para que las
 *    seis clases salgan parejo y la pista valga lo mismo siempre.
 *  - SIN pista la clase no se usa para nada, asi que se sortea plano entre los
 *    173. Hacerlo por clase sesgaria el sorteo sin motivo: hay 17 asesinos y 50
 *    luchadores, asi que cada asesino saldria casi el triple que cada luchador.
 */
export function createRound(players: Player[], roleHint: boolean): Round {
  const secret = roleHint ? pick(POOL[pick(ROLES)]) : pick(CHAMPIONS);

  return {
    role: primaryRole(secret),
    roleHint,
    secret,
    impostorPlayerId: pick(players).id,
    // El primero en dar pista arranca a ciegas, sin nada de donde colgarse.
    // Si arrancara siempre el jugador 1, cargaria siempre con esa desventaja.
    clueOrder: shuffle(players).map((p) => p.id),
  };
}

export const POINTS_IMPOSTOR_ESCAPES = 3;
export const POINTS_CREW_CATCHES = 1;

/**
 * Puntos por ronda. Dos desenlaces nada mas: zafa o lo agarran.
 *
 * Zafar paga 3 y atraparlo paga 1 a cada inocente, y no es capricho: sin
 * tablero, el impostor tiene que tirar una pista de un campeon que no conoce
 * sabiendo solo la clase. Es la posicion mas dificil de la mesa y le toca a uno
 * cada N rondas, asi que la ronda de impostor tiene que valer la pena.
 */
export function scoreRound(
  round: Round,
  players: Player[],
  outcome: Outcome,
): Record<string, Partial<PlayerStats>> {
  const deltas: Record<string, Partial<PlayerStats>> = {};
  const escaped = outcome.kind === "escaped";

  deltas[round.impostorPlayerId] = {
    points: escaped ? POINTS_IMPOSTOR_ESCAPES : 0,
    roundsAsImpostor: 1,
    impostorWins: escaped ? 1 : 0,
  };

  if (!escaped) {
    for (const p of players) {
      if (p.id !== round.impostorPlayerId) deltas[p.id] = { points: POINTS_CREW_CATCHES };
    }
  }

  return deltas;
}

export function applyDeltas(
  stats: Record<string, PlayerStats>,
  deltas: Record<string, Partial<PlayerStats>>,
): Record<string, PlayerStats> {
  const next = { ...stats };
  for (const [id, d] of Object.entries(deltas)) {
    const base = next[id] ?? EMPTY_STATS;
    next[id] = {
      points: base.points + (d.points ?? 0),
      roundsAsImpostor: base.roundsAsImpostor + (d.roundsAsImpostor ?? 0),
      impostorWins: base.impostorWins + (d.impostorWins ?? 0),
    };
  }
  return next;
}

/** Ordena para la tabla: puntos, y a igualdad gana quien mas engaño de impostor. */
export function rankPlayers(
  players: Player[],
  stats: Record<string, PlayerStats>,
): Array<Player & PlayerStats> {
  return players
    .map((p) => ({ ...p, ...(stats[p.id] ?? EMPTY_STATS) }))
    .sort((a, b) => b.points - a.points || b.impostorWins - a.impostorWins);
}
