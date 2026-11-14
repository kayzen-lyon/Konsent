import { OG_CONTENT_TYPE, OG_SIZE, toolOgAlt, toolOgImage } from "@/lib/seo/og";

export const alt = toolOgAlt("reponse-droits");
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  return toolOgImage("reponse-droits");
}
