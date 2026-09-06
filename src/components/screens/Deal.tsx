"use client";

import { championArt } from "@/data/champions";
import type { Player, Round } from "@/lib/game";
import { listNames, type Dict, type Lang } from "@/lib/i18n";
import { fitLen } from "@/lib/typeFit";
import styles from "../game.module.css";

type Props = {
  t: Dict;
  lang: Lang;
  round: Round;
  players: Player[];
  index: number;
  revealed: boolean;
  onView: () => void;
  onNext: () => void;
};

export function Deal({ t, lang, round, players, index, revealed, onView, onNext }: Props) {
  const player = players[index]!;
  const isImpostor = player.id === round.impostorPlayerId;
  const isLast = index === players.length - 1;
  const pending = players.slice(index + 1).map((p) => p.name);

  if (!revealed) {
    return (
      <>
        <div className={`${styles.body} ${styles.bodyCenter}`}>
          <span className={styles.fieldLabel}>{t.deal.upNext}</span>
          <h2 className={styles.passName} style={fitLen(player.name)}>
            {player.name}
          </h2>
          <p className={styles.passLede}>{t.deal.lede}</p>
        </div>

        <div className={styles.dock}>
          <span className={styles.halo}>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onView}>
              {t.deal.view}
            </button>
          </span>
          {pending.length > 0 && (
            <span className={styles.dockNote}>
              {t.deal.remaining(listNames(lang, pending), pending.length)}
            </span>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className={`${styles.body} ${styles.bodyCard}`}>
        <div className={styles.cardStage}>
          {isImpostor ? (
            /* Mismo rectangulo, mismo borde, mismo boton que la carta del
               inocente. Si desde el sillon de enfrente se distingue por la
               silueta, el juego se rompe: la tension la carga la escala
               tipografica y el rayado, no el color. */
            <div className={`${styles.card} ${styles.cardBlank}`}>
              <div className={styles.blankTop}>
                <span className={styles.blankDiamond} aria-hidden="true">
                  ◆
                </span>
                <span className={styles.blankEyebrow}>{t.deal.impostorEyebrow}</span>
                <span className={styles.blankRule} aria-hidden="true" />
              </div>

              <div className={styles.blankBody}>
                <p className={styles.impostorTitle}>
                  <span className={styles.impostorTitleTop}>{t.deal.impostorTitleTop}</span>{" "}
                  <span className={styles.impostorTitleMain}>{t.deal.impostorTitleMain}</span>
                  <span className={styles.impostorUnderline} aria-hidden="true" />
                </p>

                {/* Con la pista prendida, la clase es lo unico que sabe el
                    impostor. Vive adentro de su carta y en ningun otro lado:
                    mostrarla en la carta del inocente la filtraria igual. */}
                {round.roleHint && (
                  <div className={styles.hintBox}>
                    <span className={styles.hintLabel}>{t.deal.hintLabel}</span>
                    <span className={styles.hintValue}>{t.deal.category(t.roles[round.role])}</span>
                  </div>
                )}

                <p className={styles.impostorCopy}>
                  {round.roleHint ? t.deal.impostorHint : t.deal.impostorHintBlind}
                </p>
              </div>
            </div>
          ) : (
            <div className={styles.card}>
              <img
                className={styles.cardArt}
                src={championArt(round.secret.id)}
                alt={round.secret.name[lang]}
                width={308}
                height={560}
                /* Es la unica imagen que importa en esta pantalla y aparece al
                   instante del tap: nada de lazy. */
                fetchPriority="high"
                decoding="async"
              />
              <div className={styles.cardScrim} aria-hidden="true" />
              <div className={styles.cardMeta}>
                <span className={styles.cardName} style={fitLen(round.secret.name[lang])}>
                  {round.secret.name[lang]}
                </span>
                <span className={styles.cardTitle}>{round.secret.title[lang]}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.dock}>
        <span className={styles.dockNote}>{t.deal.cover}</span>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onNext}>
          {isLast ? t.deal.ready : t.deal.hideAndPass(players[index + 1]!.name)}
        </button>
      </div>
    </>
  );
}
