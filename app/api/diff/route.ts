import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { withApiAuth } from "@/lib/api/auth";
import { runVerdictScan } from "@/lib/engine/orchestrate";
import { ScanError } from "@/lib/engine/scan";
import { decodeBaseline } from "@/lib/monitoring/baseline";
import { alertSummary, diffAgainstBaseline } from "@/lib/monitoring/diff";
import { RATE_RULES, limitAnonymousByIp } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * M10 — Comparaison à une référence.
 *
 *   GET /api/diff?url=exemple.fr&ref=<jeton>
 */
async function handleGET(request: Request) {
  const limited = await limitAnonymousByIp(request, RATE_RULES.diff);
  if (limited) return limited;

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
    // Même moteur que le rapport qui a produit la référence, sans quoi le
    // différentiel compare deux observations de portées différentes. Quand la
    // dégradation survient malgré tout, `diffAgainstBaseline` le détecte et
    // refuse de conclure — il ne fabrique pas de régression.
    const { result: current, degraded } = await runVerdictScan(target);

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
        ...(degraded ? { degraded: { reason: degraded.reason, cause: degraded.failure } } : {}),
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

/**
 * Contrôle, quota et journal.
 *
 * La route reste ouverte sans clé — le verdict sans compte est la promesse
 * produit n°1. Une clé présentée est vérifiée, rattachée à son organisation,
 * décomptée de son quota et journalisée.
 */
export const GET = withApiAuth("scan:read", handleGET);
