/**
 * URL canonica del sitio. En Vercel se setea NEXT_PUBLIC_SITE_URL con el dominio
 * definitivo; el fallback existe para dev y para el build local.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://riftimpostor.com";

/** Repositorio publico. Es el unico canal de sugerencias que puede tener un
 *  sitio sin backend: GitHub pone el formulario, el almacenamiento y el mail
 *  de aviso, y nosotros no guardamos ni un dato de nadie. */
export const REPO_URL = "https://github.com/facuga7van/rift-imposter";

/** Formulario de sugerencia en el idioma de quien juega. Las plantillas viven
 *  en `.github/ISSUE_TEMPLATE/`; si se renombran, esto se rompe en silencio
 *  (GitHub cae al selector generico en vez de dar 404). */
export function suggestUrl(lang: "en" | "es"): string {
  const template = lang === "es" ? "sugerencia.yml" : "suggestion.yml";
  return `${REPO_URL}/issues/new?template=${template}`;
}
