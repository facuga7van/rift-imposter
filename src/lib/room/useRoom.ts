"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CLOSE_CODES,
  PROTOCOL_VERSION,
  type ClientMessage,
  type ErrorCode,
  type ServerMessage,
  type Snapshot,
} from "./protocol";
import { cleanName } from "./logic";

/** Vacio = mismo origen (produccion). En desarrollo, wrangler dev: http://localhost:8787. */
const ORIGIN = process.env.NEXT_PUBLIC_ROOMS_ORIGIN ?? "";
const PONG_TIMEOUT_MS = 3000;
const BACKOFF_MIN_MS = 500;
const BACKOFF_MAX_MS = 8000;

export type RoomStatus = "connecting" | "open" | "reconnecting" | "closed";
type Outgoing = Exclude<ClientMessage, { type: "hello" }>;

const ERROR_BY_CLOSE = Object.fromEntries(
  Object.entries(CLOSE_CODES).map(([code, n]) => [n, code]),
) as Record<number, ErrorCode>;

const tokenKey = (code: string) => `rift.room.${code}`;

export function readToken(code: string): string | null {
  try {
    return window.localStorage.getItem(tokenKey(code));
  } catch {
    return null;
  }
}

export function forgetToken(code: string): void {
  try {
    window.localStorage.removeItem(tokenKey(code));
  } catch {
    // storage bloqueado: no habia nada que borrar
  }
}

/**
 * 128 bits aleatorios. `getRandomValues` existe tambien fuera de HTTPS, a
 * diferencia de `randomUUID` (ver el comentario de newId en game.ts). El token
 * nunca llega a otros jugadores: el servidor guarda solo su hash.
 */
function ensureToken(code: string): string {
  const saved = readToken(code);
  if (saved) return saved;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  try {
    window.localStorage.setItem(tokenKey(code), token);
  } catch {
    // sin storage: la sesion anda, pero un refresco entra como jugador nuevo
  }
  return token;
}

export async function createRoom(): Promise<string> {
  const res = await fetch(`${ORIGIN}/api/sala`, { method: "POST" });
  if (!res.ok) throw new Error(`POST /api/sala: ${res.status}`);
  const { code } = (await res.json()) as { code: string };
  return code;
}

function wsUrl(code: string): string {
  const base = ORIGIN || window.location.origin;
  return `${base.replace(/^http/, "ws")}/api/sala/${code}/ws`;
}

/**
 * Ciclo de vida del WebSocket de una sala. Se conecta cuando hay codigo Y
 * nombre; `null` en cualquiera de los dos = desconectado.
 *
 * - Ante un cierre 4xxx (error fatal) NO reconecta: deja `error` seteado.
 * - Ante cualquier otro cierre, backoff de 0,5 s a 8 s.
 * - Al volver a la pestana manda `ping`; sin `pong` en 3 s, reconecta. El DO
 *   responde el ping con auto-response, sin despertarse.
 */
export function useRoom(code: string | null, name: string | null) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [error, setError] = useState<ErrorCode | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  // Mismo saneado que el servidor: un hello con nombre invalido no recibe respuesta
  // y el socket queda abierto sin asiento.
  const clean = name === null ? null : cleanName(name);
  const nameRef = useRef(clean);
  const leavingRef = useRef(false);
  const active = code !== null && clean !== null;

  useEffect(() => {
    nameRef.current = clean;
  }, [clean]);

  useEffect(() => {
    if (!active || code === null) return;
    let stopped = false;
    leavingRef.current = false;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let pongTimer: ReturnType<typeof setTimeout> | undefined;
    const token = ensureToken(code);

    const connect = () => {
      setStatus(attempt === 0 ? "connecting" : "reconnecting");
      const ws = new WebSocket(wsUrl(code));
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setStatus("open");
        ws.send(JSON.stringify({ type: "hello", v: PROTOCOL_VERSION, token, name: nameRef.current ?? "" }));
      };

      ws.onmessage = (ev) => {
        if (wsRef.current !== ws) return; // socket viejo: lo que diga ya no importa
        if (ev.data === "pong") {
          clearTimeout(pongTimer);
          return;
        }
        let msg: ServerMessage;
        try {
          msg = JSON.parse(String(ev.data)) as ServerMessage;
        } catch {
          return;
        }
        if (msg.type === "snapshot") setSnapshot(msg);
        else setError(msg.code);
      };

      ws.onclose = (ev) => {
        if (wsRef.current !== ws) return; // reemplazado a mano (pong vencido o desmontaje)
        wsRef.current = null;
        clearTimeout(pongTimer);
        if (stopped || leavingRef.current) return;
        if (ev.code >= 4000 && ev.code <= 4999) {
          // Fatal. El mensaje `error` llego antes del cierre; el mapa cubre el caso raro en que no.
          stopped = true;
          setError((prev) => prev ?? ERROR_BY_CLOSE[ev.code] ?? "room_not_found");
          setStatus("closed");
          return;
        }
        setStatus("reconnecting");
        retry = setTimeout(connect, Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** attempt++));
      };
    };

    // Un celular que se durmio puede tener el socket muerto sin que el navegador se entere.
    const onVisible = () => {
      if (document.visibilityState !== "visible" || stopped || leavingRef.current) return;
      const ws = wsRef.current;
      if (!ws) {
        clearTimeout(retry);
        attempt = 0;
        connect();
        return;
      }
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send("ping");
      clearTimeout(pongTimer);
      pongTimer = setTimeout(() => {
        wsRef.current = null;
        ws.close();
        connect();
        setStatus("reconnecting"); // connect() dice "connecting" con attempt en 0, y esto no es la primera vez
      }, PONG_TIMEOUT_MS);
    };

    document.addEventListener("visibilitychange", onVisible);
    connect();

    return () => {
      stopped = true;
      clearTimeout(retry);
      clearTimeout(pongTimer);
      document.removeEventListener("visibilitychange", onVisible);
      const ws = wsRef.current;
      wsRef.current = null;
      // Cerrar un socket que todavia conecta ensucia la consola ("closed before
      // the connection is established"), y StrictMode en dev monta dos veces.
      if (ws?.readyState === WebSocket.CONNECTING) ws.onopen = () => ws.close(1000);
      else ws?.close(1000);
      setSnapshot(null);
      setError(null);
      setStatus("connecting");
    };
  }, [code, active]);

  const send = useCallback((msg: Outgoing) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  /** Avisa al servidor y olvida el token. Quien llama desmonta la sala despues
   *  (close() no descarta lo que ya estaba encolado, asi que el leave llega).
   *  El servidor responde al leave cerrando con 1000 (no 4xxx): si el hook
   *  reconectara, el jugador volveria a entrar como un asiento nuevo. */
  const leave = useCallback(() => {
    leavingRef.current = true;
    send({ type: "leave" });
    if (code) forgetToken(code);
  }, [send, code]);

  return { snapshot, status, error, send, leave };
}
