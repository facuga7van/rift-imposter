/**
 * E2E del modo online: 3 jugadores, cada uno en su propio contexto de navegador.
 *
 *   npx wrangler dev --port 8787        (salas)
 *   npx next dev --port 3000            (con NEXT_PUBLIC_ROOMS_ORIGIN=http://localhost:8787 en .env.local)
 *   npm run test:e2e:online
 *   E2E_BASE=https://rift.wampaland.com.ar npm run test:e2e:online
 *
 * Correrlo tambien contra el deploy real: ahi el Worker y los assets comparten
 * origen y aparecen cosas que en local no (dominio, TLS, hibernacion real).
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const SHOTS = "D:/tmp/shots-online";
/** Espera por pantalla: cada cambio viaja por red ida y vuelta. */
const T = 15_000;

let passed = 0;
const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  OK   ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Un "dispositivo": contexto propio (localStorage propio) y la pagina abierta. */
async function device(browser, name) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const d = { name, context, page: null, errors: [] };
  d.open = async (url) => {
    d.page = await context.newPage();
    d.page.on("console", (m) => m.type() === "error" && d.errors.push(`${name}: ${m.text()}`));
    d.page.on("pageerror", (e) => d.errors.push(`${name}: pageerror ${e.message}`));
    await d.page.goto(url, { waitUntil: "domcontentloaded" });
  };
  return d;
}

const button = (page, name) => page.getByRole("button", { name, exact: true });
const appears = (locator) => locator.first().waitFor({ timeout: T }).then(() => true, () => false);

async function enter(d, url) {
  await d.open(url);
  await d.page.getByLabel("Your name", { exact: true }).fill(d.name);
  await button(d.page, "Enter the room").click();
}

/** Mira la carta propia. Devuelve "impostor" o el nombre del campeon. */
async function lookAtCard(page) {
  await button(page, "See my card").click();
  const impostor = page.getByText("You're the impostor");
  await page.locator("main img").or(impostor).first().waitFor({ timeout: T });
  if ((await impostor.count()) > 0) return "impostor";
  return page.locator("main img").first().getAttribute("alt");
}

/** Filas de puntos del reveal. El nombre trae " · N votes" en el modo online. */
async function readDeltas(page) {
  const rows = await page.locator("main ul li").allInnerTexts();
  return Object.fromEntries(
    rows.map((r) => {
      const parts = r.split("\n").map((s) => s.trim()).filter(Boolean);
      return [parts[0].split(" · ")[0], Number(parts[parts.length - 1])];
    }),
  );
}

const run = async () => {
  await mkdir(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const ana = await device(browser, "Ana");
  const beto = await device(browser, "Beto");
  const cami = await device(browser, "Cami");
  const all = [ana, beto, cami];
  const seats = (d, connected) =>
    d.page.locator(connected === undefined ? "[data-seat]" : `[data-seat][data-connected="${connected}"]`);

  // --------------------------------------------------------- crear y unirse
  console.log("\n== Crear y unirse ==");
  await ana.open(`${BASE}/play`);
  await button(ana.page, "Create a room").click();
  await ana.page.waitForURL(/\?c=[2-9A-Z]{4}$/, { timeout: T });
  const code = new URL(ana.page.url()).searchParams.get("c");
  check(`la sala tiene un codigo valido (${code})`, /^[2-9A-HJKMNP-Z]{4}$/.test(code));
  await ana.page.getByLabel("Your name", { exact: true }).fill("Ana");
  await button(ana.page, "Enter the room").click();
  check("el anfitrion ve el lobby", await appears(button(ana.page, "Start the game")));

  for (const d of [beto, cami]) await enter(d, `${BASE}/play?c=${code}`);
  await seats(ana, true).nth(2).waitFor({ timeout: T });
  check("el lobby muestra a los 3 conectados", (await seats(ana, true).count()) === 3);
  check("solo el anfitrion ve Empezar", (await button(beto.page, "Start the game").count()) === 0);
  await ana.page.screenshot({ path: `${SHOTS}/lobby.png` });

  // ----------------------------------------- desconectar y reconectar en lobby
  console.log("\n== Desconectar y reconectar ==");
  await cami.page.close();
  check("el lobby marca a Cami desconectada", await appears(seats(ana, false)));
  check("con 2 conectados no se puede empezar", await button(ana.page, "Start the game").isDisabled());
  // Mismo contexto = mismo token en localStorage: vuelve a su asiento sin pedir nombre.
  await cami.open(`${BASE}/play?c=${code}`);
  await seats(ana, true).nth(2).waitFor({ timeout: T });
  check("Cami vuelve a su asiento, sin duplicarse", (await seats(ana).count()) === 3);
  check("y sin que le pidan el nombre", (await cami.page.getByLabel("Your name", { exact: true }).count()) === 0);

  // ------------------------------------------------------------ ronda 1
  console.log("\n== Ronda 1 ==");
  await button(ana.page, "Start the game").click();
  const cards = {};
  for (const d of all) {
    cards[d.name] = await lookAtCard(d.page);
    await button(d.page, "I've seen it").click();
  }
  const impostor = Object.keys(cards).find((n) => cards[n] === "impostor");
  const crew = all.filter((d) => d.name !== impostor);
  check("exactamente 1 impostor", Object.values(cards).filter((c) => c === "impostor").length === 1, JSON.stringify(cards));
  check("los inocentes ven el mismo campeon", new Set(crew.map((d) => cards[d.name])).size === 1, JSON.stringify(cards));
  check("el anfitrion ve el conteo de listos", await appears(ana.page.getByText("3 of 3 ready")));

  await button(ana.page, "Go to clues").click();
  for (const d of all) await d.page.locator("main ol li").nth(2).waitFor({ timeout: T });
  check("todos ven el orden de pistas con 3", (await beto.page.locator("main ol li").count()) === 3);
  check(
    "solo el anfitrion puede pasar a votar",
    (await button(beto.page, "Clues are done, let's vote").count()) === 0,
  );
  await button(ana.page, "Clues are done, let's vote").click();

  for (const d of all) {
    await d.page.getByRole("radiogroup").waitFor({ timeout: T });
    check(
      `${d.name} no se ve entre los candidatos`,
      (await d.page.getByRole("radio", { name: d.name, exact: true }).count()) === 0,
    );
  }
  await beto.page.screenshot({ path: `${SHOTS}/vote.png` });
  for (const d of all) {
    const target = d.name === impostor ? crew[0].name : impostor;
    await d.page.getByRole("radio", { name: target, exact: true }).click();
    await button(d.page, "Send my vote").click();
  }
  for (const d of all) {
    check(`${d.name} ve que cayo el impostor`, await appears(d.page.getByText("The impostor went down")));
  }
  const deltas = await readDeltas(ana.page);
  check("el impostor no suma", deltas[impostor] === 0, JSON.stringify(deltas));
  check("cada inocente suma 1", crew.every((d) => deltas[d.name] === 1), JSON.stringify(deltas));
  check("solo el anfitrion ve Siguiente ronda", (await button(cami.page, "Next round").count()) === 0);
  await ana.page.screenshot({ path: `${SHOTS}/reveal.png` });

  // ------------------------------------------ ronda 2: reconectar con ronda
  console.log("\n== Ronda 2: reconectar a mitad de ronda ==");
  await button(ana.page, "Next round").click();
  const before = await lookAtCard(beto.page);
  await beto.page.close();
  await beto.open(`${BASE}/play?c=${code}`);
  const after = await lookAtCard(beto.page);
  check("Beto recupera la misma carta al reconectar", before === after, `${before} / ${after}`);

  // ------------------------------------------------- el anfitrion se va
  console.log("\n== El anfitrion se va ==");
  await button(ana.page, "Leave").click();
  check("Ana vuelve a la entrada", await appears(button(ana.page, "Create a room")));
  // Con 2 participantes la ronda se cancela sola, y el rol pasa sin gracia al mas antiguo.
  check("la ronda se cancela y Beto queda de anfitrion", await appears(button(beto.page, "Start the game")));
  check("Cami no es anfitriona", (await button(cami.page, "Start the game").count()) === 0);
  check("quedan 2 asientos", (await seats(beto).count()) === 2);
  check(
    "sin nombres duplicados",
    !(await seats(beto).allInnerTexts()).some((s) => /Beto 2|Cami 2/.test(s)),
  );
  await beto.page.screenshot({ path: `${SHOTS}/host-left.png` });


  // ------------------------------- el impostor se va durante el reveal
  console.log("\n== El impostor se va en el reveal ==");
  for (const d of all) await d.page.close();
  await ana.open(`${BASE}/play`);
  await button(ana.page, "Create a room").click();
  await ana.page.waitForURL(/\?c=[2-9A-Z]{4}$/, { timeout: T });
  const code2 = new URL(ana.page.url()).searchParams.get("c");
  await ana.page.getByLabel("Your name", { exact: true }).fill("Ana");
  await button(ana.page, "Enter the room").click();
  for (const d of [beto, cami]) await enter(d, `${BASE}/play?c=${code2}`);
  await seats(ana, true).nth(2).waitFor({ timeout: T });
  await button(ana.page, "Start the game").click();
  const cards2 = {};
  for (const d of all) {
    cards2[d.name] = await lookAtCard(d.page);
    await button(d.page, "I've seen it").click();
  }
  const imp2 = Object.keys(cards2).find((n) => cards2[n] === "impostor");
  const crew2 = all.filter((d) => d.name !== imp2);
  await button(ana.page, "Go to clues").click();
  await button(ana.page, "Clues are done, let's vote").click();
  for (const d of all) {
    await d.page.getByRole("radiogroup").waitFor({ timeout: T });
    const target = d.name === imp2 ? crew2[0].name : imp2;
    await d.page.getByRole("radio", { name: target, exact: true }).click();
    await button(d.page, "Send my vote").click();
  }
  for (const d of all) check(`${d.name} llega al reveal (impostor: ${imp2})`, await appears(d.page.getByText("The impostor went down")));
  const impDev = all.find((d) => d.name === imp2);
  const rest = crew2;
  await button(impDev.page, "Leave").click();
  check("el impostor vuelve a la entrada", await appears(button(impDev.page, "Create a room")));
  // Esperar a que el resto vea al impostor retirado: el asiento pasa a gone y la lista de puntos sigue entera.
  await rest[0].page.waitForTimeout(1500);
  for (const d of rest) {
    check(`${d.name} sigue viendo el reveal`, await appears(d.page.getByText("The impostor went down")));
    const rows = await d.page.locator("main ul li").allInnerTexts();
    check(`${d.name} sigue viendo las 3 filas de puntos`, rows.length === 3, JSON.stringify(rows));
    const impRow = rows.find((r) => r.includes("impostor") || r.includes("A player who left"));
    check(`${d.name}: la fila del impostor muestra un nombre o el texto de "se fue"`, Boolean(impRow) && (impRow.includes(imp2) || impRow.includes("A player who left")), JSON.stringify(rows));
  }
  await rest[0].page.screenshot({ path: `${SHOTS}/impostor-left.png` });
  const nextHost = (await appears(button(rest[0].page, "Next round"))) ? rest[0] : rest[1];
  check("alguno de los que quedan puede seguir (Next round)", (await button(nextHost.page, "Next round").count()) === 1);
  await button(nextHost.page, "Next round").click();
  // Quedan 2 conectados: no alcanza para otra ronda, vuelve al lobby.
  check("seguir lleva al lobby con los 2 que quedan", await appears(button(nextHost.page, "Start the game")));
  check("el lobby tiene 2 asientos", (await seats(nextHost).count()) === 2);

  // ------------------------------------------------------------- consola
  console.log("\n== Consola ==");
  const errors = all.flatMap((d) => d.errors).filter((e) => !/favicon/i.test(e));
  check("sin errores de JS", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();

  console.log(`\n${"=".repeat(52)}`);
  console.log(`${passed} checks OK, ${failures.length} fallaron`);
  if (failures.length) {
    failures.forEach((f) => console.log(`  FAIL ${f}`));
    process.exitCode = 1;
  }
};

run().catch((e) => {
  console.error("\nEl E2E online se cayo:", e.message);
  process.exitCode = 1;
});
