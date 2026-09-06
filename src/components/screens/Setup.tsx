"use client";

import { MAX_PLAYERS, MIN_PLAYERS, createPlayer, type Player } from "@/lib/game";
import type { Dict } from "@/lib/i18n";
import styles from "../game.module.css";

const NAME_MAX = 16;

type Props = {
  t: Dict;
  players: Player[];
  roleHint: boolean;
  onChange: (players: Player[]) => void;
  onRoleHintChange: (value: boolean) => void;
  onStart: () => void;
};

export function Setup({ t, players, roleHint, onChange, onRoleHintChange, onStart }: Props) {
  const rename = (id: string, name: string) =>
    onChange(players.map((p) => (p.id === id ? { ...p, name } : p)));

  const remove = (id: string) => onChange(players.filter((p) => p.id !== id));

  const add = () => onChange([...players, createPlayer("")]);

  const atMax = players.length >= MAX_PLAYERS;

  return (
    <>
      <div className={styles.body}>
        <div className={styles.stack}>
          <h2 className={styles.headline}>{t.setup.headline}</h2>
          <p className={styles.lede}>{t.setup.lede}</p>
        </div>

        <div>
          <div className={styles.fieldHead}>
            <span className={styles.fieldLabel}>{t.setup.playersLabel}</span>
            <span className={styles.fieldCount}>
              {t.setup.playerCount(players.length, MAX_PLAYERS)}
            </span>
          </div>

          <div className={styles.playerList}>
            {players.map((p, i) => (
              <div key={p.id} className={styles.playerRow}>
                <input
                  className={styles.playerInput}
                  value={p.name}
                  onChange={(e) => rename(p.id, e.target.value)}
                  placeholder={t.setup.playerPlaceholder(i + 1)}
                  aria-label={t.setup.playerLabel(i + 1)}
                  maxLength={NAME_MAX}
                  autoComplete="off"
                  autoCapitalize="words"
                  enterKeyHint="done"
                />
                {/* Solo visible con la fila enfocada: en reposo el contador es
                    ruido en una lista de hasta diez filas. */}
                <span className={styles.charCount} aria-hidden="true">
                  {p.name.length}/{NAME_MAX}
                </span>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => remove(p.id)}
                  disabled={players.length <= MIN_PLAYERS}
                  aria-label={t.setup.remove(p.name || t.setup.playerPlaceholder(i + 1))}
                  title={
                    players.length <= MIN_PLAYERS ? t.setup.minPlayers(MIN_PLAYERS) : undefined
                  }
                >
                  <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
                    <path
                      d="M4 4l8 8M12 4l-8 8"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ))}

            <button type="button" className={styles.addBtn} onClick={add} disabled={atMax}>
              {atMax ? t.setup.maxPlayers(MAX_PLAYERS) : t.setup.addPlayer}
            </button>
          </div>
        </div>

        {/* role="switch" de verdad, no un div con onClick: asi anda con teclado
            y un lector de pantalla lo anuncia como activado/desactivado. */}
        <button
          type="button"
          role="switch"
          aria-checked={roleHint}
          className={styles.setting}
          onClick={() => onRoleHintChange(!roleHint)}
        >
          <span className={styles.settingText}>
            <span className={styles.settingLabel}>{t.setup.roleHintLabel}</span>
            <span className={styles.settingHint}>
              {roleHint ? t.setup.roleHintOn : t.setup.roleHintOff}
            </span>
          </span>
          <span
            className={`${styles.switch} ${roleHint ? styles.switchOn : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className={styles.dock}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onStart}>
          {t.setup.start}
          <span className={styles.shine} aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
