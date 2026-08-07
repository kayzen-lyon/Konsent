import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { assembleHeadlessScan } from "@/lib/engine/scan-headless";
import type { WorkerOutput } from "@/lib/engine/headless-adapter";
import { RULEPACK } from "@/lib/rulepack";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Ingestion d'une observation produite par le worker navigateur.
 *
 *   POST /api/ingest   (corps : sortie JSON du worker)
 *
 * Le worker s'exécute là où un navigateur headless peut tourner —
 * conteneur Docker, machine de développement, intégration continue — puis
 * transmet son observation ici pour évaluation. L'application ne fait pas
 * tourner de navigateur : elle applique le référentiel.
 *
 * Aucune donnée n'est conservée : le rapport est calculé et renvoyé.
 */
function isWorkerOutput(value: unknown): value is WorkerOutput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["url"] === "string" &&
    typeof v["scannedAt"] === "string" &&
    Array.isArray(v["snapshots"]) &&
    typeof v["banner"] === "object" &&
    v["banner"] !== null
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Corps de requête JSON invalide.", disclaimer: DISCLAIMER_SHORT },
      { status: 400 },
    );
  }

  if (!isWorkerOutput(body)) {
    return Response.json(
      {
        error:
          "Format non reconnu. Attendu : la sortie du worker navigateur (champs url, scannedAt, banner, snapshots).",
        disclaimer: DISCLAIMER_SHORT,
      },
      { status: 400 },
    );
  }

  try {
    const scan = await assembleHeadlessScan(body);

    return Response.json(
      {
        disclaimer: DISCLAIMER_SHORT,
        scan: {
          id: scan.id,
          hostname: scan.hostname,
          mode: scan.mode,
          rulepackVersion: scan.rulepackVersion,
          scannedAt: scan.scannedAt,
          score: scan.score,
          grade: scan.grade,
          gradeLabel: scan.gradeLabel,
          cappedBy: scan.cappedBy ?? null,
        },
        findings: scan.findings.map((f) => ({
          ruleId: f.ruleId,
          severity: f.severity,
          family: f.family,
          title: f.title,
          occurrences: f.occurrences,
          phase: f.phase,
          evidence: f.evidence,
        })),
        vendors: scan.vendors.map((v) => ({
          slug: v.slug,
          name: v.name,
          entity: v.entity,
          effectiveJurisdiction: v.effectiveJurisdiction,
          adequacy: v.adequacy,
        })),
        coverage: {
          rulepackTotal: RULEPACK.total,
          notEvaluated: scan.notEvaluatedRuleIds,
          note: "Les règles listées n'ont pas pu être vérifiées, même par le protocole en trois phases. Elles ne doivent pas être interprétées comme satisfaites.",
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? `Évaluation impossible : ${error.message}`
            : "Évaluation impossible.",
        disclaimer: DISCLAIMER_SHORT,
      },
      { status: 500 },
    );
  }
}
