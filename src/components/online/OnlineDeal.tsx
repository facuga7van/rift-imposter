"use client";

import { useState } from "react";
import { CHAMPIONS } from "@/data/champions";
import type { Dict, Lang } from "@/lib/i18n";
import type { Snapshot } from "@/lib/room/protocol";
import { Card, type CardFace } from "../screens/Card";
import styles from "../game.module.css";

type Props = {
  t: Dict;
  lang: Lang;
  snap: Snapshot;
  /** Participantes no retirados. */
  active: string[];
  onReady: () => void;
  onAdvance: () => void;
};

export function OnlineDeal({ t, lang, snap, active, onReady, onAdvance }: Props) {
  const [revealed, setRevealed] = useState(false);
  const role = snap.you.role;
  const isHost = snap.you.isHost;
  const readyCount = snap.ready.filter((id) => active.includes(id)).length;

  const footer = (
    <>
      <span className={styles.dockNote}>{t.online.readyCount(readyCount, active.length)}</span>
      {isHost && (
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onAdvance}>
          {t.online.advanceDeal}
        </button>
      )}
    </>
  );

  if (!role || role.kind === "waiting") {
    return (
      <>
        <div className={`${styles.body} ${styles.bodyCenter}`}>
          <h2 className={styles.headline}>{t.online.waitingTitle}</h2>
          <p className={styles.lede}>{t.online.waitingText}</p>
        </div>
        <div className={styles.dock}>{footer}</div>
      </>
    );
  }

  const champion = role.kind === "crew" ? CHAMPIONS.find((c) => c.id === role.championId) : undefined;
  // Un campeon que el cliente no conoce = cliente viejo contra servidor nuevo.
  // Nunca caer a la carta de impostor: le mentiria a un inocente.
  if (role.kind === "crew" && !champion) {
    return (
      <div className={`${styles.body} ${styles.bodyCenter}`}>
        <p className={styles.lede}>{t.online.errors.bad_version}</p>
      </div>
    );
  }
  const card: CardFace = champion
    ? { kind: "crew", champion }
    : { kind: "impostor", role: role.kind === "impostor" ? role.roleHint : null };

  if (!revealed) {
    return (
      <>
        <div className={`${styles.body} ${styles.bodyCenter}`}>
          <span className={styles.fieldLabel}>{t.online.yourCard}</span>
          <p className={styles.passLede}>{t.online.dealLede}</p>
        </div>
        <div className={styles.dock}>
          <span className={styles.halo}>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setRevealed(true)}>
              {t.deal.view}
            </button>
          </span>
          {footer}
        </div>
      </>
    );
  }

  return (
    <>
      <div className={`${styles.body} ${styles.bodyCard}`}>
        <Card t={t} lang={lang} card={card} />
      </div>
      <div className={styles.dock}>
        {!snap.ready.includes(snap.you.id) && (
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onReady}>
            {t.online.ready}
          </button>
        )}
        {footer}
      </div>
    </>
  );
}
