import type { Metadata } from "next";
import { dict, LANG_META, otherLang, pathFor, type Lang } from "./i18n";
import { SITE_URL } from "./site";

/**
 * Metadata por idioma. Lo importante para SEO son los `languages`: le dicen a
 * Google que / y /es son la misma pagina en dos idiomas y no contenido
 * duplicado. Sin hreflang, una de las dos se canibaliza a la otra.
 */
export function buildMetadata(lang: Lang): Metadata {
  const t = dict(lang);
  const url = new URL(pathFor(lang), SITE_URL).toString();

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta.title, template: "%s · Rift Impostor" },
    description: t.meta.description,
    applicationName: "Rift Impostor",
    keywords: t.meta.keywords,
    alternates: {
      canonical: pathFor(lang),
      languages: {
        en: "/",
        es: "/es",
        "x-default": "/",
      },
    },
    openGraph: {
      type: "website",
      locale: LANG_META[lang].ogLocale,
      alternateLocale: LANG_META[otherLang(lang)].ogLocale,
      url,
      siteName: "Rift Impostor",
      title: t.meta.title,
      description: t.meta.description,
    },
    twitter: {
      card: "summary_large_image",
      title: "Rift Impostor",
      description: t.meta.description,
    },
    robots: { index: true, follow: true },
    category: "games",
    // Google Search Console. Se setea NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION con
    // el codigo que da Google al elegir "etiqueta HTML"; si no esta, Next no
    // emite el meta y no pasa nada.
    verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}

export function buildJsonLd(lang: Lang) {
  const t = dict(lang);
  return {
    "@context": "https://schema.org",
    "@type": "Game",
    name: "Rift Impostor",
    description: t.meta.description,
    url: new URL(pathFor(lang), SITE_URL).toString(),
    inLanguage: LANG_META[lang].htmlLang,
    genre: lang === "es" ? ["Deducción social", "Party game"] : ["Social deduction", "Party game"],
    numberOfPlayers: { "@type": "QuantitativeValue", minValue: 3, maxValue: 10 },
    gamePlatform: lang === "es" ? "Navegador web" : "Web browser",
    isAccessibleForFree: true,
  };
}
