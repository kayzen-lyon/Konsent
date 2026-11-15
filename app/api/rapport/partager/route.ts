import { dbConfigured } from "@/lib/db";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { runVerdictScan } from "@/lib/engine/orchestrate";
import { ScanError } from "@/lib/engine/scan";
import { createSharedReport, parseShareBody, sharedReportUrl } from "@/lib/report/shared";
import { RATE_RULES, limitByIp } from "@/lib/security/rate-limit";
import { sameOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Lien de rapport public figé (opt-in, 30 jours).
 *
 *   POST /api/rapport/partager  { url }
 *
 * Route INTERNE : appelée par le bouton « Créer un lien de partage » du
 * rapport. Seule l'adresse est lue dans le corps : l'analyse est RELANCÉE ici,
 * et c'est son résultat qui est figé. Un rapport envoyé par le client ne
 * serait qu'un JSON quelconque publié sous notre nom.
 */

function refuse(message: string, status: number): Response {
  return Response.json(
    { error: message, disclaimer: DISCLAIMER_SHORT },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return refuse("Origine refusée.", 403);

  const parsed = parseShareBody(await request.json().catch(() => null));
  if (!parsed.ok) return refuse(parsed.error, 400);

  if (!dbConfigured()) {
    return refuse("Le partage de rapport n'est pas disponible sur cette instance.", 503);
  }

  const limited = await limitByIp(request, RATE_RULES.share);
  if (limited) return limited;

  let verdict;
  try {
    verdict = await runVerdictScan(parsed.url, request.signal);
  } catch (error) {
    if (error instanceof ScanError) return refuse(error.message, 422);
    console.error("[partager] analyse", error);
    return refuse("L'analyse n'a pas abouti. Réessayez dans un instant.", 500);
  }

  try {
    const { id, expiresAt } = await createSharedReport(verdict);
    return Response.json(
      { id, url: sharedReportUrl(id), expiresAt, disclaimer: DISCLAIMER_SHORT },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[partager] enregistrement", error);
    return refuse("Enregistrement impossible pour le moment.", 500);
  }
}
