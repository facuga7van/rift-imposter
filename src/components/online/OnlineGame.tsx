"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CHAMPIONS } from "@/data/champions";
import { primaryRole, rankPlayers, type Player, type Round } from "@/lib/game";
import { ONLINE_PATH, dict, otherLang, pathFor, type Dict, type Lang } from "@/lib/i18n";
import { cleanName } from "@/lib/room/logic";
import { isRoomCode, type ErrorCode, type Snapshot } from "@/lib/room/protocol";
import { createRoom, forgetToken, readToken, useRoom } from "@/lib/room/useRoom";
import { Shell } from "../Shell";
import { Clues } from "../screens/Clues";
import { Reveal } from "../screens/Reveal";
import { Scoreboard } from "../screens/Scoreboard";
import { Vote } from "../screens/Vote";
import { Entry } from "./Entry";
import { Lobby } from "./Lobby";
import { OnlineDeal } from "./OnlineDeal";
import styles from "../game.module.css";

const NAME_KEY = "rift.online.name";

function loadName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveName(name: string): void {
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    // sin storage: solo no lo recuerda
  }
}

/** El Round que espera <Reveal>, armado con lo que trae el snapshot de reveal/end. */
function revealRound(snap: Snapshot): Round | null {
  const r = snap.reveal;
  const secret = r && CHAMPIONS.find((c) => c.id === r.championId);
  if (!r || !secret) return null;
  return {
    role: primaryRole(secret),
    roleHint: snap.settings.roleHint,
    secret,
    impostorPlayerId: r.impostorId,
    clueOrder: snap.clueOrder,
  };
}

export function OnlineGame({ lang }: { lang: Lang }) {
  const t = dict(lang);
  /** undefined = todavia no leimos la URL (primer render, igual en server y cliente). */
  const [code, setCode] = useState<string | null | undefined>(undefined);
  /** null = no entramos a la sala. */
  const [name, setName] = useState<string | null>(null);
  const [savedName, setSavedName] = useState("");

  useEffect(() => {
    // window.location y no useSearchParams: sin <Suspense> rompe el export estatico.
    const raw = new URLSearchParams(window.location.search).get("c")?.toUpperCase() ?? "";
    const valid = isRoomCode(raw) ? raw : null;
    // Mismo saneado que el servidor: un nombre guardado invalido no abre asiento.
    const saved = cleanName(loadName()) ?? "";
    setSavedName(saved);
    setCode(valid);
    // Ya tiene asiento en esta sala (refresco, o volvio a la pestana): entra derecho.
    if (valid && readToken(valid) && saved) setName(saved);
  }, []);

  const room = useRoom(code ?? null, name);
  const snap = room.snapshot;

  const goTo = (next: string | null) => {
    window.history.replaceState(null, "", next ? `?c=${next}` : window.location.pathname);
    setCode(next);
    setName(null);
  };
  const join = (n: string) => {
    saveName(n);
    setSavedName(n);
    setName(n);
  };
  const create = async () => goTo(await createRoom());
  const leave = () => {
    room.leave();
    goTo(null);
  };
  const rejoin = () => {
    if (code) forgetToken(code);
    setName(null);
  };

  const inRoom = Boolean(code && name !== null && snap && !room.error);
  const isHost = snap?.you.isHost ?? false;
  const byId = new Map((snap?.seats ?? []).map((s) => [s.id, s]));
  const players = (ids: string[]): Player[] =>
    ids.flatMap((id) => {
      const s = byId.get(id);
      return s ? [{ id: s.id, name: s.name }] : [];
    });
  /** Para reveal/end: el impostor o quien recibio puntos pudo irse y ya no figurar
   *  en `seats`. Un id sin nombre se muestra con un texto de reemplazo, nunca se pierde. */
  const playersOrLeft = (ids: string[]): Player[] =>
    ids.map((id) => ({ id, name: byId.get(id)?.name ?? t.online.leftPlayer }));
  /** Participantes no retirados, en orden de pista. */
  const active = (snap?.clueOrder ?? []).filter((id) => byId.get(id)?.gone === false);
  const waitHost = <span className={styles.dockNote}>{t.online.waitHost}</span>;

  const phaseScreen = (s: Snapshot): ReactNode => {
    const send = room.send;
    switch (s.phase) {
      case "lobby":
        return (
          <Lobby
            t={t}
            snap={s}
            shareUrl={window.location.href}
            onRoleHint={(roleHint) => send({ type: "settings", roleHint })}
            onStart={() => send({ type: "start" })}
            onKick={(id) => send({ type: "kick", id })}
          />
        );
      case "deal":
        return (
          <OnlineDeal
            key={s.roundNumber}
            t={t}
            lang={lang}
            snap={s}
            active={active}
            onReady={() => send({ type: "ready" })}
            onAdvance={() => send({ type: "advance" })}
          />
        );
      case "clues":
        return (
          <Clues
            t={t}
            clueOrder={active}
            players={players(active)}
            onDone={isHost ? () => send({ type: "advance" }) : undefined}
            footer={isHost ? undefined : waitHost}
          />
        );
      case "vote": {
        const voted = s.voted.filter((id) => active.includes(id)).length;
        const footer = (
          <>
            <span className={styles.dockNote}>
              {t.online.votedCount(voted, active.length)}
              {s.voted.includes(s.you.id) ? ` · ${t.online.voteSent}` : ""}
            </span>
            {isHost && (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                disabled={voted * 2 <= active.length}
                onClick={() => send({ type: "closeVote" })}
              >
                {t.online.closeVote}
              </button>
            )}
          </>
        );
        if (!active.includes(s.you.id)) return <Waiting t={t} footer={footer} />;
        return (
          <Vote
            t={t}
            players={players(active.filter((id) => id !== s.you.id))}
            onVote={(target) => send({ type: "vote", target })}
            lede={t.online.voteLede}
            tieLabel={t.online.voteTie}
            confirmLabel={t.online.voteConfirm}
            footer={footer}
          />
        );
      }
      case "reveal": {
        const round = revealRound(s);
        if (!round || !s.reveal) return <Loading text={t.loading} />;
        // Tabla corrida: en el modo online no hay pantalla de puntajes hasta el final.
        const standings = rankPlayers(players(s.seats.filter((x) => !x.gone).map((x) => x.id)), s.stats)
          .map((r) => `${r.name} ${r.points}`)
          .join(" · ");
        return (
          <Reveal
            t={t}
            lang={lang}
            round={round}
            roundNumber={s.roundNumber}
            players={playersOrLeft(
              s.clueOrder.includes(s.reveal.impostorId) ? s.clueOrder : [...s.clueOrder, s.reveal.impostorId],
            )}
            outcome={s.reveal.outcome}
            deltas={s.reveal.deltas}
            tally={s.reveal.tally}
            onNextRound={isHost ? () => send({ type: "nextRound" }) : undefined}
            footer={
              <>
                {!isHost && waitHost}
                <span className={styles.dockNote}>{standings}</span>
              </>
            }
          />
        );
      }
      case "end":
        return (
          <Scoreboard
            t={t}
            players={players(s.seats.filter((x) => !x.gone).map((x) => x.id))}
            stats={s.stats}
            roundsPlayed={s.roundsPlayed}
            footer={
              isHost ? (
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => send({ type: "newGame" })}>
                  {t.online.newGame}
                </button>
              ) : (
                waitHost
              )
            }
          />
        );
    }
  };

  let screen: ReactNode;
  if (code === undefined) screen = <Loading text={t.loading} />;
  else if (room.error) screen = <RoomError t={t} error={room.error} onCreate={create} onRejoin={rejoin} />;
  else if (!code || name === null) {
    screen = <Entry t={t} code={code} savedName={savedName} onCreate={create} onCode={goTo} onJoin={join} />;
  } else if (!snap) screen = <Loading text={t.online.connecting} />;
  else screen = phaseScreen(snap);

  const reconnecting = room.status === "reconnecting" && name !== null;
  const context =
    reconnecting
      ? t.online.reconnecting
      : !inRoom || !snap
        ? null
        : snap.phase === "lobby"
          ? t.online.roomLabel(snap.code)
          : snap.phase === "deal"
            ? t.reveal.context(snap.roundNumber)
            : snap.phase === "clues"
              ? t.clues.context(snap.roundNumber)
              : snap.phase === "vote"
                ? t.vote.context(snap.roundNumber)
                : null;

  const midRound = snap?.phase === "deal" || snap?.phase === "clues" || snap?.phase === "vote";
  const nav = inRoom ? (
    <>
      {isHost && midRound && (
        <button type="button" className={styles.navLink} onClick={() => room.send({ type: "cancelRound" })}>
          {t.online.cancelRound}
        </button>
      )}
      <button type="button" className={styles.navLink} onClick={leave}>
        {t.online.leave}
      </button>
    </>
  ) : (
    <a className={styles.navLink} href={`${pathFor(lang)}#rules`}>
      {t.nav.rules}
    </a>
  );

  return (
    <Shell
      t={t}
      lang={lang}
      langHref={`${ONLINE_PATH[otherLang(lang)]}${code ? `?c=${code}` : ""}`}
      nav={nav}
      context={context}
    >
      {/* Siempre montado: una region viva que aparece junto con su texto no se
          anuncia. La banda de contexto dice lo mismo, pero solo a la vista. */}
      <p className="srOnly" role="status">
        {reconnecting ? t.online.reconnecting : ""}
      </p>
      {screen}
    </Shell>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className={`${styles.body} ${styles.bodyCenter}`} aria-busy="true">
      <p className={styles.note}>{text}</p>
    </div>
  );
}

function Waiting({ t, footer }: { t: Dict; footer: ReactNode }) {
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

/** Errores legibles: sala inexistente o vencida -> crear otra; version nueva -> recargar. */
function RoomError({
  t,
  error,
  onCreate,
  onRejoin,
}: {
  t: Dict;
  error: ErrorCode;
  onCreate: () => Promise<void>;
  onRejoin: () => void;
}) {
  const action =
    error === "room_not_found" || error === "room_full"
      ? { label: t.online.createNew, run: () => void onCreate().catch(() => {}) }
      : error === "kicked"
        ? { label: t.online.joinAgain, run: onRejoin }
        : { label: t.online.reload, run: () => window.location.reload() };

  return (
    <>
      <div className={`${styles.body} ${styles.bodyCenter}`}>
        <h2 className={styles.headline} style={{ textAlign: "center" }} role="alert">
          {t.online.errors[error]}
        </h2>
      </div>
      <div className={styles.dock}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={action.run}>
          {action.label}
        </button>
      </div>
    </>
  );
}
