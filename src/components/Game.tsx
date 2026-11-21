"use client";

import { useState } from "react";
import {
  applyDeltas,
  createRound,
  scoreRound,
  TARGET_POINTS,
  type Outcome,
  type Player,
  type PlayerStats,
  type Round,
} from "@/lib/game";
import { ONLINE_PATH, dict, type Lang } from "@/lib/i18n";
import { usePersistentState } from "@/lib/storage";
import { Clues } from "./screens/Clues";
import { Deal } from "./screens/Deal";
import { Winner } from "./screens/Winner";
import { Reveal } from "./screens/Reveal";
import { Scoreboard } from "./screens/Scoreboard";
import { Shell } from "./Shell";
import { Setup } from "./screens/Setup";
import { Vote } from "./screens/Vote";
import styles from "./game.module.css";

type Phase = "setup" | "deal" | "clues" | "vote" | "reveal" | "scores" | "winner";

/** Ids fijos, no aleatorios: si fueran UUID el server y el cliente generarian
 *  distintos y React se quejaria al hidratar. */
const DEFAULT_PLAYERS: Player[] = [
  { id: "p1", name: "" },
  { id: "p2", name: "" },
  { id: "p3", name: "" },
  { id: "p4", name: "" },
];

const NO_STATS: Record<string, PlayerStats> = {};

/** Ajustes de la mesa. Se persisten aparte de la partida: sobreviven a un
 *  reset de puntajes y a terminar una partida. */
type Settings = { roleHint: boolean };
const DEFAULT_SETTINGS: Settings = { roleHint: true };

/**
 * La partida en curso tambien se persiste, no solo los nombres y los puntos.
 * Dos razones: cambiar de idioma navega a otra URL, y un celular que se pasa
 * de mano en mano se refresca sin querer. En los dos casos la ronda sobrevive.
 */
type Session = {
  phase: Phase;
  beforeScores: Phase;
  round: Round | null;
  outcome: Outcome | null;
  deltas: Record<string, Partial<PlayerStats>>;
};

const NEW_SESSION: Session = {
  phase: "setup",
  beforeScores: "setup",
  round: null,
  outcome: null,
  deltas: {},
};

// v2: la Round cambio de forma al sacar el tablero (`board` + `secretId` pasaron
// a ser `secret`). Una sesion vieja guardada reventaria al leerse, asi que
// estrenamos clave en vez de intentar migrarla.
const SESSION_KEY = "rift.session.v2";

/** Paso del reparto. Vive en memoria y no en la sesion a proposito: si el
 *  telefono se refresca en la mitad del reparto, volver a empezar la vuelta es
 *  mas seguro que adivinar quien ya vio su carta. */
type DealStep = { index: number; revealed: boolean };
const DEAL_START: DealStep = { index: 0, revealed: false };

export function Game({ lang }: { lang: Lang }) {
  const t = dict(lang);
  const players = usePersistentState<Player[]>("rift.players", DEFAULT_PLAYERS);
  const stats = usePersistentState<Record<string, PlayerStats>>(
    "rift.stats",
    NO_STATS,
  );
  const session = usePersistentState<Session>(SESSION_KEY, NEW_SESSION);
  const settings = usePersistentState<Settings>(
    "rift.settings",
    DEFAULT_SETTINGS,
  );
  const [deal, setDeal] = useState<DealStep>(DEAL_START);

  const { phase, round, outcome, deltas } = session.value;
  const patch = (p: Partial<Session>) =>
    session.setValue((s) => ({ ...s, ...p }));

  /** Rondas terminadas. Sale de los puntajes en vez de un contador aparte:
   *  toda ronda puntuada le suma 1 a `roundsAsImpostor` de exactamente un
   *  jugador, asi que la suma ES la cantidad de rondas jugadas. */
  const roundsPlayed = Object.values(stats.value).reduce(
    (n, s) => n + s.roundsAsImpostor,
    0,
  );
  // En `reveal` la ronda ya se puntuo; en el resto todavia esta en curso.
  const roundNumber = phase === "reveal" ? roundsPlayed : roundsPlayed + 1;

  const startRound = (roster: Player[]) => {
    setDeal(DEAL_START);
    patch({
      phase: "deal",
      round: createRound(roster, settings.value.roleHint),
      outcome: null,
      deltas: {},
    });
  };

  const start = () => {
    // Un nombre vacio rompe la votacion y el reparto: no sabes a quien pasarle
    // el telefono. Lo rellenamos aca, una sola vez, y lo persistimos.
    const named = players.value.map((p, i) => ({
      ...p,
      name: p.name.trim() || t.setup.playerPlaceholder(i + 1),
    }));
    players.setValue(named);
    startRound(named);
  };

  const vote = (accusedPlayerId: string | null) => {
    if (!round) return;
    const result: Outcome =
      accusedPlayerId === round.impostorPlayerId
        ? { kind: "caught" }
        : { kind: "escaped", accusedPlayerId };

    const d = scoreRound(round, players.value, result);
    stats.setValue((prev) => applyDeltas(prev, d));
    patch({ phase: "reveal", outcome: result, deltas: d });
  };

  const openScores = () => patch({ phase: "scores", beforeScores: phase });
  const openSetup = () => patch({ phase: "setup" });
  const hasWinner = Object.values(stats.value).some((s) => s.points >= TARGET_POINTS);
  /** Partida nueva con los mismos jugadores: lo mismo que el reset de la tabla, y a armar. */
  const newGame = () => {
    stats.reset();
    patch({ phase: "setup", beforeScores: "setup", round: null, outcome: null, deltas: {} });
  };

  const ready = players.hydrated && session.hydrated && settings.hydrated;

  // Durante el reparto la barra pierde la navegacion y queda solo el contador:
  // es el momento en que la pantalla no tiene que invitar a tocar nada mas.
  const dealing = ready && phase === "deal" && round !== null;
  const dealPlayer = players.value[deal.index];

  const context = !ready
    ? null
    : dealing && dealPlayer
      ? deal.revealed
        ? t.deal.cardOf(dealPlayer.name, deal.index + 1, players.value.length)
        : t.deal.counter(deal.index + 1, players.value.length)
      : phase === "clues"
        ? t.clues.context(roundNumber)
        : phase === "vote"
          ? t.vote.context(roundNumber)
          : // En `reveal` no va: la banda de resultado ya trae la ronda y
            // repetirla arriba era la misma linea dos veces en pantalla.
            null;

  const progress = dealing
    ? ((deal.index + (deal.revealed ? 1 : 0)) / players.value.length) * 100
    : null;

  return (
    <Shell
      t={t}
      lang={lang}
      hideTopbar={dealing}
      context={context}
      progress={progress}
      nav={
        <>
          {(phase === "reveal" || phase === "scores" || phase === "winner") && (
            <button
              type="button"
              className={styles.navLink}
              onClick={openSetup}
            >
              {t.nav.play}
            </button>
          )}
          {phase !== "scores" && phase !== "reveal" && phase !== "winner" && (
            <button
              type="button"
              className={styles.navLink}
              onClick={openScores}
            >
              {t.nav.table}
            </button>
          )}
          <a className={styles.navLink} href="#rules">
            {t.nav.rules}
          </a>
        </>
      }
    >
      {/* Hasta que localStorage no respondio no sabemos ni los nombres ni en
          que fase quedo la partida. Pintar lo de fabrica y corregir es un
          parpadeo, y en este juego un parpadeo puede mostrar una carta. */}
      {!ready ? (
        <div className={`${styles.body} ${styles.bodyCenter}`} aria-busy="true">
          <p className={styles.note}>{t.loading}</p>
        </div>
      ) : (
        <>
          {phase === "setup" && (
            <Setup
              t={t}
              players={players.value}
              roleHint={settings.value.roleHint}
              onChange={players.setValue}
              onRoleHintChange={(roleHint) => settings.setValue({ roleHint })}
              onStart={start}
              onlineHref={ONLINE_PATH[lang]}
            />
          )}

          {phase === "deal" && round && dealPlayer && (
            <Deal
              t={t}
              lang={lang}
              round={round}
              players={players.value}
              index={deal.index}
              revealed={deal.revealed}
              onView={() => setDeal((d) => ({ ...d, revealed: true }))}
              onNext={() => {
                if (deal.index === players.value.length - 1)
                  patch({ phase: "clues" });
                else setDeal({ index: deal.index + 1, revealed: false });
              }}
            />
          )}

          {phase === "clues" && round && (
            <Clues
              t={t}
              clueOrder={round.clueOrder}
              players={players.value}
              onDone={() => patch({ phase: "vote" })}
            />
          )}

          {phase === "vote" && (
            <Vote t={t} players={players.value} onVote={vote} />
          )}

          {phase === "reveal" && round && outcome && (
            <Reveal
              t={t}
              lang={lang}
              round={round}
              roundNumber={roundNumber}
              players={players.value}
              outcome={outcome}
              deltas={deltas}
              onNextRound={hasWinner ? undefined : () => startRound(players.value)}
              onWinner={hasWinner ? () => patch({ phase: "winner" }) : undefined}
              onScores={openScores}
            />
          )}

          {phase === "winner" && (
            <Winner
              t={t}
              lang={lang}
              players={players.value}
              stats={stats.value}
              onNewGame={newGame}
              onTable={openScores}
            />
          )}

          {phase === "scores" && (
            <Scoreboard
              t={t}
              players={players.value}
              stats={stats.value}
              roundsPlayed={roundsPlayed}
              onBack={() =>
                patch({
                  phase:
                    session.value.beforeScores === "scores" ||
                    (session.value.beforeScores === "winner" && !hasWinner)
                      ? "setup"
                      : session.value.beforeScores,
                })
              }
              onSetup={openSetup}
              onReset={stats.reset}
            />
          )}
        </>
      )}
    </Shell>
  );
}
