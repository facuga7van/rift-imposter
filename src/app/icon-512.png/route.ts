import { brandIcon } from "@/components/BrandIcon";

// Requerido por `output: export`. Carpeta con extension a proposito: el archivo
// exportado queda como /icon-512.png y el hosting le pone el content-type bien.
export const dynamic = "force-static";

// ponytail: route handler porque icon.tsx admite un solo tamano por carpeta.
export function GET() {
  return brandIcon(512);
}
