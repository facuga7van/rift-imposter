/**
 * Genera src/data/champions.ts desde Data Dragon (CDN oficial de Riot).
 *
 * Se corre a mano cuando sale un campeon nuevo:  npm run champions
 *
 * Baja las dos locales porque los datos SI cambian entre idiomas: los 173
 * titulos estan traducidos ("the Darkin Blade" / "la Espada Darkin") y 3
 * nombres tambien (Bard/Bardo, Master Yi/Maestro Yi, Nunu & Willump/y Willump).
 *
 * Por que no hacer fetch en runtime: la lista cambia ~6 veces por año. Bajarla
 * en cada carga son cientos de kb de JSON y un punto de falla que no necesitamos.
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const LOCALES = { en: "en_US", es: "es_MX" };
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "champions.ts");

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} en ${url}`);
  return res.json();
}

const versions = await getJson("https://ddragon.leagueoflegends.com/api/versions.json");
const version = versions[0];
console.log(`Data Dragon ${version}`);

const sets = {};
for (const [lang, locale] of Object.entries(LOCALES)) {
  const { data } = await getJson(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/${locale}/champion.json`,
  );
  sets[lang] = new Map(Object.values(data).map((c) => [c.id, c]));
  console.log(`  ${locale}: ${sets[lang].size} campeones`);
}

const ids = [...sets.en.keys()];
for (const [lang, set] of Object.entries(sets)) {
  const missing = ids.filter((id) => !set.has(id));
  if (missing.length) throw new Error(`${lang} no tiene: ${missing.join(", ")}`);
}

const champions = ids
  .map((id) => ({
    id,
    tags: sets.en.get(id).tags,
    name: { en: sets.en.get(id).name, es: sets.es.get(id).name },
    title: { en: sets.en.get(id).title, es: sets.es.get(id).title },
  }))
  .sort((a, b) => a.name.en.localeCompare(b.name.en, "en"));

const roles = [...new Set(champions.flatMap((c) => c.tags))].sort();

const file = `// GENERADO por scripts/fetch-champions.mjs — no editar a mano.
// Data Dragon ${version} · ${champions.length} campeones · en_US + es_MX
// Para actualizar tras un campeon nuevo:  npm run champions

import type { Lang } from "@/lib/i18n";

export const DDRAGON_VERSION = ${JSON.stringify(version)};

/** Tags de rol tal como los publica Riot. */
export type Role = ${roles.map((r) => JSON.stringify(r)).join(" | ")};

export type Champion = {
  /** Clave de Data Dragon, tambien usada para las imagenes (ej. "MonkeyKing"). */
  id: string;
  tags: Role[];
  name: Record<Lang, string>;
  title: Record<Lang, string>;
};

export const CHAMPIONS: Champion[] = ${JSON.stringify(champions, null, 2)};

/** Retrato cuadrado 120x120. Liviano, para grillas. */
export function championIcon(id: string): string {
  return \`https://ddragon.leagueoflegends.com/cdn/\${DDRAGON_VERSION}/img/champion/\${id}.png\`;
}

/** Ilustracion vertical 308x560. Para la carta de revelacion. */
export function championArt(id: string): string {
  return \`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/\${id}_0.jpg\`;
}
`;

await writeFile(OUT, file, "utf8");
console.log(`${champions.length} campeones -> src/data/champions.ts`);
console.log(`Roles: ${roles.join(", ")}`);
