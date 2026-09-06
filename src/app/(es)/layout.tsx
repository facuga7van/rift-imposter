import type { Metadata, Viewport } from "next";
import { RootHtml } from "@/components/RootHtml";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata("es");

export const viewport: Viewport = {
  themeColor: "#0d111b",
  initialScale: 1,
  maximumScale: 5,
  width: "device-width",
};

export default function EsLayout({ children }: { children: React.ReactNode }) {
  return <RootHtml lang="es">{children}</RootHtml>;
}
