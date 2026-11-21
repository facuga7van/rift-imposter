"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./game.module.css";

type Props = {
  title: string;
  text: string;
  url: string;
  label: string;
  copiedLabel: string;
  /** Lo que se copia en escritorio. Por defecto `text + " " + url`. */
  copyText?: string;
  className?: string;
};

const COPIED_MS = 2500;

/**
 * Compartir en un solo lugar: el dialogo del sistema solo en pantallas tactiles
 * (en escritorio estorba y copiar es lo que se espera), y si no, portapapeles
 * con una confirmacion en una region viva.
 */
export function ShareButton({
  title,
  text,
  url,
  label,
  copiedLabel,
  copyText = `${text} ${url}`,
  className = `${styles.btn} ${styles.btnGhost}`,
}: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const share = async () => {
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // lo cancelo el usuario
      }
    }
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      // Sin permiso de portapapeles: no hay nada mas que ofrecer.
    }
  };

  return (
    <>
      <button type="button" className={className} onClick={share}>
        {copied ? copiedLabel : label}
      </button>
      <span className="srOnly" role="status" aria-live="polite">
        {copied ? copiedLabel : ""}
      </span>
    </>
  );
}
