"use client";

import { useState } from "react";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/game";
import type { Dict } from "@/lib/i18n";
import type { Snapshot } from "@/lib/room/protocol";
import styles from "../game.module.css";
import online from "./online.module.css";

type Props = {
  t: Dict;
  snap: Snapshot;
  shareUrl: string;
  onRoleHint: (value: boolean) => void;
  onStart: () => void;
  onKick: (id: string) => void;
};

export function Lobby({ t, snap, shareUrl, onRoleHint, onStart, onKick }: Props) {
  const [copied, setCopied] = useState(false);
  const isHost = snap.you.isHost;
  const seats = snap.seats.filter((s) => !s.gone);
  const connected = seats.filter((s) => s.connected).length;
  const canStart = connected >= MIN_PLAYERS;
  const roleHint = snap.settings.roleHint;

  const share = async () => {
    // En escritorio el dialogo de compartir del sistema estorba: copiar es lo que se espera.
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: "Rift Impostor", text: t.online.shareText, url: shareUrl });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // lo cancelo el usuario
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      // Sin permiso de portapapeles: el codigo igual esta a la vista.
    }
  };

  return (
    <>
      <div className={styles.body}>
        <div className={styles.stack}>
          <span className={styles.fieldLabel}>{t.online.roomCode}</span>
          <p className={`${styles.passName} ${online.code} mono`}>{snap.code}</p>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={share}>
            {copied ? t.online.copied : t.online.share}
          </button>
        </div>

        <div>
          <div className={styles.fieldHead}>
            <span className={styles.fieldLabel}>{t.online.playersLabel}</span>
            <span className={styles.fieldCount}>{t.setup.playerCount(seats.length, MAX_PLAYERS)}</span>
          </div>
          <ul className={`${styles.playerList} ${online.list}`}>
            {seats.map((s) => (
              <li key={s.id} className={styles.playerRow} data-seat={s.id} data-connected={String(s.connected)}>
                <span className={`${online.dot} ${s.connected ? online.dotOn : ""}`} aria-hidden="true" />
                <span className={online.seatName}>{s.name}</span>
                <span className="srOnly">{s.connected ? t.online.online : t.online.offline}</span>
                {s.id === snap.hostId && <span className={styles.note}>{t.online.host}</span>}
                {s.id === snap.you.id && <span className={styles.note}>{t.online.you}</span>}
                {isHost && s.id !== snap.you.id && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => onKick(s.id)}
                    aria-label={t.online.kick(s.name)}
                  >
                    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isHost ? (
          /* role="switch" de verdad, igual que en Setup. */
          <button
            type="button"
            role="switch"
            aria-checked={roleHint}
            className={styles.setting}
            onClick={() => onRoleHint(!roleHint)}
          >
            <span className={styles.settingText}>
              <span className={styles.settingLabel}>{t.setup.roleHintLabel}</span>
              <span className={styles.settingHint}>{roleHint ? t.setup.roleHintOn : t.setup.roleHintOff}</span>
            </span>
            <span className={`${styles.switch} ${roleHint ? styles.switchOn : ""}`} aria-hidden="true" />
          </button>
        ) : (
          <p className={styles.note}>{roleHint ? t.setup.roleHintOn : t.setup.roleHintOff}</p>
        )}
      </div>

      <div className={styles.dock}>
        {isHost ? (
          <>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={!canStart} onClick={onStart}>
              {t.online.start}
            </button>
            {!canStart && <span className={styles.dockNote}>{t.online.needPlayers(MIN_PLAYERS)}</span>}
          </>
        ) : (
          <span className={styles.dockNote}>{t.online.waitHost}</span>
        )}
      </div>
    </>
  );
}
