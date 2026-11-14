import { search } from "@/lib/search";

/**
 * Recherche globale.
 *
 *   GET /api/recherche?q=google
 *   → { results: [{ type, title, url, excerpt }] }
 *
 * L'index ne contient que du contenu public et ne change qu'au déploiement :
 * la réponse est mise en cache publiquement, sur une durée courte pour que
 * les déploiements soient vite visibles.
 */
const MAX_QUERY = 100;
const LIMIT = 20;

export function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("q") ?? "";
  const q = raw.trim().slice(0, MAX_QUERY);
  const results = q ? search(q, LIMIT) : [];

  return Response.json(
    { results },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
