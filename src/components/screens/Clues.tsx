"use client";

import type { Player, Round } from "@/lib/game";
import type { Dict } from "@/lib/i18n";
import styles from "../game.module.css";

type Props = {
  t: Dict;
  round: Round;
  players: Player[];
  onDone: () => void;
};

export function Clues({ t, round, players, onDone }: Props) {
  const byId = new Map(players.map((p) => [p.id, p]));

  return (
    <>
      <div className={styles.body}>
        <div className={styles.stack}>
          <h2 className={styles.headline}>{t.clues.title}</h2>
          <p className={styles.lede}>{t.clues.lede}</p>
        </div>

        <ol className={styles.order}>
          {round.clueOrder.map((id, i) =>
            i === 0 ? (
              /* El unico item con relleno ambar y dos lineas: hablar primero es
                 la posicion mas dificil y se sortea de nuevo cada ronda, asi
                 que tiene que verse desde el otro lado de la mesa. */
              <li key={id} className={`${styles.orderItem} ${styles.orderFirst}`}>
                <span className={styles.orderNum}>1</span>
                <span className={styles.orderFirstText}>
                  <span className={styles.orderFirstName}>{byId.get(id)?.name}</span>
                  <span className={styles.orderFirstTag}>{t.clues.starts}</span>
                </span>
                <span className={styles.orderArrow} aria-hidden="true">
                  ↓
                </span>
              </li>
            ) : (
              <li key={id} className={styles.orderItem}>
                <span className={styles.orderNum}>{i + 1}</span>
                <span className={styles.orderName}>{byId.get(id)?.name}</span>
              </li>
            ),
          )}
        </ol>

        <span className={styles.note}>{t.clues.note}</span>
      </div>

      <div className={styles.dock}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onDone}>
          {t.clues.done}
        </button>
      </div>
    </>
  );
}
