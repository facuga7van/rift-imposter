"use client";

import { useState } from "react";
import type { Player } from "@/lib/game";
import type { Dict } from "@/lib/i18n";
import styles from "../game.module.css";

/** `null` = empate. Lo distinguimos de "nada elegido" con un centinela propio
 *  para poder deshabilitar el boton de revelar hasta que la mesa se decida. */
const NOTHING = Symbol("nothing");
type Choice = string | null | typeof NOTHING;

type Props = {
  t: Dict;
  players: Player[];
  /** null = empate o nadie convence. El impostor zafa. */
  onVote: (accusedPlayerId: string | null) => void;
};

function initial(name: string): string {
  return [...name.trim()][0] ?? "?";
}

export function Vote({ t, players, onVote }: Props) {
  // Elegir y despues confirmar, en vez de votar con el primer toque: el celular
  // se pasa de mano y un toque al aire mandaba la ronda al carajo sin vuelta.
  const [choice, setChoice] = useState<Choice>(NOTHING);
  const picked = choice !== NOTHING;

  return (
    <>
      <div className={styles.body}>
        <div className={styles.stack}>
          <h2 className={styles.headline}>{t.vote.title}</h2>
          <p className={styles.lede}>{t.vote.lede}</p>
        </div>

        <div className={styles.voteList} role="radiogroup" aria-label={t.vote.title}>
          {players.map((p) => {
            const on = choice === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={`${styles.voteBtn} ${on ? styles.voteBtnOn : ""}`}
                onClick={() => setChoice(p.id)}
              >
                <span className={styles.voteAvatar} aria-hidden="true">
                  {initial(p.name)}
                </span>
                <span className={styles.voteName}>{p.name}</span>
                {on && (
                  <span className={styles.voteCheck} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16">
                      <path
                        d="M3.5 8.5l3 3 6-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className={styles.tieBlock}>
          {/* Fuera del radiogroup a proposito: no es "a quien echamos" sino la
              salida de que la mesa no se puso de acuerdo. */}
          <button
            type="button"
            aria-pressed={choice === null}
            className={`${styles.tieBtn} ${choice === null ? styles.tieBtnOn : ""}`}
            onClick={() => setChoice(null)}
          >
            {t.vote.tie}
          </button>
          <span className={styles.note}>{t.vote.tieHint}</span>
        </div>
      </div>

      <div className={styles.dock}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={!picked}
          onClick={() => picked && onVote(choice as string | null)}
        >
          {t.vote.confirm}
        </button>
        {!picked && <span className={styles.dockNote}>{t.vote.pick}</span>}
      </div>
    </>
  );
}
