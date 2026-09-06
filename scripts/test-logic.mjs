/**
 * Tests de la logica pura del juego, contra el modulo real.
 *
 *   npm run test:logic
 *
 * game.ts no importa nada de React justamente para poder testearlo asi. Lo
 * unico que hay que puentear es el alias `@/`, que Node no resuelve: copiamos
 * los dos archivos a un temporal y reescribimos ese import. El resto del codigo
 * es byte por byte el que se publica.
 */
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const tmp = mkdtempSync(join(tmpdir(), "rift-logic-"));

copyFileSync(join(SRC, "data", "champions.ts"), join(tmp, "champions.ts"));
copyFileSync(join(SRC, "lib", "game.ts"), join(tmp, "game.ts"));
writeFileSync(
  join(tmp, "game.ts"),
  readFileSync(join(tmp, "game.ts"), "utf8").replace("@/data/champions", "./champions.ts"),
);

const {
  createRound,
  scoreRound,
  applyDeltas,
  rankPlayers,
  primaryRole,
  ROLES,
  POINTS_IMPOSTOR_ESCAPES,
  POINTS_CREW_CATCHES,
} = await import(pathToFileURL(join(tmp, "game.ts")).href);
const { CHAMPIONS } = await import(pathToFileURL(join(tmp, "champions.ts")).href);

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

const spreadOf = (d, exp) => Math.max(...Object.values(d).map((v) => Math.abs(v - exp) / exp));

const players = ["Ana", "Beto", "Cami", "Dani", "Eze"].map((n, i) => ({ id: `p${i}`, name: n }));
const N = 20000;

// ---- el bug que reporto el usuario jugando --------------------------------
console.log("\n== Clase del campeon ==");
const taliyah = CHAMPIONS.find((c) => c.id === "Taliyah");
check("Taliyah sigue teniendo Support como tag secundario de Riot", taliyah.tags.includes("Support"));
check("...pero su clase principal es Mage", primaryRole(taliyah) === "Mage", taliyah.tags.join("/"));

const firstSpeaker = {};
const impostorCount = {};
const roleCount = {};
let mismatches = 0;
let taliyahEnSoporte = 0;

for (let i = 0; i < N; i++) {
  const r = createRound(players, true);
  if (primaryRole(r.secret) !== r.role) mismatches++;
  if (r.role === "Support" && r.secret.id === "Taliyah") taliyahEnSoporte++;
  assert.ok(players.some((p) => p.id === r.impostorPlayerId), "el impostor es un jugador");
  assert.deepEqual([...r.clueOrder].sort(), players.map((p) => p.id).sort());
  firstSpeaker[r.clueOrder[0]] = (firstSpeaker[r.clueOrder[0]] ?? 0) + 1;
  impostorCount[r.impostorPlayerId] = (impostorCount[r.impostorPlayerId] ?? 0) + 1;
  roleCount[r.role] = (roleCount[r.role] ?? 0) + 1;
}

check(`el campeon siempre pertenece a la clase anunciada (${N} rondas)`, mismatches === 0, `${mismatches} desajustes`);
check("Taliyah nunca sale como soporte", taliyahEnSoporte === 0, `salio ${taliyahEnSoporte} veces`);
check("se sortean las 6 clases", Object.keys(roleCount).length === ROLES.length, JSON.stringify(roleCount));
check("con pista, las 6 clases salen parejo", spreadOf(roleCount, N / ROLES.length) < 0.06, JSON.stringify(roleCount));

// ---- modo sin pista de clase --------------------------------------------
console.log("\n== Sin pista de clase ==");
const blindChamps = new Set();
const blindRoles = {};
let blindFlagWrong = 0;
let blindRoleWrong = 0;
for (let i = 0; i < N; i++) {
  const r = createRound(players, false);
  if (r.roleHint !== false) blindFlagWrong++;
  if (primaryRole(r.secret) !== r.role) blindRoleWrong++;
  blindChamps.add(r.secret.id);
  blindRoles[r.role] = (blindRoles[r.role] ?? 0) + 1;
}
check("la ronda recuerda que la pista estaba apagada", blindFlagWrong === 0);
check("la clase se sigue derivando bien aunque no se muestre", blindRoleWrong === 0);
check(
  `sin pista puede salir cualquiera de los ${CHAMPIONS.length} campeones`,
  blindChamps.size === CHAMPIONS.length,
  `salieron ${blindChamps.size}`,
);
// Sin pista el sorteo es plano sobre campeones, no sobre clases: los 50
// luchadores tienen que aparecer mucho mas seguido que los 17 asesinos.
const fighters = CHAMPIONS.filter((c) => primaryRole(c) === "Fighter").length;
const esperadoFighter = (N * fighters) / CHAMPIONS.length;
check(
  "sin pista el sorteo es plano por campeon, no por clase",
  Math.abs(blindRoles.Fighter - esperadoFighter) / esperadoFighter < 0.08,
  `Fighter salio ${blindRoles.Fighter}, esperaba ~${Math.round(esperadoFighter)}`,
);
check("con pista prendida la ronda tambien lo recuerda", createRound(players, true).roleHint === true);

// ---- uniformidad ---------------------------------------------------------
console.log("\n== Uniformidad ==");
const expected = N / players.length;
const spread = (d) => spreadOf(d, expected);
check("impostor uniforme", spread(impostorCount) < 0.05, JSON.stringify(impostorCount));
check("primer hablante uniforme", spread(firstSpeaker) < 0.05, JSON.stringify(firstSpeaker));

// ---- puntajes ------------------------------------------------------------
console.log("\n== Puntajes ==");
const r = createRound(players, true);
const imp = r.impostorPlayerId;
const inocente = players.find((p) => p.id !== imp).id;

const zafo = scoreRound(r, players, { kind: "escaped", accusedPlayerId: inocente });
check(`acusar a un inocente da ${POINTS_IMPOSTOR_ESCAPES} al impostor`, zafo[imp].points === POINTS_IMPOSTOR_ESCAPES);
check("si zafa, nadie mas suma", Object.keys(zafo).length === 1);
check("zafar cuenta como victoria de impostor", zafo[imp].impostorWins === 1);

const empate = scoreRound(r, players, { kind: "escaped", accusedPlayerId: null });
check("el empate se paga igual que zafar", empate[imp].points === POINTS_IMPOSTOR_ESCAPES);

const cayo = scoreRound(r, players, { kind: "caught" });
check("si lo agarran el impostor no suma", cayo[imp].points === 0);
check("...y no cuenta como victoria", cayo[imp].impostorWins === 0);
check("...pero si cuenta la ronda como impostor", cayo[imp].roundsAsImpostor === 1);
check(
  `cada inocente se lleva ${POINTS_CREW_CATCHES}`,
  players.filter((p) => p.id !== imp).every((p) => cayo[p.id].points === POINTS_CREW_CATCHES),
);

// ---- acumulacion ---------------------------------------------------------
console.log("\n== Acumulacion ==");
let stats = applyDeltas(applyDeltas({}, zafo), cayo);
check("acumula rondas como impostor", stats[imp].roundsAsImpostor === 2);
check("acumula victorias de impostor", stats[imp].impostorWins === 1);
check("acumula puntos", stats[imp].points === POINTS_IMPOSTOR_ESCAPES);
check("el ranking ordena por puntos", rankPlayers(players, stats)[0].points === POINTS_IMPOSTOR_ESCAPES);

rmSync(tmp, { recursive: true, force: true });

console.log(`\n${"=".repeat(52)}`);
console.log(`${ok} checks OK, ${fails.length} fallaron`);
if (fails.length) {
  fails.forEach((f) => console.log(`  FAIL ${f}`));
  process.exitCode = 1;
}
