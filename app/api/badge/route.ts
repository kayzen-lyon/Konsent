import { RATE_RULES, limitAnonymousByIp } from "@/lib/security/rate-limit";
import { withApiAuth } from "@/lib/api/auth";
import { scoreBadge, unavailableBadge, type BadgeStyle } from "@/lib/badge/svg";
import { runVerdictScan } from "@/lib/engine/orchestrate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Badge Konsent — image SVG à afficher sur un site ou un README.
 *
 *   GET /api/badge?url=exemple.fr[&style=flat|pill]
 *
 * Toujours en 200 : un statut d'erreur casserait la balise <img> qui
 * l'affiche. L'échec se dit dans l'image (« indisponible »), pas dans le code.
 */
const SUCCESS_CACHE = "public, s-maxage=86400, stale-while-revalidate=604800";
// Un échec (site momentanément injoignable) ne doit pas rester figé un jour.
const FAILURE_CACHE = "public, s-maxage=3600";

function svgResponse(body: string, cacheControl: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function handleGET(request: Request) {
  const params = new URL(request.url).searchParams;
  const target = params.get("url");
  const style: BadgeStyle = params.get("style") === "pill" ? "pill" : "flat";

  if (!target) return svgResponse(unavailableBadge(style), FAILURE_CACHE);
  // Même limite que /api/scan : un badge non mis en cache déclenche une
  // analyse. Au-delà, badge gris plutôt qu'une erreur qui casserait l'<img>.
  const limited = await limitAnonymousByIp(request, RATE_RULES.scan);
  if (limited) return svgResponse(unavailableBadge(style), "no-store");

  try {
    // ScanError (adresse invalide, site injoignable, délai) comme toute autre
    // erreur : même badge gris, le détail n'a pas sa place dans une image.
    const { result } = await runVerdictScan(target);
    return svgResponse(
      scoreBadge({ score: result.score, grade: result.grade, hostname: result.hostname, style }),
      SUCCESS_CACHE,
    );
  } catch {
    return svgResponse(unavailableBadge(style), FAILURE_CACHE);
  }
}

export const GET = withApiAuth("scan:read", handleGET);
