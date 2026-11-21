"use client";

import { useState } from "react";
import type { Player, PlayerStats } from "@/lib/game";
import { pathFor, type Dict, type Lang } from "@/lib/i18n";
import { renderResultCard } from "@/lib/resultCard";
import { SITE_URL } from "@/lib/site";
import { ShareButton } from "./ShareButton";
import styles from "./game.module.css";

export type RankedRow = Player & PlayerStats;

/** Botones de compartir el resultado final. Los usan el ganador local y el `end` online. */
export function ResultShare({ t, lang, rows }: { t: Dict; lang: Lang; rows: RankedRow[] }) {
  const [msg, setMsg] = useState("");
  const winner = rows[0];
  if (!winner) return null;
  const url = `${SITE_URL}${pathFor(lang)}`;

  const shareImage = async () => {
    setMsg("");
    try {
      const best = [...rows].filter((r) => r.impostorWins > 0).sort((a, b) => b.impostorWins - a.impostorWins)[0];
      const blob = await renderResultCard({
        winner: { name: winner.name, points: winner.points },
        podium: rows.slice(0, 3).map((r) => ({ name: r.name, points: r.points })),
        best: best && {
          name: best.name,
          detail: t.winner.card.bestImpostorDetail(best.impostorWins, best.roundsAsImpostor),
        },
        labels: {
          brand: t.winner.shareTitle,
          winner: t.winner.card.winner,
          podium: t.winner.card.podium,
          pts: t.winner.card.pts,
          bestImpostor: t.winner.card.bestImpostor,
        },
        url: url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      });
      const file = new File([blob], t.winner.card.fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: t.winner.shareTitle });
          return;
        } catch (e) {
          if ((e as Error).name === "AbortError") return; // lo cancelo el usuario
        }
      }
      const href = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = href;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
      setMsg(t.winner.imageSaved);
    } catch {
      setMsg(t.winner.imageFailed);
    }
  };

  return (
    <>
      <ShareButton
        title={t.winner.shareTitle}
        text={t.winner.shareText(winner.name, winner.points)}
        url={url}
        label={t.winner.shareResult}
        copiedLabel={t.online.copied}
      />
      <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={shareImage}>
        {t.winner.shareImage}
      </button>
      <span className="srOnly" role="status" aria-live="polite">
        {msg}
      </span>
    </>
  );
}
