"use client";

import { rankPlayers, type Player, type PlayerStats } from "@/lib/game";
import type { Dict, Lang } from "@/lib/i18n";
import { ResultShare } from "../ResultShare";
import styles from "../game.module.css";

type Props = {
  t: Dict;
  lang: Lang;
  players: Player[];
  stats: Record<string, PlayerStats>;
  onNewGame: () => void;
  onTable: () => void;
};

/** Pantalla final del modo local: ganador, podio y a compartir. */
export function Winner({ t, lang, players, stats, onNewGame, onTable }: Props) {
  const rows = rankPlayers(players, stats);
  const winner = rows[0];
  const bestImpostor = [...rows]
    .filter((r) => r.impostorWins > 0)
    .sort((a, b) => b.impostorWins - a.impostorWins)[0];
  if (!winner) return null;

  return (
    <>
      <div className={styles.body}>
        <div className={styles.stack}>
          <span className={styles.fieldLabel}>{t.winner.eyebrow}</span>
          <h2 className={styles.headline} style={{ maxWidth: "none", overflowWrap: "anywhere" }}>
            {winner.name}
          </h2>
          <span className={styles.note}>{t.winner.points(winner.points)}</span>
        </div>

        <div>
          <p className={`${styles.fieldLabel} ${styles.deltaHead}`} style={{ paddingInline: 0 }}>{t.winner.podium}</p>
          <ol className={styles.deltaList} style={{ paddingInline: 0 }}>
            {rows.slice(0, 3).map((r, i) => (
              <li key={r.id} className={`${styles.deltaItem} ${i === 0 ? styles.deltaImpostor : ""}`}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.deltaName}>{r.name}</span>
                <span className={`${styles.deltaValue} ${i === 0 ? styles.deltaMint : styles.deltaZero}`}>
                  {r.points}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {bestImpostor && (
          <div className={styles.bestBox}>
            <span className={styles.bestLabel}>{t.scores.bestImpostor}</span>
            <span className={styles.bestText}>
              <strong>{bestImpostor.name}</strong> —{" "}
              {t.scores.bestImpostorDetail(bestImpostor.impostorWins, bestImpostor.roundsAsImpostor)}
            </span>
          </div>
        )}

        <div className={styles.stack}>
          <ResultShare t={t} lang={lang} rows={rows} />
        </div>
      </div>

      <div className={styles.dock}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onNewGame}>
          {t.winner.newGame}
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onTable}>
          {t.reveal.table}
        </button>
        <span className={styles.dockNote}>{t.winner.newGameNote}</span>
      </div>
    </>
  );
}
