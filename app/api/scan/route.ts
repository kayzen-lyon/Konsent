import { NextResponse } from "next/server";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { ScanError, runScan } from "@/lib/engine/scan";
import { RULEPACK } from "@/lib/rulepack";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * API publique — analyse d'une URL.
 *
 *   GET /api/scan?url=exemple.fr
 *
 * Chaque réponse embarque le champ `disclaimer` (§12.5). Il n'est pas
 * désactivable : un consommateur d'API — humain ou agent — doit recevoir
 * l'avertissement en même temps que le constat.
 */
export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url");

  if (!target) {
    return NextResponse.json(
      {
        error: "Paramètre « url » manquant.",
        disclaimer: DISCLAIMER_SHORT,
      },
      { status: 400 },
    );
  }

  try {
    const result = await runScan(target);

    return NextResponse.json(
      {
        disclaimer: DISCLAIMER_SHORT,
        scan: {
          id: result.id,
          url: result.url,
          finalUrl: result.finalUrl,
          hostname: result.hostname,
          mode: result.mode,
          rulepackVersion: result.rulepackVersion,
          scannedAt: result.scannedAt,
          durationMs: result.durationMs,
          score: result.score,
          grade: result.grade,
          gradeLabel: result.gradeLabel,
          cappedBy: result.cappedBy ?? null,
        },
        findings: result.findings.map((f) => ({
          ruleId: f.ruleId,
          severity: f.severity,
          family: f.family,
          title: f.title,
          occurrences: f.occurrences,
          evidence: f.evidence,
        })),
        vendors: result.vendors.map((v) => ({
          slug: v.slug,
          name: v.name,
          entity: v.entity,
          ultimateParent: v.ultimateParent ?? null,
          effectiveJurisdiction: v.effectiveJurisdiction,
          adequacy: v.adequacy,
          categories: v.categories,
          purposeFr: v.purposeFr,
          riskNotesFr: v.riskNotesFr,
        })),
        coverage: {
          rulepackTotal: RULEPACK.total,
          evaluatedByThisMode: RULEPACK.staticCount,
          notEvaluated: result.notEvaluatedRuleIds,
          note:
            "Les règles listées dans « notEvaluated » n'ont pas pu être vérifiées par ce mode d'analyse. Elles ne doivent en aucun cas être interprétées comme satisfaites.",
        },
        cmp: result.observation.cmp,
        legalPages: result.observation.legalPages,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    if (error instanceof ScanError) {
      const status = error.code === "INVALID_URL" ? 400 : error.code === "TIMEOUT" ? 504 : 502;
      return NextResponse.json(
        { error: error.message, code: error.code, disclaimer: DISCLAIMER_SHORT },
        { status },
      );
    }
    return NextResponse.json(
      { error: "L'analyse n'a pas abouti.", disclaimer: DISCLAIMER_SHORT },
      { status: 500 },
    );
  }
}
