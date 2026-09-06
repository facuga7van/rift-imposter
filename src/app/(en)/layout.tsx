import type { Metadata, Viewport } from "next";
import { RootHtml } from "@/components/RootHtml";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata("en");

export const viewport: Viewport = {
  themeColor: "#0d111b",
  // El juego es de un dispositivo que se pasa de mano: si alguien hace pinch
  // sin querer queda descuadrado. Pero bloquear el zoom del todo rompe la
  // accesibilidad, asi que lo limitamos en vez de prohibirlo.
  initialScale: 1,
  maximumScale: 5,
  width: "device-width",
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <RootHtml lang="en">{children}</RootHtml>;
}
