import { Analytics } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics, solo en Vercel.
 *
 * El script se sirve desde `/_vercel/insights/script.js`, una ruta que existe
 * unicamente en la infra de Vercel. El mismo `out/` tambien se sirve desde nginx
 * en moraserver, y ahi esa ruta daria 404 en cada visita.
 *
 * Por eso se activa con una env var de BUILD, no en runtime: Vercel la tiene
 * seteada, el build local no. Sin la env var esto devuelve null, no se inyecta
 * ningun <script> en el HTML y no hay ni una request a esa ruta.
 *
 * (El import es estatico, asi que el codigo del paquete igual viaja en un chunk
 * de ~3.7 kB en el build de moraserver aunque no se ejecute. Es plata chica y a
 * cambio hay un solo camino de build para los dos hosts; si algun dia molesta,
 * se pasa a `next/dynamic`.)
 *
 * Sin cookies y sin datos personales, asi que no hace falta banner de consentimiento.
 */
export function WebAnalytics() {
  if (process.env.NEXT_PUBLIC_ANALYTICS !== "1") return null;
  return <Analytics />;
}
