import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { runVerdictScan } from "@/lib/engine/orchestrate";
import { ScanError } from "@/lib/engine/scan";
import { RULEPACK } from "@/lib/rulepack";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * API publique — analyse d'une URL.
 *
 *   GET /api/scan?url=exemple.fr
 *
 * Exécute le protocole en trois phases lorsque le worker navigateur est
 * déployé, le moteur statique sinon. Le champ `scan.mode` dit lequel a
 * tourné, et `degraded` dit pourquoi le cas échéant : un agent qui consomme
 * cette API doit pouvoir distinguer « aucun manquement » de « nous n'avons
 * pas pu regarder ».
 *
 * Chaque réponse embarque le champ `disclaimer` (§12.5). Il n'est pas
 * désactivable : un consommateur d'API — humain ou agent — doit recevoir
 * l'avertissement en même temps que le constat.
 */
async function handleGET(request: Request) {
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
    const { result, degraded } = await runVerdictScan(target);

    return NextResponse.json(
      {
        disclaimer: DISCLAIMER_SHORT,
        ...(degraded ? { degraded: { reason: degraded.reason, cause: degraded.failure } } : {}),
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
          // La phase n'existe qu'en mode navigateur : elle dit à quel moment
          // du parcours le constat a été relevé (avant consentement, après
          // refus, après acceptation), ce qui est souvent l'essentiel.
          ...(f.phase ? { phase: f.phase } : {}),
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
          // Le compte dépend du moteur qui a effectivement tourné. Annoncer
          // la couverture statique sur un rapport navigateur — ou l'inverse —
          // reviendrait à mentir sur l'étendue du contrôle.
          evaluatedByThisMode: RULEPACK.total - result.notEvaluatedRuleIds.length,
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

/**
 * Contrôle, quota et journal.
 *
 * La route reste ouverte sans clé — le verdict sans compte est la promesse
 * produit n°1. Une clé présentée est vérifiée, rattachée à son organisation,
 * décomptée de son quota et journalisée.
 */
export const GET = withApiAuth("scan:read", handleGET);
