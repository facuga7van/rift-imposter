import { brandIcon } from "@/components/BrandIcon";

export const size = { width: 32, height: 32 };
export const dynamic = "force-static";
export const contentType = "image/png";

export default function Icon() {
  return brandIcon(size.width);
}
