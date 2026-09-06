import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Requerido por `output: export`. Es estatico igual en el build de Vercel.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
