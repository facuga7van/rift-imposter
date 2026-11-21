import type { MetadataRoute } from "next";

// Requerido por `output: export`.
export const dynamic = "force-static";

// Tokens de globals.css en hex (tinta).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rift Impostor",
    short_name: "Rift",
    description: "The impostor party game with League of Legends champions.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d111b",
    theme_color: "#0d111b",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
