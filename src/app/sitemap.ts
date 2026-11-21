import type { MetadataRoute } from "next";
import { LANGS, ONLINE_PATH, pathFor, type Lang } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

// Requerido por `output: export`. Es estatico igual en el build de Vercel.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const abs = (path: string) => new URL(path, SITE_URL).toString();

  // Cada idioma entra como URL propia y ademas se declara como alternativa de
  // la otra. Es la misma señal que el hreflang del <head>, por duplicado.
  const page = (paths: Record<Lang, string>, priority: Record<Lang, number>) =>
    LANGS.map((lang) => ({
      url: abs(paths[lang]),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: priority[lang],
      alternates: { languages: Object.fromEntries(LANGS.map((l) => [l, abs(paths[l])])) },
    }));

  return [
    ...page({ en: pathFor("en"), es: pathFor("es") }, { en: 1, es: 0.9 }),
    ...page(ONLINE_PATH, { en: 0.8, es: 0.7 }),
  ];
}
