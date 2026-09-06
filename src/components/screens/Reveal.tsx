"use client";

import { championArt } from "@/data/champions";
import type { Outcome, Player, PlayerStats, Round } from "@/lib/game";
import type { Dict, Lang } from "@/lib/i18n";
import { fitLen } from "@/lib/typeFit";
import styles from "../game.module.css";

type Props = {
  t: Dict;
  lang: Lang;
  round: Round;
  roundNumber: number;
  players: Player[];
  outcome: Outcome;
  deltas: Record<string, Partial<PlayerStats>>;
  onNextRound: () => void;
  onScores: () => void;
};

export function Reveal({
  t,
  lang,
  round,
  roundNumber,
  players,
  outcome,
  deltas,
  onNextRound,
  onScores,
}: Props) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const impostor = byId.get(round.impostorPlayerId)!;
  const escaped = outcome.kind === "escaped";

  const detail = escaped
    ? outcome.accusedPlayerId
      ? t.reveal.accused(byId.get(outcome.accusedPlayerId)?.name ?? "")
      : t.reveal.nobody
    : "";

  return (
    <>
      <div className={`${styles.body} ${styles.bodyReveal}`}>
        {/* El resultado se lee de un vistazo por la banda: ambar plena cuando
            gana el impostor, menta cuando gana el grupo. La estructura de las
            dos variantes es identica, nada se mueve de lugar. */}
        <div className={`${styles.banner} ${escaped ? styles.bannerAmber : styles.bannerMint}`}>
          <span className={styles.bannerEyebrow}>{t.reveal.context(roundNumber)}</span>
          <h2 className={styles.bannerTitle}>{t.reveal[outcome.kind]}</h2>
          <p className={styles.bannerLine}>
            {t.reveal.impostorWas} <strong>{impostor.name}</strong>. {detail}
          </p>
        </div>

        <div className={styles.champStrip}>
          <div className={styles.champThumb}>
            <img
              src={championArt(round.secret.id)}
              alt={round.secret.name[lang]}
              width={308}
              height={560}
              decoding="async"
            />
          </div>
          <div className={styles.champText}>
            <span className={styles.fieldLabel}>{t.reveal.championWas}</span>
            <span className={styles.champName} style={fitLen(round.secret.name[lang])}>
              {round.secret.name[lang]}
            </span>
            <span className={styles.champTitle}>
              {round.secret.title[lang]} · {t.roles[round.role]}
            </span>
          </div>
        </div>

        <p className={`${styles.fieldLabel} ${styles.deltaHead}`}>{t.reveal.roundPoints}</p>
        <ul className={styles.deltaList}>
          {players.map((p) => {
            const gained = deltas[p.id]?.points ?? 0;
            const isImpostor = p.id === round.impostorPlayerId;
            return (
              <li
                key={p.id}
                className={`${styles.deltaItem} ${isImpostor ? styles.deltaImpostor : ""}`}
              >
                {/* El rombo lo pone el CSS, no el JSX: es decorativo y en el
                    markup ensuciaba el texto de la fila (lectores de pantalla
                    y `innerText` se lo comian igual con `aria-hidden`). */}
                <span
                  className={`${styles.deltaMark} ${isImpostor && escaped ? styles.deltaMarkOn : ""}`}
                  aria-hidden="true"
                />
                <span className={styles.deltaName}>{p.name}</span>
                {isImpostor && <span className={styles.deltaTag}>{t.reveal.wasImpostor}</span>}
                <span
                  className={`${styles.deltaValue} ${
                    gained === 0 ? styles.deltaZero : escaped ? styles.deltaAmber : styles.deltaMint
                  }`}
                >
                  {gained > 0 ? `+${gained}` : "0"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.dock}>
        <button
          type="button"
          className={`${styles.btn} ${escaped ? styles.btnPrimary : styles.btnMint}`}
          onClick={onNextRound}
        >
          {t.reveal.next}
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onScores}>
          {t.reveal.table}
        </button>
      </div>
    </>
  );
}
