import { Analytics } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics, solo en Vercel.
 *
 * El script se sirve desde `/<hash>/script.js` (ruta ofuscada por proyecto, para
 * que los adblockers no la tengan en listas), una ruta que existe unicamente en
 * la infra de Vercel. El mismo `out/` tambien se sirve desde nginx en moraserver,
 * y ahi esa ruta daria 404 en cada visita.
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
 *
 * Ojo al diagnosticar: esta env var es solo la mitad. Web Analytics tambien hay
 * que habilitarlo a nivel proyecto en Vercel, y con eso apagado el beacon igual
 * responde 200 OK mientras descarta los eventos. El estado real esta en
 * `webAnalytics.enabledAt` / `hasData` de `GET /v9/projects/{id}`, no en la red.
 */
export function WebAnalytics() {
  if (process.env.NEXT_PUBLIC_ANALYTICS !== "1") return null;
  return <Analytics />;
}
