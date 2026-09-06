/**
 * URL canonica del sitio. En Vercel se setea NEXT_PUBLIC_SITE_URL con el dominio
 * definitivo; el fallback existe para dev y para el build local.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://riftimpostor.com";
