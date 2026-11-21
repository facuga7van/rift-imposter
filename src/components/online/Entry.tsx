"use client";

import { useState, type FormEvent } from "react";
import type { Dict } from "@/lib/i18n";
import { cleanName } from "@/lib/room/logic";
import { NAME_MAX, ROOM_CODE_LENGTH, isRoomCode } from "@/lib/room/protocol";
import styles from "../game.module.css";
import online from "./online.module.css";

type Props = {
  t: Dict;
  /** null = todavia no hay sala: crear o unirse con codigo. */
  code: string | null;
  savedName: string;
  onCreate: () => Promise<void>;
  onCode: (code: string) => void;
  onJoin: (name: string) => void;
};

export function Entry({ t, code, savedName, onCreate, onCode, onJoin }: Props) {
  if (code) return <NameForm key={code} t={t} code={code} savedName={savedName} onJoin={onJoin} />;
  return <NoRoom t={t} onCreate={onCreate} onCode={onCode} />;
}

function NoRoom({ t, onCreate, onCode }: Pick<Props, "t" | "onCreate" | "onCode">) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [typed, setTyped] = useState("");
  const typedCode = typed.trim().toUpperCase();

  const create = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await onCreate();
    } catch {
      // Cuota diaria agotada (429) o red caida: el sitio sigue, la sala no.
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    if (isRoomCode(typedCode)) onCode(typedCode);
  };

  return (
    <>
      <div className={styles.body}>
        <div className={styles.stack}>
          <h2 className={styles.headline}>{t.online.headline}</h2>
          <p className={styles.lede}>{t.online.lede}</p>
        </div>

        <form className={styles.stack} onSubmit={join}>
          <span className={styles.fieldLabel}>{t.online.codeLabel}</span>
          <div className={styles.playerRow}>
            <input
              className={`${styles.playerInput} mono`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-label={t.online.codeLabel}
              placeholder="ABCD"
              maxLength={ROOM_CODE_LENGTH}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="go"
            />
          </div>
          <button type="submit" className={`${styles.btn} ${styles.btnGhost}`} disabled={!isRoomCode(typedCode)}>
            {t.online.join}
          </button>
          {typedCode.length === ROOM_CODE_LENGTH && !isRoomCode(typedCode) && (
            <span className={styles.note}>{t.online.badCode}</span>
          )}
        </form>
      </div>

      <div className={styles.dock}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={create} disabled={busy}>
          {busy ? t.online.creating : t.online.create}
        </button>
        {failed && (
          <span className={styles.dockNote} role="alert">
            {t.online.createFailed}
          </span>
        )}
      </div>
    </>
  );
}

function NameForm({ t, code, savedName, onJoin }: Pick<Props, "t" | "savedName" | "onJoin"> & { code: string }) {
  const [value, setValue] = useState(savedName);
  const clean = cleanName(value);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (clean !== null) onJoin(clean);
  };

  return (
    <form className={online.contents} onSubmit={submit}>
      <div className={styles.body}>
        <div className={styles.stack}>
          <h2 className={styles.headline}>{t.online.roomLabel(code)}</h2>
          <p className={styles.lede}>{t.online.nameLede}</p>
        </div>
        <div className={styles.stack}>
          <span className={styles.fieldLabel}>{t.online.nameLabel}</span>
          <div className={styles.playerRow}>
            <input
              className={styles.playerInput}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-label={t.online.nameLabel}
              maxLength={NAME_MAX}
              autoComplete="nickname"
              autoCapitalize="words"
              enterKeyHint="go"
            />
          </div>
        </div>
      </div>

      <div className={styles.dock}>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={clean === null}>
          {t.online.enter}
        </button>
      </div>
    </form>
  );
}
