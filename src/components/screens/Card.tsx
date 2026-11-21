import { championArt, type Champion, type Role } from "@/data/champions";
import type { Dict, Lang } from "@/lib/i18n";
import { fitLen } from "@/lib/typeFit";
import styles from "../game.module.css";

/** Lo que muestra una carta. `role: null` = el impostor juega sin pista de clase. */
export type CardFace =
  | { kind: "crew"; champion: Champion }
  | { kind: "impostor"; role: Role | null };

/** La carta abierta. La usan el pasamanos local y la carta propia del modo online. */
export function Card({
  t,
  lang,
  card,
}: {
  t: Dict;
  lang: Lang;
  card: CardFace;
}) {
  return (
    <div className={styles.cardStage}>
      {card.kind === "impostor" ? (
        /* Mismo rectangulo, mismo borde, mismo boton que la carta del
           inocente. Si desde el sillon de enfrente se distingue por la
           silueta, el juego se rompe: la tension la carga la escala
           tipografica y el rayado, no el color. */
        <div className={`${styles.card} ${styles.cardBlank}`}>
          <div className={styles.blankTop}>
            <span className={styles.blankDiamond} aria-hidden="true">
              ◆
            </span>
            <span className={styles.blankEyebrow}>
              {t.deal.impostorEyebrow}
            </span>
            <span className={styles.blankRule} aria-hidden="true" />
          </div>

          <div className={styles.blankBody}>
            <p className={styles.impostorTitle}>
              <span className={styles.impostorTitleTop}>
                {t.deal.impostorTitleTop}
              </span>{" "}
              <span className={styles.impostorTitleMain}>
                {t.deal.impostorTitleMain}
              </span>
              <span className={styles.impostorUnderline} aria-hidden="true" />
            </p>

            {/* Con la pista prendida, la clase es lo unico que sabe el impostor.
                Vive adentro de su carta y en ningun otro lado: mostrarla en la
                carta del inocente la filtraria igual. */}
            {card.role && (
              <div className={styles.hintBox}>
                <span className={styles.hintLabel}>{t.deal.hintLabel}</span>
                <span className={styles.hintValue}>
                  {t.deal.category(t.roles[card.role])}
                </span>
              </div>
            )}

            <p className={styles.impostorCopy}>
              {card.role ? t.deal.impostorHint : t.deal.impostorHintBlind}
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          <img
            className={styles.cardArt}
            src={championArt(card.champion.id)}
            alt={card.champion.name[lang]}
            width={308}
            height={560}
            /* Es la unica imagen que importa en esta pantalla y aparece al
               instante del tap: nada de lazy. */
            fetchPriority="high"
            decoding="async"
          />
          <div className={styles.cardScrim} aria-hidden="true" />
          <div className={styles.cardMeta}>
            <span
              className={styles.cardName}
              style={fitLen(card.champion.name[lang])}
            >
              {card.champion.name[lang]}
            </span>
            <span className={styles.cardTitle}>
              {card.champion.title[lang]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
