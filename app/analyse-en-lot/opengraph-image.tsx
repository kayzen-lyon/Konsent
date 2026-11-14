import { BULK_SCAN_TOOL, OG_CONTENT_TYPE, OG_SIZE, toolOgAlt, toolOgImage } from "@/lib/seo/og";

export const alt = toolOgAlt(BULK_SCAN_TOOL);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  return toolOgImage(BULK_SCAN_TOOL);
}
