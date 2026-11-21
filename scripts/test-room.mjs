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
  isExpired,
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
  const same = t.state;
  t.hello("tok0", "Ana");
  check("reconectar sin cambios no escribe (misma referencia)", t.state === same);
  t.sync();
  check("un sync sin cambios no escribe (misma referencia)", t.state === same);
  t.hello("tok0", "ANA");
  check("renombrarse cambiando mayusculas no choca con uno mismo", t.state.seats[0].name === "ANA");
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
  before = t.state;
  t.send(t.ids[1], { type: "cancelRound" });
  check("cancelRound de un no-anfitrion se descarta", t.state === before);
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

// ---- votacion -----------------------------------------------------------
section("Votacion");
{
  const t = table();
  toVote(t);
  const imp = impostorOf(t);
  const [c1, c2] = crewOf(t);
  let before = t.state;
  t.send(c1, { type: "vote", target: c1 });
  check("no se puede votar a uno mismo", t.state === before);
  t.send(c1, { type: "vote", target: "fantasma" });
  check("no se puede votar a un no participante", t.state === before);
  t.send(c1, { type: "vote", target: c2 });
  t.send(c1, { type: "vote", target: imp });
  check("el voto se puede cambiar", t.state.votes[c1] === imp);
  t.send(c2, { type: "vote", target: imp });
  check("con 2 de 3 todavia no cierra", t.state.phase === "vote");
  t.send(imp, { type: "vote", target: c1 });
  check("cierra sola cuando votaron todos", t.state.phase === "reveal");
  check("lo agarraron", t.state.outcome.kind === "caught");
  check("cada inocente suma 1", t.state.stats[c1].points === 1 && t.state.stats[c2].points === 1);
  check(
    "el impostor no suma pero cuenta la ronda",
    t.state.stats[imp].points === 0 && t.state.stats[imp].roundsAsImpostor === 1,
  );
  check("tally cuenta los votos", t.state.tally[imp] === 2 && t.state.tally[c1] === 1);
  check("roundsPlayed sube", t.state.roundsPlayed === 1);
  before = t.state;
  t.send(c1, { type: "vote", target: c2 });
  check("despues del cierre no se vota", t.state === before);
}
{
  const t = table();
  toVote(t);
  const imp = impostorOf(t);
  const [c1, c2] = crewOf(t);
  t.send(imp, { type: "vote", target: c1 });
  t.send(c2, { type: "vote", target: c1 });
  t.send(c1, { type: "vote", target: imp });
  check(
    "acusan a un inocente: zafa con acusado",
    t.state.outcome.kind === "escaped" && t.state.outcome.accusedPlayerId === c1,
  );
  check("el impostor se lleva 3", t.state.stats[imp].points === 3);
}
{
  const t = table(["Ana", "Beto", "Cami", "Dani"]);
  toVote(t);
  const [a, b, c, d] = t.ids;
  t.send(a, { type: "vote", target: b });
  t.send(b, { type: "vote", target: a });
  t.send(c, { type: "vote", target: a });
  t.send(d, { type: "vote", target: b });
  check(
    "empate en el primer puesto: zafa sin acusado",
    t.state.outcome.kind === "escaped" && t.state.outcome.accusedPlayerId === null,
  );
}
{
  const t = table();
  toVote(t);
  for (const id of t.ids) t.send(id, { type: "vote", target: null });
  check(
    "gana 'nadie': zafa sin acusado",
    t.state.outcome.kind === "escaped" && t.state.outcome.accusedPlayerId === null,
  );
}
{
  const t = table(["Ana", "Beto", "Cami", "Dani"]);
  toVote(t);
  const [a, b, c, d] = t.ids;
  t.send(a, { type: "vote", target: null });
  t.send(b, { type: "vote", target: null });
  t.send(c, { type: "vote", target: a });
  t.send(d, { type: "vote", target: a });
  check("empate entre 'nadie' y alguien: zafa sin acusado", t.state.outcome.accusedPlayerId === null);
}
{
  const t = table(["Ana", "Beto", "Cami", "Dani"]);
  toVote(t);
  const h = host(t);
  const others = t.ids.filter((id) => id !== h);
  t.send(others[0], { type: "vote", target: h });
  let before = t.state;
  t.send(h, { type: "closeVote" });
  check("closeVote con 1 de 4 no cierra", t.state === before);
  t.send(others[1], { type: "vote", target: h });
  before = t.state;
  t.send(h, { type: "closeVote" });
  check("closeVote con 2 de 4 (la mitad justa) no cierra", t.state === before);
  t.send(others[2], { type: "vote", target: h });
  before = t.state;
  t.send(others[0], { type: "closeVote" });
  check("closeVote de un no-anfitrion se descarta", t.state === before);
  t.send(h, { type: "closeVote" });
  check("closeVote con 3 de 4 cierra", t.state.phase === "reveal");
  check("el voto que falto no cuenta", Object.keys(t.state.votes).length === 3);
}
{
  const t = table();
  toVote(t);
  const before = t.state;
  t.send(host(t), { type: "closeVote" });
  check("un anfitrion (impostor o no) no cierra con 0 votos", t.state === before);
}

// ---- despues del reveal -------------------------------------------------
section("Despues del reveal");
{
  const t = table();
  catchImpostor(t);
  const before = t.state;
  t.send(t.ids.find((id) => id !== host(t)), { type: "nextRound" });
  check("nextRound de un no-anfitrion se descarta", t.state === before);
  t.send(host(t), { type: "nextRound" });
  check("nextRound con 3 conectados reparte de nuevo", t.state.phase === "deal" && t.state.round !== null);
  check(
    "la ronda nueva limpia votos, listos y resultado",
    Object.keys(t.state.votes).length === 0 &&
      t.state.ready.length === 0 &&
      t.state.outcome === null &&
      t.state.tally === null,
  );
  check("los puntajes se mantienen", Object.values(t.state.stats).some((s) => s.points > 0));
}
{
  const t = table();
  catchImpostor(t);
  t.drop(t.ids.find((id) => id !== host(t)));
  t.send(host(t), { type: "nextRound" });
  check("nextRound con menos de 3 conectados vuelve al lobby", t.state.phase === "lobby");
}
{
  const t = table();
  t.state = {
    ...t.state,
    stats: Object.fromEntries(
      t.ids.map((id) => [id, { points: TARGET_POINTS - 1, roundsAsImpostor: 0, impostorWins: 0 }]),
    ),
  };
  catchImpostor(t);
  check("la ronda que define la partida igual pasa por reveal", t.state.phase === "reveal");
  t.send(host(t), { type: "nextRound" });
  check("si alguien llego a la meta, nextRound va a end", t.state.phase === "end");
  let before = t.state;
  t.send(t.ids.find((id) => id !== host(t)), { type: "newGame" });
  check("newGame de un no-anfitrion se descarta", t.state === before);
  t.send(host(t), { type: "newGame" });
  check("newGame vuelve al lobby", t.state.phase === "lobby");
  check(
    "newGame pone los puntajes en 0",
    Object.keys(t.state.stats).length === 0 && t.state.roundsPlayed === 0,
  );
}

// ---- entrar tarde -------------------------------------------------------
section("Entrar tarde");
{
  const t = table();
  t.send(host(t), { type: "start" });
  const late = t.hello("tokL", "Lola");
  check("el que entra a mitad de ronda tiene asiento", !!late && t.state.seats.length === 4);
  check("pero no participa de la ronda en curso", !t.state.participants.includes(late.id));
  t.hello("tokL", "Otro nombre");
  check("fuera del lobby el hello no renombra", t.state.seats.find((s) => s.id === late.id).name === "Lola");
  t.send(host(t), { type: "advance" });
  t.send(host(t), { type: "advance" });
  const before = t.state;
  t.send(late.id, { type: "vote", target: t.ids[0] });
  check("no puede votar", t.state === before);
  const imp = impostorOf(t);
  for (const id of t.state.participants) t.send(id, { type: "vote", target: id === imp ? crewOf(t)[0] : imp });
  check("no suma en la ronda que no jugo", t.state.stats[late.id] === undefined);
  t.send(host(t), { type: "nextRound" });
  check("juega desde la ronda siguiente", t.state.participants.includes(late.id));
  check("con 0 puntos", (t.state.stats[late.id]?.points ?? 0) === 0);
}

// ---- salidas y expulsiones ------------------------------------------------
section("Salidas y expulsiones");
{
  const t = table(["Ana", "Beto", "Cami", "Dani"]);
  const [a, b, c, d] = t.ids;
  t.send(b, { type: "kick", id: c });
  check("un no-anfitrion no expulsa", t.state.seats.length === 4);
  t.send(a, { type: "kick", id: a });
  check("el anfitrion no se expulsa a si mismo", t.state.seats.length === 4);
  t.send(a, { type: "kick", id: d });
  check("en lobby kick borra el asiento", t.state.seats.length === 3 && !t.state.seats.some((s) => s.id === d));
  t.send(c, { type: "leave" });
  check("en lobby leave borra el asiento", t.state.seats.length === 2);
}
{
  const t = table(["Ana", "Beto", "Cami", "Dani"]);
  toVote(t);
  const h = host(t);
  const imp = impostorOf(t);
  const victim = crewOf(t).find((id) => id !== h);
  const other = t.state.participants.find((id) => id !== victim && id !== h);
  t.send(victim, { type: "vote", target: imp });
  t.send(other, { type: "vote", target: victim });
  t.send(h, { type: "kick", id: victim });
  const seat = t.state.seats.find((s) => s.id === victim);
  check("a mitad de ronda kick deja el asiento retirado", seat?.gone === true);
  check("se borra su voto", !(victim in t.state.votes));
  check("y los votos en su contra", !(other in t.state.votes));
  check("con 3 participantes activos la ronda sigue", t.state.phase === "vote");
  let before = t.state;
  t.send(other, { type: "vote", target: victim });
  check("no se puede votar a un retirado", t.state === before);
  t.send(victim, { type: "vote", target: imp });
  check("un retirado no vota", t.state === before);
  const late = t.hello("tokL", "Lola");
  before = t.state;
  t.send(other, { type: "vote", target: late.id });
  check("no se puede votar a uno que entro tarde", t.state === before);
  t.send(h, { type: "vote", target: null });
  t.send(h, { type: "closeVote" });
  check("closeVote con 1 de 3 activos no cierra", t.state.phase === "vote");
  t.send(other, { type: "vote", target: null });
  t.send(h, { type: "closeVote" });
  check("closeVote con 2 de 3 activos cierra: la mayoria es sobre los no retirados", t.state.phase === "reveal");
  const back = t.hello(`tok${t.ids.indexOf(victim)}`, "Vuelvo");
  check(
    "el expulsado puede volver a entrar como nuevo",
    back.id !== victim && !t.state.participants.includes(back.id),
  );
}
{
  const t = table(["Ana", "Beto", "Cami", "Dani"]);
  t.send(host(t), { type: "start" });
  t.send(impostorOf(t), { type: "leave" });
  check("si se va el impostor la ronda se cancela", t.state.phase === "lobby");
  check("y el retirado se borra al volver al lobby", t.state.seats.length === 3);
}
{
  const t = table();
  t.send(host(t), { type: "start" });
  t.send(crewOf(t).find((id) => id !== host(t)), { type: "leave" });
  check("con menos de 3 participantes la ronda se cancela", t.state.phase === "lobby");
}
{
  const t = table();
  catchImpostor(t);
  const x = t.ids.find((id) => id !== host(t));
  t.send(x, { type: "leave" });
  check(
    "en reveal el que se va queda retirado",
    t.state.seats.find((s) => s.id === x).gone === true && t.state.phase === "reveal",
  );
  t.hello("tokN", "Nico");
  t.send(host(t), { type: "nextRound" });
  check("los retirados se borran al salir del reveal", !t.state.seats.some((s) => s.id === x));
}
for (const phase of ["deal", "clues", "vote"]) {
  for (const type of ["kick", "leave"]) {
    const t = table(["Ana", "Beto", "Cami", "Dani"]);
    const h = host(t);
    t.send(h, { type: "start" });
    if (phase !== "deal") t.send(h, { type: "advance" });
    if (phase === "vote") t.send(h, { type: "advance" });
    const imp = impostorOf(t);
    if (type === "kick" && imp !== h) t.send(h, { type: "kick", id: imp });
    else t.send(imp, { type: "leave" });
    check(
      `${type} del impostor en ${phase} cancela la ronda`,
      t.state.phase === "lobby" && t.state.round === null && !t.state.seats.some((s) => s.id === imp),
    );
  }
}
{
  const t = table(["Ana", "Beto", "Cami", "Dani"]);
  t.drop(t.ids[3]);
  t.send(host(t), { type: "start" });
  check(
    "un desconectado no participa de la ronda",
    t.state.participants.length === 3 && !t.state.participants.includes(t.ids[3]),
  );
}
{
  const t = table();
  toVote(t);
  const [a, b, c] = t.ids;
  t.send(a, { type: "vote", target: b });
  t.send(b, { type: "vote", target: a });
  t.drop(c);
  check("una desconexion no cierra la votacion", t.state.phase === "vote");
  t.send(host(t), { type: "closeVote" });
  check("el anfitrion la cierra con 2 de 3", t.state.phase === "reveal");
}

// ---- anfitrion ------------------------------------------------------------
section("Anfitrion");
{
  const t = table();
  const [a, b] = t.ids;
  t.drop(a);
  check(
    "si el anfitrion se cae arranca la gracia",
    t.state.hostGraceUntil === t.now + HOST_GRACE_MS && host(t) === a,
  );
  t.now += 10_000;
  t.hello("tok0", "Ana");
  check("si vuelve antes, se limpia", t.state.hostGraceUntil === null && host(t) === a);
  t.drop(a);
  t.now += HOST_GRACE_MS - 1;
  t.sync();
  check("antes de vencer sigue siendo anfitrion", host(t) === a);
  t.now += 1;
  t.sync();
  check("al vencer pasa al conectado mas antiguo", host(t) === b && t.state.hostGraceUntil === null);
  t.hello("tok0", "Ana");
  check("el original que vuelve no lo recupera", host(t) === b);
}
{
  const t = table();
  const [a, b, c] = t.ids;
  t.drop(c);
  t.drop(b);
  t.drop(a);
  t.now += HOST_GRACE_MS;
  t.sync();
  check("sin nadie conectado, hostId queda null", host(t) === null);
  t.hello("tok2", "Cami");
  check("el proximo hello toma el rol", host(t) === c);
}
{
  const t = table();
  const [a, b] = t.ids;
  t.send(a, { type: "leave" });
  check("leave del anfitrion traspasa sin gracia", host(t) === b && t.state.hostGraceUntil === null);
}
{
  const t = table(["Ana", "Beto", "Cami", "Dani"]);
  const [a, b] = t.ids;
  t.send(a, { type: "start" });
  t.send(a, { type: "leave" });
  check("leave del anfitrion a mitad de ronda tambien traspasa", host(t) === b);
}

// ---- alarm --------------------------------------------------------------
section("nextAlarmAt");
{
  const t = table();
  check("sin gracia, la alarma es la expiracion", nextAlarmAt(t.state) === t.state.lastActivity + ROOM_TTL_MS);
  t.drop(t.ids[0]);
  check("con gracia, la alarma es la gracia", nextAlarmAt(t.state) === t.state.hostGraceUntil);
  const idle = t.state.lastActivity + ROOM_TTL_MS;
  check("un ms antes de las 6 h la sala no expiro", !isExpired(t.state, idle - 1));
  check("a las 6 h sin actividad expira", isExpired(t.state, idle));
  t.now = idle - 1;
  t.hello("tokN", "Nico");
  check("la actividad corre la expiracion", !isExpired(t.state, idle) && isExpired(t.state, t.now + ROOM_TTL_MS));
}

// ---- snapshot -----------------------------------------------------------
section("Privacidad del snapshot (obligatorio)");
for (const roleHint of [true, false]) {
  for (const phase of ["deal", "clues", "vote"]) {
    const t = table(["Ana", "Beto", "Cami", "Dani"]);
    t.send(host(t), { type: "settings", roleHint });
    t.send(host(t), { type: "start" });
    if (phase !== "deal") t.send(host(t), { type: "advance" });
    if (phase === "vote") {
      t.send(host(t), { type: "advance" });
      t.send(crewOf(t)[0], { type: "vote", target: impostorOf(t) });
    }
    const late = t.hello("tokL", "Lola");
    const round = t.state.round;
    const leaks = [];
    for (const seat of t.state.seats) {
      const json = JSON.stringify(snapshotFor(t.state, seat.id, t.connected));
      if (seat.id === round.impostorPlayerId && json.includes(`"${round.secret.id}"`)) leaks.push("campeon al impostor");
      if (seat.id === late.id && json.includes(`"${round.secret.id}"`)) leaks.push("campeon al que entro tarde");
      if (json.includes("impostorPlayerId") || json.includes('"impostorId"')) leaks.push(`impostor en ${seat.name}`);
      if (json.includes("tokenHash") || t.state.seats.some((s) => json.includes(`"${s.tokenHash}"`))) {
        leaks.push(`token en ${seat.name}`);
      }
      if (json.includes('"votes"')) leaks.push(`votos en ${seat.name}`);
    }
    check(`${phase}, pista ${roleHint ? "prendida" : "apagada"}: ningun snapshot filtra nada`, leaks.length === 0, leaks.join(", "));
  }
}

section("Contenido del snapshot");
{
  const t = table();
  t.send(host(t), { type: "start" });
  const r = t.state.round;
  const imp = r.impostorPlayerId;
  const crew = crewOf(t)[0];
  const sc = snapshotFor(t.state, crew, t.connected);
  const si = snapshotFor(t.state, imp, t.connected);
  check("el inocente recibe el campeon", sc.you.role.kind === "crew" && sc.you.role.championId === r.secret.id);
  check(
    "el impostor recibe la clase con la pista prendida",
    si.you.role.kind === "impostor" && si.you.role.roleHint === r.role,
  );
  check("antes del reveal no hay resultado", sc.reveal === null);
  check("isHost marca al anfitrion", snapshotFor(t.state, host(t), t.connected).you.isHost === true);
  check("clueOrder trae a los 3 participantes", sc.clueOrder.length === 3);
  const late = t.hello("tokL", "Lola");
  check("el que entro tarde recibe 'waiting'", snapshotFor(t.state, late.id, t.connected).you.role.kind === "waiting");
  t.drop(crew);
  check(
    "connected se deriva de los sockets",
    snapshotFor(t.state, imp, t.connected).seats.find((s) => s.id === crew).connected === false,
  );
  check("un asiento inexistente no recibe snapshot", snapshotFor(t.state, "fantasma", t.connected) === null);
}
{
  const t = table();
  t.send(host(t), { type: "settings", roleHint: false });
  t.send(host(t), { type: "start" });
  const si = snapshotFor(t.state, impostorOf(t), t.connected);
  check("con la pista apagada el impostor no recibe la clase", si.you.role.roleHint === null);
}
{
  const t = table();
  catchImpostor(t);
  const s = snapshotFor(t.state, t.ids[0], t.connected);
  check(
    "en reveal todos ven campeon, impostor, resultado y tally",
    s.reveal !== null &&
      s.reveal.impostorId === impostorOf(t) &&
      s.reveal.championId === t.state.round.secret.id &&
      s.reveal.outcome.kind === "caught" &&
      s.reveal.tally[impostorOf(t)] === 2,
  );
  check("en reveal el numero de ronda es el de la ronda jugada", s.roundNumber === 1);
  check("voted lista ids, no destinos", s.voted.length === 3 && s.voted.every((id) => t.ids.includes(id)));
}

// ---- resumen ---------------------------------------------------------------
console.log(`\n${"=".repeat(52)}`);
console.log(`${ok} checks OK, ${fails.length} fallaron`);
if (fails.length) {
  fails.forEach((f) => console.log(`  FAIL ${f}`));
  process.exitCode = 1;
}
