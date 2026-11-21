"use client";

import type { ReactNode } from "react";
import type { Player } from "@/lib/game";
import type { Dict } from "@/lib/i18n";
import styles from "../game.module.css";

type Props = {
  t: Dict;
  /** Ids en orden de pista. El primero es aleatorio a proposito. */
  clueOrder: string[];
  players: Player[];
  /** Sin esto no hay boton: en el modo online solo avanza el anfitrion. */
  onDone?: () => void;
  footer?: ReactNode;
};

export function Clues({ t, clueOrder, players, onDone, footer }: Props) {
  const byId = new Map(players.map((p) => [p.id, p]));

  return (
    <>
      <div className={styles.body}>
        <div className={styles.stack}>
          <h2 className={styles.headline}>{t.clues.title}</h2>
          <p className={styles.lede}>{t.clues.lede}</p>
        </div>

        <ol className={styles.order}>
          {clueOrder.map((id, i) =>
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

      {(onDone || footer) && (
        <div className={styles.dock}>
          {onDone && (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onDone}>
              {t.clues.done}
            </button>
          )}
          {footer}
        </div>
      )}
    </>
  );
}
