import { ogImage, OG_SIZE } from "@/components/OgImage";

export const alt = "Rift Impostor — el juego del impostor con campeones del LoL";
export const size = OG_SIZE;
export const contentType = "image/png";

// Requerido por `output: export`. Se genera una sola vez en el build.
export const dynamic = "force-static";

export default function Image() {
  return ogImage("es");
}
