import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Export estatico, siempre.
   *
   * El juego entero corre en el cliente: no hay datos de servidor, ni ISR, ni
   * rutas dinamicas, ni next/image (las imagenes salen de la CDN de Riot). Sin
   * nada de eso, un build de servidor solo agrega funciones serverless vacias.
   *
   * De paso resuelve dos cosas: el mismo `out/` sirve para Vercel y para nginx
   * en moraserver, y evita el `EPERM: symlink` que tira el build de Vercel en
   * Windows al deduplicar funciones identicas.
   */
  output: "export",
};

export default nextConfig;
