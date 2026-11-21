/**
 * Cloudflare Web Analytics, con el snippet manual.
 *
 * Se activa con una env var de BUILD (NEXT_PUBLIC_CF_ANALYTICS_TOKEN), no en
 * runtime: Workers Builds la tiene seteada, el build local y moraserver no. Sin
 * la variable esto devuelve null y no se inyecta ningun <script>.
 *
 * Sin cookies y sin datos personales: no hace falta banner de consentimiento.
 *
 * Ojo al diagnosticar: un beacon que responde 200 no prueba que los datos
 * lleguen (ya nos paso con Vercel). La prueba es ver visitas en el panel de
 * Web Analytics o en su API.
 */
export function WebAnalytics() {
  const token = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;
  if (!token) return null;
  return (
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
