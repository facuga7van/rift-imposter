import { ImageResponse } from "next/og";
import { dict, type Lang } from "@/lib/i18n";

export const OG_SIZE = { width: 1200, height: 630 };

/* Los tokens de la app en hex: `next/og` no resuelve oklch() ni variables CSS.
   Si cambian en globals.css, cambian aca. */
const TINTA = "#0d111b";
const SUPERFICIE = "#191f2c";
const LINEA = "#2b3242";
const BRASA = "#edb345";
const PAPEL = "#f1f3f8";
const PAPEL_2 = "#b6bcc9";

/** Una imagen de Open Graph por idioma: al compartir el link, la bajada tiene
 *  que estar en el idioma de la pagina compartida.
 *
 *  Cinco cartas, cuatro con retrato y una rayada: la del impostor. Es la misma
 *  marca grafica que usa la app cuando no hay imagen. */
export function ogImage(lang: Lang) {
  const t = dict(lang);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: TINTA,
          color: PAPEL,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 28,
            padding: "0 72px",
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: BRASA,
            }}
          >
            3–10 · 1 phone
          </div>
          <div
            style={{
              fontSize: 104,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          >
            Rift Impostor
          </div>
          <div style={{ fontSize: 34, color: PAPEL_2, maxWidth: 620, lineHeight: 1.35 }}>
            {t.meta.tagline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            paddingRight: 72,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                width: 78,
                height: 142,
                borderRadius: 12,
                background: SUPERFICIE,
                border: `1px solid ${LINEA}`,
                transform: `translateY(${i % 2 === 0 ? -10 : 10}px)`,
              }}
            />
          ))}
          <div
            style={{
              display: "flex",
              width: 78,
              height: 142,
              borderRadius: 12,
              background: SUPERFICIE,
              border: `2px solid ${BRASA}`,
              transform: "translateY(-10px)",
              backgroundImage: `repeating-linear-gradient(115deg, ${LINEA} 0 2px, ${SUPERFICIE} 2px 10px)`,
            }}
          />
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
