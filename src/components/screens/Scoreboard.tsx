"use client";

import { useEffect, useRef, useState } from "react";
import { TARGET_POINTS, rankPlayers, type Player, type PlayerStats } from "@/lib/game";
import type { Dict } from "@/lib/i18n";
import styles from "../game.module.css";

type Props = {
  t: Dict;
  players: Player[];
  stats: Record<string, PlayerStats>;
  roundsPlayed: number;
  onBack: () => void;
  onSetup: () => void;
  onReset: () => void;
};

/** El boton de reiniciar se convierte en "¿Seguro?" y vuelve solo. Sin modal:
 *  un dialogo a pantalla completa para borrar puntos es desproporcionado. */
const CONFIRM_MS = 4000;

export function Scoreboard({ t, players, stats, roundsPlayed, onBack, onSetup, onReset }: Props) {
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!confirming) return;
    timer.current = setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [confirming]);

  const rows = rankPlayers(players, stats);
  const played = roundsPlayed > 0;

  // El dato que importa: quien engaña mejor, no quien suma mas puntos.
  const bestImpostor = [...rows]
    .filter((r) => r.impostorWins > 0)
    .sort((a, b) => b.impostorWins - a.impostorWins)[0];

  if (!played) {
    return (
      <>
        <div className={`${styles.body} ${styles.bodyCenter}`}>
          {/* La misma carta rayada de la carta del impostor, en chico: es la
              marca grafica del juego cuando no hay imagen. */}
          <div className={styles.emptyCard} aria-hidden="true" />
          <h2 className={styles.headline} style={{ textAlign: "center" }}>
            {t.scores.emptyTitle}
          </h2>
          <p className={styles.lede} style={{ maxWidth: "28ch" }}>
            {t.scores.empty}
          </p>
        </div>

        <div className={styles.dock}>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onSetup}>
            {t.scores.emptyCta}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.body}>
        <div className={styles.stack}>
          <h2 className={styles.headline}>{t.scores.title}</h2>
          <span className={styles.note}>{t.scores.subtitle(roundsPlayed, TARGET_POINTS)}</span>
        </div>

        {bestImpostor && (
          <div className={styles.bestBox}>
            <span className={styles.bestLabel}>{t.scores.bestImpostor}</span>
            <span className={styles.bestText}>
              <strong>{bestImpostor.name}</strong> —{" "}
              {t.scores.bestImpostorDetail(
                bestImpostor.impostorWins,
                bestImpostor.roundsAsImpostor,
              )}
            </span>
          </div>
        )}

        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{t.scores.colRank}</th>
              <th scope="col">{t.scores.colPlayer}</th>
              <th scope="col">{t.scores.colImpostor}</th>
              <th scope="col">{t.scores.colPoints}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const won = r.points >= TARGET_POINTS;
              return (
                <tr key={r.id} className={won ? styles.rowLead : ""}>
                  <td className={styles.rank}>{i + 1}</td>
                  <td>
                    <span className={styles.playerCell}>
                      {r.name}
                      {won && (
                        <span className={styles.winTag} title={t.scores.won}>
                          {t.scores.wonTag}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className={styles.cellRatio}>
                    {r.impostorWins}/{r.roundsAsImpostor}
                  </td>
                  <td className={styles.cellPoints}>{r.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.dock}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onBack}>
          {t.scores.back}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnGhost} ${confirming ? styles.btnDanger : ""}`}
          onClick={() => {
            if (!confirming) {
              setConfirming(true);
              return;
            }
            onReset();
            setConfirming(false);
          }}
        >
          {confirming ? t.scores.resetConfirm : t.scores.reset}
        </button>
        <span className={styles.dockNote}>{t.scores.resetNote}</span>
      </div>
    </>
  );
}
