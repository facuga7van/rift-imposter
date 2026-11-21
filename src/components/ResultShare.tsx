"use client";

import type { Player, PlayerStats } from "@/lib/game";
import { pathFor, type Dict, type Lang } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { ShareButton } from "./ShareButton";

export type RankedRow = Player & PlayerStats;

/** Botones de compartir el resultado final. Los usan el ganador local y el `end` online. */
export function ResultShare({ t, lang, rows }: { t: Dict; lang: Lang; rows: RankedRow[] }) {
  const winner = rows[0];
  if (!winner) return null;
  const url = `${SITE_URL}${pathFor(lang)}`;

  return (
    <ShareButton
      title={t.winner.shareTitle}
      text={t.winner.shareText(winner.name, winner.points)}
      url={url}
      label={t.winner.shareResult}
      copiedLabel={t.online.copied}
    />
  );
}
