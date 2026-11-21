/**
 * Imagen del resultado (1080x1350, formato historia/feed) dibujada con
 * <canvas>. Helper puro: recibe datos y devuelve un PNG, no toca React.
 * Sin arte de campeones ni logos de Riot (politica de Riot).
 */

export type ResultCardData = {
  winner: { name: string; points: number };
  /** Top 3 con el ganador primero. */
  podium: { name: string; points: number }[];
  best?: { name: string; detail: string };
  labels: { brand: string; winner: string; podium: string; pts: string; bestImpostor: string };
  /** Se imprime tal cual abajo (ej. "rift.wampaland.com.ar"). */
  url: string;
};

export const CARD_W = 1080;
export const CARD_H = 1350;

/* Mismos tokens hex que OgImage/BrandIcon: el canvas no entiende oklch. */
const TINTA = "#0d111b";
const SUPERFICIE = "#191f2c";
const LINEA = "#2b3242";
const BRASA = "#edb345";
const MENTA = "#5fd9a3";
const PAPEL = "#f1f3f8";
const PAPEL_2 = "#b6bcc9";

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Achica la fuente hasta que `text` entre en `maxWidth`; si ni al minimo, recorta con "…". */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, start: number, min: number, maxWidth: number) {
  let px = start;
  ctx.font = font(px);
  while (px > min && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = font(px);
  }
  let out = text;
  while (out.length > 1 && ctx.measureText(out).width > maxWidth) out = out.slice(0, -1);
  return out === text ? text : `${out.trimEnd()}…`;
}

export async function renderResultCard(d: ResultCardData): Promise<Blob> {
  // Las fuentes de la pagina (next/font) cargan al usarse: esperarlas, o el canvas pinta con la de respaldo.
  const display = cssVar("--font-display") || "sans-serif";
  const sans = cssVar("--font-sans") || "sans-serif";
  const mono = cssVar("--font-mono") || "monospace";
  await Promise.all([
    document.fonts.load(`800 64px ${display}`),
    document.fonts.load(`500 32px ${sans}`),
    document.fonts.load(`500 28px ${mono}`),
  ]).catch(() => {});
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
  bg.addColorStop(0, SUPERFICIE);
  bg.addColorStop(0.45, TINTA);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = BRASA;
  ctx.fillRect(0, 0, CARD_W, 14);

  const W = CARD_W - 2 * 90;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const cx = CARD_W / 2;

  // Marca
  ctx.fillStyle = BRASA;
  ctx.font = `800 56px ${display}`;
  ctx.fillText(d.labels.brand.toUpperCase(), cx, 130);

  // Ganador
  ctx.fillStyle = MENTA;
  ctx.font = `500 34px ${mono}`;
  ctx.fillText(d.labels.winner.toUpperCase(), cx, 270);
  ctx.fillStyle = PAPEL;
  const name = fit(ctx, d.winner.name, (px) => `800 ${px}px ${display}`, 150, 64, W);
  ctx.fillText(name, cx, 420);
  ctx.fillStyle = BRASA;
  ctx.font = `800 84px ${display}`;
  ctx.fillText(`${d.winner.points} ${d.labels.pts}`, cx, 520);

  // Podio
  ctx.textAlign = "left";
  ctx.fillStyle = PAPEL_2;
  ctx.font = `500 28px ${mono}`;
  ctx.fillText(d.labels.podium.toUpperCase(), 90, 628);
  d.podium.slice(0, 3).forEach((p, i) => {
    const y = 660 + i * 130;
    ctx.fillStyle = i === 0 ? SUPERFICIE : TINTA;
    ctx.strokeStyle = i === 0 ? BRASA : LINEA;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(90, y, W, 110, 22);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = i === 0 ? BRASA : PAPEL_2;
    ctx.font = `800 52px ${display}`;
    ctx.fillText(String(i + 1), 130, y + 73);
    ctx.fillStyle = PAPEL;
    ctx.fillText(fit(ctx, p.name, (px) => `500 ${px}px ${sans}`, 46, 26, W - 330), 220, y + 71);
    ctx.textAlign = "right";
    ctx.fillStyle = i === 0 ? BRASA : PAPEL;
    ctx.font = `800 48px ${display}`;
    ctx.fillText(`${p.points} ${d.labels.pts}`, 90 + W - 40, y + 70);
    ctx.textAlign = "left";
  });

  // Mejor impostor (solo si hay)
  if (d.best) {
    ctx.fillStyle = BRASA;
    ctx.font = `500 26px ${mono}`;
    ctx.fillText(d.labels.bestImpostor.toUpperCase(), 90, 1112);
    ctx.fillStyle = PAPEL;
    ctx.fillText(fit(ctx, d.best.name, (px) => `800 ${px}px ${display}`, 48, 30, W), 90, 1166);
    ctx.fillStyle = PAPEL_2;
    ctx.fillText(fit(ctx, d.best.detail, (px) => `500 ${px}px ${sans}`, 30, 20, W), 90, 1210);
  }

  // URL
  ctx.textAlign = "center";
  ctx.fillStyle = PAPEL_2;
  ctx.font = `500 34px ${mono}`;
  ctx.fillText(d.url, cx, 1300);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}
