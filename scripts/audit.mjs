/**
 * Auditoria de layout: recorre el juego entero en los dos idiomas, en varias
 * resoluciones y con dos niveles de zoom, y reporta desbordes.
 *
 * Que busca, y por que:
 *  - `page-h-scroll`: la pagina scrollea de costado. En un juego que se pasa de
 *    mano es lo peor que puede pasar.
 *  - `out-of-viewport`: un elemento se sale de la pantalla.
 *  - `clipped-x` / `clipped-y`: un contenedor con `overflow: hidden` esta
 *    cortando su contenido. Aca es donde aparece el español ocupando 20% mas.
 *
 * Uso:  node scripts/audit.mjs            (contra el dev server)
 *       E2E_BASE=https://... node scripts/audit.mjs
 *       SHOTS=1 node scripts/audit.mjs    (ademas guarda capturas)
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const OUT = process.env.SHOTS_DIR ?? "D:/tmp/rift-shots";
const WANT_SHOTS = process.env.SHOTS === "1" || process.argv.includes("--shots");

/** Resoluciones reales, de la mas hostil a la mas comoda. */
const VIEWPORTS = [
  { name: "320x568", width: 320, height: 568, mobile: true }, // iPhone SE 1
  { name: "360x640", width: 360, height: 640, mobile: true }, // Android base
  { name: "375x667", width: 375, height: 667, mobile: true }, // iPhone SE 2/3
  { name: "390x844", width: 390, height: 844, mobile: true }, // referencia
  { name: "414x896", width: 414, height: 896, mobile: true },
  { name: "768x1024", width: 768, height: 1024, mobile: false }, // tablet
  { name: "1280x800", width: 1280, height: 800, mobile: false },
  { name: "1920x1080", width: 1920, height: 1080, mobile: false },
];

/** Zoom de texto: el usuario del navegador con la fuente en 125%. Es mas duro
 *  que el zoom de pagina porque el layout NO se achica con el. */
const ZOOMS = [
  { name: "100", rootPx: 16 },
  { name: "125", rootPx: 20 },
];

const T = {
  en: {
    path: "",
    nameLabel: (n) => `Name of player ${n}`,
    add: "+ Add player",
    start: "Deal the cards",
    view: "See my card",
    impostor: "You're the impostor",
    next: /^(Hide and pass to|Done, let's start)/,
    cluesDone: "Clues are done, let's vote",
    reveal: "Reveal",
    tie: "It's a tie, nobody goes out",
    scores: "See the scores",
    rules: "Rules",
  },
  es: {
    path: "/es",
    nameLabel: (n) => `Nombre del jugador ${n}`,
    add: "+ Agregar jugador",
    start: "Repartir cartas",
    view: "Ver mi carta",
    impostor: "Sos el impostor",
    next: /^(Ocultar y pasar a|Listo, empezamos)/,
    cluesDone: "Terminamos las pistas, a votar",
    reveal: "Revelar",
    tie: "Hubo empate, no echamos a nadie",
    scores: "Ver la tabla",
    rules: "Reglas",
  },
};

/** Nombres largos a proposito: 16 caracteres es el maximo que acepta la app. */
const LONG = ["Maximilianoooooo", "Guadalupeeeeeeee", "Bartolomeeeeeeee", "Wenceslaoooooooo"];
const SHORT = ["Ana", "Beto", "Cami", "Dani", "Eze"];

const findProblems = () => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  const label = (el) => {
    const cls = typeof el.className === "string" ? el.className : "";
    const txt = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 44);
    return `${el.tagName.toLowerCase()}${cls ? `.${cls.split(/\s+/)[0]}` : ""} «${txt}»`;
  };

  if (document.documentElement.scrollWidth > vw + 1) {
    out.push({ kind: "page-h-scroll", what: `scrollWidth ${document.documentElement.scrollWidth} > ${vw}` });
  }

  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
    if (cs.position === "fixed") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) continue;
    // El halo y el brillo desbordan por diseño: son adorno, no contenido.
    const cls = typeof el.className === "string" ? el.className : "";
    // srOnly esta recortado a proposito (1x1 px); halo y shine desbordan por
    // diseño. Son adorno o accesibilidad, no contenido que se pueda cortar.
    if (/halo|shine|Scrim|progress|srOnly/i.test(cls)) continue;

    if (r.right > vw + 1 || r.left < -1) {
      out.push({ kind: "out-of-viewport", what: label(el), left: Math.round(r.left), right: Math.round(r.right), vw });
    }

    // Un <input> siempre "recorta": su valor scrollea adentro del campo. No es
    // un corte de layout, es como funciona el control.
    if (el.tagName === "INPUT") continue;
    // Ni un contenedor que recorta un adorno absoluto: el brillo del CTA se
    // desplaza a proposito mas alla del borde y el boton lo tapa. Eso es el
    // efecto, no un texto cortado.
    if (el.querySelector('[class*="shine"], [class*="halo"], [class*="Scrim"]')) continue;

    const clipsX = cs.overflowX === "hidden" || cs.overflowX === "clip";
    const clipsY = cs.overflowY === "hidden" || cs.overflowY === "clip";
    if (clipsX && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
      out.push({ kind: "clipped-x", what: label(el), scroll: el.scrollWidth, client: el.clientWidth });
    }
    if (clipsY && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 1) {
      out.push({ kind: "clipped-y", what: label(el), scroll: el.scrollHeight, client: el.clientHeight });
    }
  }
  return out;
};

// Filtros para iterar rapido: ONLY_VP=390x844 ONLY_LANG=es ONLY_ZOOM=100
const onlyVp = process.env.ONLY_VP?.split(",");
const onlyLang = process.env.ONLY_LANG?.split(",");
const onlyZoom = process.env.ONLY_ZOOM?.split(",");

const run = async () => {
  if (WANT_SHOTS) await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const report = [];
  let failures = 0;

  for (const lang of ["en", "es"]) {
    if (onlyLang && !onlyLang.includes(lang)) continue;
    const t = T[lang];
    for (const vp of VIEWPORTS) {
      if (onlyVp && !onlyVp.includes(vp.name)) continue;
      for (const zoom of ZOOMS) {
        if (onlyZoom && !onlyZoom.includes(zoom.name)) continue;
        const tag = `${lang} ${vp.name} @${zoom.name}%`;
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
          isMobile: vp.mobile,
          hasTouch: vp.mobile,
          // Con movimiento REAL, no `reduce`: las animaciones de entrada
          // escalan y desplazan, y un desborde transitorio hace scrollear la
          // pagina sola. Se mide despues de que terminen (ver `check`).
        });
        const page = await ctx.newPage();
        await page.addInitScript((px) => {
          document.addEventListener("DOMContentLoaded", () => {
            document.documentElement.style.fontSize = `${px}px`;
          });
        }, zoom.rootPx);

        const check = async (screen) => {
          await page.waitForTimeout(650); // que terminen las entradas
          const problems = await page.evaluate(findProblems);
          if (problems.length) {
            failures += problems.length;
            report.push({ tag, screen, problems });
          }
          // Sin foco y desde arriba: si no, la captura sale con la pagina
          // scrolleada por el ultimo `fill` y no se ve el titular.
          if (WANT_SHOTS) {
            await page.evaluate((toRules) => {
              document.activeElement?.blur?.();
              if (toRules) document.querySelector("#rules")?.scrollIntoView();
              else window.scrollTo(0, 0);
            }, screen === "09-rules");
            await page.waitForTimeout(250);
          }
          if (WANT_SHOTS && lang === "es" && vp.name === "390x844" && zoom.name === "100") {
            await page.screenshot({ path: `${OUT}/${screen}.png` });
          }
          if (WANT_SHOTS && lang === "en" && vp.name === "1280x800" && zoom.name === "100") {
            await page.screenshot({ path: `${OUT}/desktop-${screen}.png` });
          }
        };

        try {
          await page.goto(`${BASE}${t.path}`, { waitUntil: "networkidle" });
          // Arranca limpio: sin partida guardada de la corrida anterior.
          await page.evaluate(() => localStorage.clear());
          await page.reload({ waitUntil: "networkidle" });

          // 10 jugadores con nombres largos: el peor caso de la lista.
          for (let i = 0; i < 6; i++) await page.getByRole("button", { name: t.add }).click();
          for (let i = 0; i < 10; i++) {
            await page.getByLabel(t.nameLabel(i + 1), { exact: true }).fill(LONG[i % LONG.length]);
          }
          await check("01-setup-max");

          // Y de nuevo con 5 y nombres cortos, que es el caso real.
          for (let i = 0; i < 5; i++) {
            await page.getByRole("button", { name: /^(Remove|Sacar a) / }).last().click();
          }
          for (let i = 0; i < 5; i++) await page.getByLabel(t.nameLabel(i + 1), { exact: true }).fill(SHORT[i]);
          await check("01-setup");

          await page.getByRole("button", { name: t.start }).click();
          await check("02-pass");

          let sawImpostor = false;
          let sawChampion = false;
          let impostorName = null;
          for (let i = 0; i < 5; i++) {
            await page.getByRole("button", { name: t.view }).click();
            const isImpostor = (await page.getByText(t.impostor).count()) > 0;
            if (isImpostor) {
              impostorName = SHORT[i];
              if (!sawImpostor) {
                await check("04-card-impostor");
                sawImpostor = true;
              }
            } else if (!sawChampion) {
              await page
                .locator("img")
                .first()
                .evaluate((el) =>
                  el.complete ? true : new Promise((r) => el.addEventListener("load", r, { once: true })),
                )
                .catch(() => {});
              await check("03-card-champion");
              sawChampion = true;
            }
            await page.getByRole("button", { name: t.next }).click();
          }

          await check("05-clues");
          await page.getByRole("button", { name: t.cluesDone }).click();
          await check("06-vote");

          await page.getByRole("radio", { name: impostorName, exact: false }).first().click();
          await check("06-vote-picked");
          await page.getByRole("button", { name: t.reveal }).click();
          // Muestreo DURANTE la animacion de la banda. El resto de la auditoria
          // corre con `reduced-motion`, asi que un desborde transitorio por un
          // `transform: scale` no lo ve nadie: el titular entra escalado a 1.18
          // y sin recortar empuja el ancho del documento.
          for (let f = 0; f < 24; f++) {
            const w = await page.evaluate(() => document.documentElement.scrollWidth);
            if (w > vp.width + 1) {
              failures += 1;
              report.push({
                tag,
                screen: "07-reveal (animando)",
                problems: [{ kind: "page-h-scroll", what: `scrollWidth ${w} > ${vp.width} durante la animacion` }],
              });
              break;
            }
            await page.waitForTimeout(25);
          }
          await page
            .locator("img")
            .first()
            .evaluate((el) =>
              el.complete ? true : new Promise((r) => el.addEventListener("load", r, { once: true })),
            )
            .catch(() => {});
          await check("07-reveal-caught");

          await page.getByRole("button", { name: t.scores }).click();
          await check("08-scores");

          // Reglas: se llega scrolleando, no es modal.
          await page.evaluate(() => document.querySelector("#rules")?.scrollIntoView());
          await check("09-rules");
        } catch (e) {
          failures += 1;
          report.push({ tag, screen: "FLOW", problems: [{ kind: "error", what: e.message }] });
        }

        await ctx.close();
      }
    }
  }

  await browser.close();

  if (!report.length) {
    console.log("Sin desbordes en ninguna combinacion.");
  } else {
    for (const r of report) {
      console.log(`\n[${r.tag}] ${r.screen}`);
      const seen = new Set();
      for (const p of r.problems) {
        const key = `${p.kind}|${p.what}`;
        if (seen.has(key)) continue;
        seen.add(key);
        console.log(`  ${p.kind}: ${p.what}${p.scroll ? ` (${p.scroll} vs ${p.client})` : ""}`);
      }
    }
    console.log(`\n${failures} problemas en ${report.length} pantallas.`);
  }

  await writeFile("D:/tmp/rift-audit.json", JSON.stringify(report, null, 2));
  process.exitCode = report.length ? 1 : 0;
};

run().catch((e) => {
  console.error("fallo:", e);
  process.exitCode = 1;
});
