"use client";

import type { Player, Round } from "@/lib/game";
import { listNames, type Dict, type Lang } from "@/lib/i18n";
import { fitLen } from "@/lib/typeFit";
import { Card } from "./Card";
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

export function Deal({
  t,
  lang,
  round,
  players,
  index,
  revealed,
  onView,
  onNext,
}: Props) {
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
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={onView}
            >
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
        <Card
          t={t}
          lang={lang}
          card={
            isImpostor
              ? { kind: "impostor", role: round.roleHint ? round.role : null }
              : { kind: "crew", champion: round.secret }
          }
        />
      </div>

      <div className={styles.dock}>
        <span className={styles.dockNote}>{t.deal.cover}</span>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={onNext}
        >
          {isLast ? t.deal.ready : t.deal.hideAndPass(players[index + 1]!.name)}
        </button>
      </div>
    </>
  );
}
