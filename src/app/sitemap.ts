import type { MetadataRoute } from "next";
import { LANGS, pathFor } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

// Requerido por `output: export`. Es estatico igual en el build de Vercel.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  // Cada idioma entra como URL propia y ademas se declara como alternativa de
  // la otra. Es la misma señal que el hreflang del <head>, por duplicado: los
  // buscadores leen una u otra.
  const alternates = Object.fromEntries(
    LANGS.map((l) => [l, new URL(pathFor(l), SITE_URL).toString()]),
  );

  return LANGS.map((lang) => ({
    url: new URL(pathFor(lang), SITE_URL).toString(),
    lastModified,
    changeFrequency: "monthly" as const,
    priority: lang === "en" ? 1 : 0.9,
    alternates: { languages: alternates },
  }));
}
