import { FEED_CACHE, rssFeed } from "@/lib/seo/feeds";

/** Flux RSS 2.0 de la veille réglementaire. */
export const dynamic = "force-static";

export function GET() {
  return new Response(rssFeed(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": FEED_CACHE,
    },
  });
}
