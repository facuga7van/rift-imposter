/**
 * Tests de la logica de las salas online (src/lib/room/logic.ts).
 *
 *   npm run test:room
 *
 * Mismo estilo que test-logic.mjs: asserts planos, sin framework. Importa los
 * .ts directo gracias a los imports relativos con extension.
 */
import assert from "node:assert/strict";
import * as logic from "../src/lib/room/logic.ts";
import { PROTOCOL_VERSION, isRoomCode } from "../src/lib/room/protocol.ts";
import { TARGET_POINTS } from "../src/lib/game.ts";

const {
  HOST_GRACE_MS,
  ROOM_TTL_MS,
  cleanName,
  createRoom,
  isRoomError,
  nextAlarmAt,
  parseHello,
  reduce,
  snapshotFor,
  toEvent,
} = logic;

let ok = 0;
const fails = [];
const check = (label, cond, detail = "") => {
  if (cond) {
    ok++;
    console.log(`  OK   ${label}`);
  } else {
    fails.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
};
const section = (name) => console.log(`\n== ${name} ==`);

/**
 * Mesa de prueba: estado, quien tiene socket abierto y un reloj que se mueve a
 * mano. Imita lo que hace worker/room.ts: arma el ctx y aplica reduce.
 */
function table(names = ["Ana", "Beto", "Cami"]) {
  let n = 0;
  const t = {
    now: 1_000_000,
    state: createRoom("ABCD", 1_000_000),
    connected: [],
    ids: [],
    ctx: () => ({ now: t.now, connected: t.connected, newId: () => `s${++n}` }),
    /** hello con un token (en los tests el token ES el hash). Devuelve el asiento o el error. */
    hello(token, name) {
      const r = reduce(t.state, { type: "hello", tokenHash: token, name }, t.ctx());
      if (isRoomError(r)) return r;
      t.state = r;
      const seat = r.seats.find((s) => s.tokenHash === token && !s.gone);
      if (seat && !t.connected.includes(seat.id)) t.connected = [...t.connected, seat.id];
      return seat;
    },
    /** Mensaje de cliente de un asiento. */
    send(from, msg) {
      const e = toEvent(msg, from);
      assert.ok(e, `mensaje invalido: ${JSON.stringify(msg)}`);
      const r = reduce(t.state, e, t.ctx());
      assert.ok(!isRoomError(r), "solo hello devuelve errores");
      t.state = r;
      return r;
    },
    /** Se le cae el socket a un asiento. */
    drop(id) {
      t.connected = t.connected.filter((x) => x !== id);
      t.sync();
    },
    /** Evento sin mensaje: cambio de conexion o alarm. */
    sync() {
      t.state = reduce(t.state, { type: "sync" }, t.ctx());
    },
  };
  t.ids = names.map((name, i) => t.hello(`tok${i}`, name).id);
  return t;
}

const host = (t) => t.state.hostId;
const impostorOf = (t) => t.state.round.impostorPlayerId;
const crewOf = (t) => t.state.participants.filter((id) => id !== impostorOf(t));

/** Lleva la mesa de lobby a vote. */
function toVote(t) {
  const h = host(t);
  t.send(h, { type: "start" });
  t.send(h, { type: "advance" });
  t.send(h, { type: "advance" });
  assert.equal(t.state.phase, "vote");
}

/** Ronda completa en la que agarran al impostor. */
function catchImpostor(t) {
  toVote(t);
  const imp = impostorOf(t);
  for (const id of t.state.participants) {
    t.send(id, { type: "vote", target: id === imp ? crewOf(t)[0] : imp });
  }
  assert.equal(t.state.phase, "reveal");
}

// ---- codigos y asientos -------------------------------------------------
section("Codigos de sala");
check("ABCD es valido", isRoomCode("ABCD"));
check("rechaza los ambiguos 0 O 1 I L", ["AB0D", "ABOD", "AB1D", "ABID", "ABLD"].every((c) => !isRoomCode(c)));
check("rechaza minusculas y largo distinto", !isRoomCode("abcd") && !isRoomCode("ABC") && !isRoomCode("ABCDE"));

section("Asientos y nombres");
{
  const t = table();
  check("el primero que entra es el anfitrion", host(t) === t.ids[0]);
  check("asientos en orden de llegada", t.state.seats.map((s) => s.name).join() === "Ana,Beto,Cami");
  const again = t.hello("tok1", "Otro");
  check("el mismo token recupera su asiento", again.id === t.ids[1]);
  check("en lobby el hello renombra", again.name === "Otro");
  const dup = t.hello("tokX", "ana");
  check("nombre repetido (sin importar mayusculas) recibe ' 2'", dup.name === "ana 2", dup.name);
  check("y el siguiente ' 3'", t.hello("tokY", "Ana").name === "Ana 3");
  const before = t.state;
  t.hello("tokZ", "   ");
  check("un hello sin nombre valido no crea asiento (misma referencia)", t.state === before);
  t.now += 5;
  t.hello("tokW", "Wen");
  check("un cambio actualiza lastActivity", t.state.lastActivity === t.now);
}
{
  const t = table();
  for (let i = 3; i < 10; i++) t.hello(`tok${i}`, `P${i}`);
  check("entran hasta 10", t.state.seats.length === 10);
  check("el 11.º recibe room_full", t.hello("tok10", "Once")?.error === "room_full");
}
check("cleanName recorta espacios", cleanName("  Ana  ") === "Ana");
check("cleanName saca caracteres de control", cleanName("A\u0000na\n") === "Ana");
check("cleanName rechaza vacio y no-strings", cleanName("   ") === null && cleanName(42) === null);
check("cleanName corta a 20", [...cleanName("x".repeat(30))].length === 20);
check(
  "parseHello rechaza otra version",
  parseHello({ type: "hello", v: PROTOCOL_VERSION + 1, token: "a".repeat(32), name: "x" }) === "bad_version",
);
check(
  "parseHello rechaza un token mal formado",
  parseHello({ type: "hello", v: PROTOCOL_VERSION, token: "zz", name: "x" }) === null,
);
check(
  "parseHello acepta uno bueno",
  parseHello({ type: "hello", v: PROTOCOL_VERSION, token: "a".repeat(32), name: "x" })?.token === "a".repeat(32),
);
check("parseHello ignora lo que no es hello", parseHello({ type: "start" }) === null);

// ---- lobby y ronda ------------------------------------------------------
section("Lobby y ronda");
{
  const t = table(["Ana", "Beto"]);
  let before = t.state;
  t.send(t.ids[0], { type: "start" });
  check("con 2 conectados no arranca", t.state === before);
  t.hello("tok2", "Cami");
  before = t.state;
  t.send(t.ids[1], { type: "start" });
  check("un no-anfitrion no puede arrancar", t.state === before);
  t.send(t.ids[1], { type: "settings", roleHint: false });
  check("un no-anfitrion no toca los ajustes", t.state.settings.roleHint === true);
  t.send(t.ids[0], { type: "settings", roleHint: false });
  check("el anfitrion apaga la pista en lobby", t.state.settings.roleHint === false);
  t.send(t.ids[0], { type: "start" });
  check("start pasa a deal", t.state.phase === "deal");
  check("participan los 3 conectados", t.state.participants.length === 3);
  check("la ronda respeta el ajuste", t.state.round.roleHint === false);
  t.send(t.ids[0], { type: "settings", roleHint: true });
  check("fuera del lobby los ajustes no cambian", t.state.settings.roleHint === false);
  t.send(t.ids[1], { type: "ready" });
  before = t.state;
  t.send(t.ids[1], { type: "ready" });
  check("ready duplicado no cambia nada (misma referencia)", t.state === before);
  check("ready registrado", t.state.ready.join() === t.ids[1]);
  t.send(t.ids[1], { type: "advance" });
  check("advance de un no-anfitrion se descarta", t.state.phase === "deal");
  t.send(t.ids[0], { type: "advance" });
  check("deal -> clues", t.state.phase === "clues");
  before = t.state;
  t.send(t.ids[1], { type: "ready" });
  check("ready fuera de deal se descarta", t.state === before);
  t.send(t.ids[0], { type: "advance" });
  check("clues -> vote", t.state.phase === "vote");
  before = t.state;
  t.send(t.ids[0], { type: "advance" });
  check("advance en vote se descarta", t.state === before);
  t.send(t.ids[0], { type: "cancelRound" });
  check(
    "cancelRound vuelve al lobby y limpia la ronda",
    t.state.phase === "lobby" && t.state.round === null && t.state.participants.length === 0,
  );
  before = t.state;
  t.send(t.ids[0], { type: "nextRound" });
  check("nextRound en lobby se descarta", t.state === before);
}
check(
  "toEvent rechaza basura",
  toEvent(null, "x") === null &&
    toEvent({ type: "nope" }, "x") === null &&
    toEvent({ type: "vote", target: 3 }, "x") === null &&
    toEvent({ type: "settings", roleHint: "si" }, "x") === null &&
    toEvent({ type: "kick" }, "x") === null,
);
check("toEvent pega el emisor", toEvent({ type: "kick", id: "s2" }, "s1")?.from === "s1");
{
  const t = table();
  const before = t.state;
  t.send("fantasma", { type: "start" });
  check("un emisor sin asiento se descarta", t.state === before);
}

// ---- resumen ---------------------------------------------------------------
console.log(`\n${"=".repeat(52)}`);
console.log(`${ok} checks OK, ${fails.length} fallaron`);
if (fails.length) {
  fails.forEach((f) => console.log(`  FAIL ${f}`));
  process.exitCode = 1;
}
