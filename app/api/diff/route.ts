import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { ScanError, runScan } from "@/lib/engine/scan";
import { decodeBaseline } from "@/lib/monitoring/baseline";
import { alertSummary, diffAgainstBaseline } from "@/lib/monitoring/diff";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * M10 — Comparaison à une référence.
 *
 *   GET /api/diff?url=exemple.fr&ref=<jeton>
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const target = params.get("url");
  const token = params.get("ref");

  if (!target || !token) {
    return Response.json(
      {
        error: "Paramètres « url » et « ref » requis.",
        disclaimer: DISCLAIMER_SHORT,
      },
      { status: 400 },
    );
  }

  const baseline = decodeBaseline(token);
  if (!baseline) {
    return Response.json(
      {
        error: "Jeton de référence invalide ou altéré.",
        disclaimer: DISCLAIMER_SHORT,
      },
      { status: 400 },
    );
  }

  try {
    const current = await runScan(target);

    if (baseline.h !== current.hostname) {
      return Response.json(
        {
          error: `La référence porte sur ${baseline.h}, l'analyse sur ${current.hostname}. Comparaison refusée.`,
          disclaimer: DISCLAIMER_SHORT,
        },
        { status: 400 },
      );
    }

    const diff = diffAgainstBaseline(baseline, current);

    return Response.json(
      {
        disclaimer: DISCLAIMER_SHORT,
        diff,
        alert: alertSummary(diff),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ScanError) {
      return Response.json(
        { error: error.message, code: error.code, disclaimer: DISCLAIMER_SHORT },
        { status: error.code === "INVALID_URL" ? 400 : 502 },
      );
    }
    return Response.json(
      { error: "La comparaison n'a pas abouti.", disclaimer: DISCLAIMER_SHORT },
      { status: 500 },
    );
  }
}
