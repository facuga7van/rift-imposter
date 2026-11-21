import { ImageResponse } from "next/og";

/* Mismos tokens hex que OgImage.tsx (`next/og` no resuelve oklch). */
const TINTA = "#0d111b";
const SUPERFICIE = "#191f2c";
const BRASA = "#edb345";

/** Marca cuadrada: una "R" ambar sobre tinta, con borde ambar. Sin arte de Riot.
 *  Sirve para el favicon (32px), el apple-icon (180px) y el manifest (192/512). */
export function brandIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: TINTA,
          color: BRASA,
          fontSize: size * 0.72,
          fontWeight: 800,
          lineHeight: 1,
          border: `${Math.max(2, Math.round(size * 0.05))}px solid ${BRASA}`,
          borderRadius: size * 0.22,
          backgroundImage: `linear-gradient(160deg, ${SUPERFICIE}, ${TINTA})`,
        }}
      >
        R
      </div>
    ),
    { width: size, height: size },
  );
}
