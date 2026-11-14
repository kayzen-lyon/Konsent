import { FEED_CACHE, jsonFeed } from "@/lib/seo/feeds";

/** Flux JSON Feed 1.1 de la veille réglementaire. */
export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(jsonFeed(), null, 2), {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
      "Cache-Control": FEED_CACHE,
    },
  });
}
