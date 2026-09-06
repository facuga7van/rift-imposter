/**
 * E2E del juego completo con Playwright, contra el build de produccion (out/).
 *
 *   npm run serve:out &
 *   npm run test:e2e
 *   E2E_BASE=https://rift-impostor.vercel.app npm run test:e2e
 *
 * Correrlo tambien contra el deploy real, no solo contra localhost: asi
 * aparecio que `crypto.randomUUID()` no existe sirviendo por HTTP plano.
 *
 * Esto prueba REGLAS Y FLUJO. El layout (desbordes, idiomas, resoluciones,
 * zoom) lo prueba `scripts/audit.mjs`, que es otra cosa y corre aparte.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.E2E_BASE ?? "http://127.0.0.1:4321";
const SHOTS = "D:/tmp/shots";
const NAMES = ["Ana", "Beto", "Cami", "Dani", "Eze"];

const ESCAPES = 3; // puntos del impostor cuando zafa
const CATCH = 1; // puntos de cada inocente cuando lo agarran
const CLASSES = ["assassin", "fighter", "mage", "marksman", "support", "tank"];

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

const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png` });

/** Elige a quien echar y confirma. Votar son dos toques desde el rediseño: el
 *  telefono se pasa de mano y un toque al aire mandaba la ronda al carajo. */
async function voteFor(page, name) {
  if (name === null) {
    await page.getByRole("button", { name: "It's a tie, nobody goes out" }).click();
  } else {
    await page.getByRole("radio", { name, exact: true }).click();
  }
  await page.getByRole("button", { name: "Reveal" }).click();
}

/** Reparte a los N jugadores y devuelve quien fue impostor y cual el campeon. */
async function dealAll(page, count, { roleHint = true } = {}) {
  const seenImpostor = [];
  const secrets = new Set();
  const categories = new Set();

  for (let i = 0; i < count; i++) {
    await page.getByRole("button", { name: "See my card" }).click();

    const isImpostor = (await page.getByText("You're the impostor").count()) > 0;

    if (isImpostor) {
      seenImpostor.push(NAMES[i]);
      check(
        `la carta de impostor de ${NAMES[i]} no muestra ningun campeon`,
        (await page.locator("main img").count()) === 0,
      );
      check(
        `el texto del impostor coincide con el modo (pista: ${roleHint})`,
        (await page.getByText(/don't even know the class/).count()) === (roleHint ? 0 : 1),
      );
      // La clase vive SOLO en la carta del impostor. El inocente ve al campeon,
      // asi que ya la sabe; repetirsela era regalarsela tambien al de al lado.
      if (roleHint) {
        const cat = await page.getByText(/^The champion is a /).innerText();
        categories.add(cat.replace("The champion is a ", "").trim());
      } else {
        check(
          "sin pista, la carta del impostor no dice la clase",
          (await page.getByText(/^The champion is a /).count()) === 0,
        );
      }
    } else {
      check(
        `la carta de ${NAMES[i]} (inocente) no repite la clase`,
        (await page.getByText(/^The champion is a /).count()) === 0,
      );
      const art = page.locator("main img").first();
      secrets.add(await art.getAttribute("alt"));
      const ok = await art
        .evaluate((el) =>
          el.complete && el.naturalWidth > 0
            ? true
            : new Promise((res) => {
                el.addEventListener("load", () => res(true), { once: true });
                el.addEventListener("error", () => res(false), { once: true });
                setTimeout(() => res(el.complete && el.naturalWidth > 0), 15000);
              }),
        )
        .catch(() => false);
      check(`carta de ${NAMES[i]}: la ilustracion del campeon cargo`, ok);
    }

    if (i === 0) await shot(page, isImpostor ? "card-impostor" : "card-champion");

    await page.getByRole("button", { name: /^(Hide and pass to|Done, let's start)/ }).click();
  }

  check("exactamente 1 impostor por ronda", seenImpostor.length === 1, `vi ${seenImpostor.length}`);
  check("todos los inocentes ven el MISMO campeon", secrets.size === 1, `vi ${secrets.size} distintos`);
  if (roleHint) {
    check("la clase es una de las seis reales", CLASSES.includes([...categories][0]), [...categories][0]);
  }

  return { impostor: seenImpostor[0], secret: [...secrets][0], role: [...categories][0] };
}

async function readDeltas(page) {
  const rows = await page.locator("main ul li").allInnerTexts();
  return Object.fromEntries(
    rows.map((r) => {
      const parts = r.split("\n").map((s) => s.trim()).filter(Boolean);
      return [parts[0], Number(parts[parts.length - 1])];
    }),
  );
}

const run = async () => {
  await mkdir(SHOTS, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

  // ---------------------------------------------------------------- setup
  console.log("\n== Setup ==");
  await page.goto(BASE, { waitUntil: "networkidle" });
  check("el titulo es el correcto", (await page.title()).startsWith("Rift Impostor"));
  // El h1 es el unico del documento y esta en el HTML estatico: el titular a la
  // vista cambia con la fase, asi que no puede ser el.
  const h1 = page.getByRole("heading", { level: 1 });
  check("hay exactamente un h1", (await h1.count()) === 1);
  check("el h1 nombra el juego", (await h1.innerText()).startsWith("Rift Impostor"));
  check("arranca con 4 jugadores", (await page.locator("main input").count()) === 4);

  for (let i = 0; i < 4; i++) await page.getByLabel(`Name of player ${i + 1}`, { exact: true }).fill(NAMES[i]);
  await page.getByRole("button", { name: "+ Add player" }).click();
  check("agregar jugador suma un input", (await page.locator("main input").count()) === 5);
  await page.getByLabel("Name of player 5", { exact: true }).fill(NAMES[4]);
  check("hay un boton de sacar por jugador", (await page.locator("main button[aria-label^='Remove']").count()) === 5);

  const toggle = page.getByRole("switch");
  check("hay un switch para la pista de clase", (await toggle.count()) === 1);
  check("viene prendido de fabrica", (await toggle.getAttribute("aria-checked")) === "true");
  await shot(page, "setup");

  // ------------------------------------------- ronda 1: acusan a un inocente
  console.log("\n== Ronda 1: acusan a un inocente ==");
  await page.getByRole("button", { name: "Deal the cards" }).click();
  const r1 = await dealAll(page, 5);

  check("la pantalla de pistas NO muestra ninguna grilla de campeones", (await page.locator("main img").count()) === 0);
  check("la pantalla de pistas no filtra la clase", (await page.getByText(/^The champion is a /).count()) === 0);
  check("el orden de pistas lista a los 5", (await page.locator("main ol li").count()) === 5);
  await shot(page, "clues");

  await page.getByRole("button", { name: "Clues are done, let's vote" }).click();
  await shot(page, "vote");
  check(
    "no se puede revelar sin haber elegido",
    await page.getByRole("button", { name: "Reveal" }).isDisabled(),
  );
  await voteFor(page, NAMES.find((n) => n !== r1.impostor));

  check("titular = el impostor zafo", await page.getByText("The impostor got away").isVisible());
  check("el resultado muestra el campeon que era", await page.getByText(r1.secret, { exact: false }).first().isVisible());
  check("el resultado muestra la clase que vio el impostor", await page.getByText(r1.role, { exact: false }).first().isVisible());
  let d = await readDeltas(page);
  check(`el impostor (${r1.impostor}) se lleva ${ESCAPES}`, d[r1.impostor] === ESCAPES, JSON.stringify(d));
  check("el resto no suma nada", NAMES.filter((n) => n !== r1.impostor).every((n) => d[n] === 0), JSON.stringify(d));
  await shot(page, "reveal-escaped");

  // ------------------------------------------------------ ronda 2: empate
  console.log("\n== Ronda 2: empate ==");
  await page.getByRole("button", { name: "Next round" }).click();
  const r2 = await dealAll(page, 5);
  await page.getByRole("button", { name: "Clues are done, let's vote" }).click();
  await voteFor(page, null);

  check("el empate deja zafar al impostor", await page.getByText("The impostor got away").isVisible());
  d = await readDeltas(page);
  check(`el impostor (${r2.impostor}) se lleva ${ESCAPES} por empate`, d[r2.impostor] === ESCAPES, JSON.stringify(d));

  // ------------------------------------------------- ronda 3: lo agarran
  console.log("\n== Ronda 3: lo agarran ==");
  await page.getByRole("button", { name: "Next round" }).click();
  const r3 = await dealAll(page, 5);
  await page.getByRole("button", { name: "Clues are done, let's vote" }).click();
  await voteFor(page, r3.impostor);

  check("titular = cayo el impostor", await page.getByText("The impostor went down").isVisible());
  check("acusar bien ya NO abre una pantalla de adivinar", (await page.getByText(/they got you/).count()) === 0);
  d = await readDeltas(page);
  check(`el impostor (${r3.impostor}) no suma`, d[r3.impostor] === 0, JSON.stringify(d));
  check(`cada inocente se lleva ${CATCH}`, NAMES.filter((n) => n !== r3.impostor).every((n) => d[n] === CATCH), JSON.stringify(d));
  await shot(page, "reveal-caught");

  // ------------------------------------------------------------- tabla
  console.log("\n== Tabla ==");
  await page.getByRole("button", { name: "See the scores" }).click();
  const rows = page.locator("main table tbody tr");
  check("la tabla lista a los 5 jugadores", (await rows.count()) === 5);
  check("aparece el mejor impostor", await page.getByText("Best impostor").isVisible());

  const table = [];
  for (let i = 0; i < (await rows.count()); i++) {
    const cells = await rows.nth(i).locator("td").allInnerTexts();
    // Columnas: #, jugador, impostor (g/j), puntos.
    const [wins, played] = cells[2].trim().split("/").map(Number);
    table.push({ name: cells[1].trim(), wins, played, points: Number(cells[3].trim()) });
  }
  console.log("      tabla:", JSON.stringify(table));

  check("se contabilizaron las 3 rondas de impostor", table.reduce((a, r) => a + r.played, 0) === 3);
  check("2 de esas 3 las gano el impostor", table.reduce((a, r) => a + r.wins, 0) === 2);
  check(
    "los puntos de la tabla cierran con los de las rondas",
    table.reduce((a, r) => a + r.points, 0) === ESCAPES * 2 + CATCH * 4,
    JSON.stringify(table),
  );
  check("la tabla dice cuantas rondas se jugaron", await page.getByText(/3 rounds played/).isVisible());
  await shot(page, "scores");

  // El reset pide dos toques y no abre ningun modal.
  await page.getByRole("button", { name: "Reset the game" }).click();
  check("el primer toque pide confirmacion", await page.getByRole("button", { name: "Sure? Tap again" }).isVisible());
  check("un solo toque NO borro nada", (await rows.count()) === 5);

  // ------------------------------------------- ronda 4: SIN pista de clase
  console.log("\n== Ronda 4: sin pista de clase (modo dificil) ==");
  await page.getByRole("button", { name: "Back to the game" }).click();
  await page.getByRole("button", { name: "Play" }).click();
  await toggle.click();
  check("el switch queda apagado", (await toggle.getAttribute("aria-checked")) === "false");
  check("el texto del switch cambia a modo dificil", await page.getByText(/Hard mode/).isVisible());

  await page.getByRole("button", { name: "Deal the cards" }).click();
  const r4 = await dealAll(page, 5, { roleHint: false });
  check(
    "sin pista, la pantalla de pistas tampoco muestra la clase",
    (await page.getByText(/^The champion is a /).count()) === 0,
  );
  await shot(page, "clues-no-hint");

  await page.getByRole("button", { name: "Clues are done, let's vote" }).click();
  await voteFor(page, r4.impostor);
  check("el modo dificil puntua igual", (await readDeltas(page))[r4.impostor] === 0);

  // El ajuste tiene que sobrevivir al refresco, no solo a la ronda.
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Play" }).click();
  check(
    "el ajuste sobrevive al refresco",
    (await page.getByRole("switch").getAttribute("aria-checked")) === "false",
  );
  await page.getByRole("switch").click(); // lo dejamos como estaba

  // -------------------------------------------------- persistencia y idioma
  console.log("\n== Persistencia e idioma ==");
  await page.getByRole("button", { name: "Deal the cards" }).click();
  await page.getByRole("button", { name: "See my card" }).click();
  await page.getByRole("button", { name: /^(Hide and pass to|Done, let's start)/ }).click();

  await page.reload({ waitUntil: "networkidle" });
  check("refrescar en el medio no pierde la partida", (await page.getByRole("button", { name: "See my card" }).count()) > 0);

  // Durante el reparto la barra superior desaparece a proposito: es el momento
  // en que la pantalla no tiene que invitar a tocar nada mas que la carta. Para
  // cambiar de idioma hay que terminar la vuelta.
  check(
    "el reparto esconde la navegacion",
    (await page.getByRole("link", { name: "Switch to Spanish" }).count()) === 0,
  );
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: "See my card" }).click();
    await page.getByRole("button", { name: /^(Hide and pass to|Done, let's start)/ }).click();
  }

  // Esperar a que la ronda de pistas este en pantalla antes de navegar. El
  // estado se persiste en un efecto, asi que clickear el idioma en el mismo
  // milisegundo que se termina el reparto es carrerear contra React, no probar
  // nada: un humano no cambia de idioma antes del primer frame.
  await page.getByRole("button", { name: "Clues are done, let's vote" }).waitFor();

  await page.getByRole("link", { name: "Switch to Spanish" }).click();
  await page.waitForURL("**/es");
  check("el link de idioma navega a /es", page.url().endsWith("/es"));
  check("el <html lang> cambio a es", (await page.locator("html").getAttribute("lang")) === "es");
  // Cambiar de idioma es navegacion dura: del otro lado la app vuelve a
  // hidratar y a leer localStorage antes de saber en que fase quedo. Sin
  // esperar eso medimos la pantalla de carga, no la partida.
  const esClues = page.getByRole("button", { name: "Terminamos las pistas, a votar" });
  await esClues.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  check("la partida sobrevivio al cambio de idioma", await esClues.isVisible());
  await shot(page, "es-midgame");

  await page.getByRole("link", { name: "Cambiar a inglés" }).click();
  await page.waitForURL(`${BASE}/`);
  check("vuelve a ingles", (await page.locator("html").getAttribute("lang")) === "en");

  // --------------------------------------------------------- layout mobile
  console.log("\n== Layout mobile (390px) ==");
  const overflow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    inner: window.innerWidth,
  }));
  check("sin scroll horizontal", overflow.scroll <= overflow.inner, JSON.stringify(overflow));

  // ------------------------------------------------------------- consola
  console.log("\n== Consola ==");
  // Sin excepciones para 404: un recurso que no existe es un bug hasta que se
  // demuestre lo contrario. Asi aparecio el prefetch RSC roto de Next 16.
  const real = consoleErrors.filter((e) => !/favicon/i.test(e));
  check("sin errores de JS, hidratacion ni recursos 404", real.length === 0, real.slice(0, 3).join(" | "));

  await browser.close();

  console.log(`\n${"=".repeat(52)}`);
  console.log(`${passed} checks OK, ${failures.length} fallaron`);
  if (failures.length) {
    failures.forEach((f) => console.log(`  FAIL ${f}`));
    process.exitCode = 1;
  }
};

run().catch((e) => {
  console.error("\nEl E2E se cayo:", e.message);
  process.exitCode = 1;
});
