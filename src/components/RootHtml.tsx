import { Archivo, IBM_Plex_Mono, Work_Sans } from "next/font/google";
import { buildJsonLd } from "@/lib/metadata";
import { LANG_META, type Lang } from "@/lib/i18n";
import { WebAnalytics } from "./WebAnalytics";
import "@/app/globals.css";

/** Archivo variable con el eje de ancho: los titulares van en 118 de wdth y los
 *  botones en 112. Un solo archivo cubre las dos anchuras y los dos pesos. */
const display = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-display",
  display: "swap",
});

const sans = Work_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

/**
 * Compartido por los dos root layouts (route groups (en) y (es)). Solo un root
 * layout puede renderizar <html>, y necesitamos `lang` distinto por idioma:
 * de ahi los dos grupos, y de ahi este componente para no duplicar el resto.
 */
export function RootHtml({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <html
      lang={LANG_META[lang].htmlLang}
      className={`${sans.variable} ${mono.variable} ${display.variable}`}
    >
      <head>
        {/* Precon a la CDN de Riot: las imagenes de campeon salen de ahi y el
            handshake TLS se paga antes de que haga falta la primera. */}
        <link rel="preconnect" href="https://ddragon.leagueoflegends.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(lang)) }}
        />
      </head>
      <body>
        {children}
        <WebAnalytics />
      </body>
    </html>
  );
}
