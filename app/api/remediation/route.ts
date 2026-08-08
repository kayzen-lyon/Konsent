import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { ScanError, runScan } from "@/lib/engine/scan";
import { STACKS, type Stack, buildQuote, detectStack } from "@/lib/remediation/quote";
import { computeExposure } from "@/lib/risk/exposure";
import { getRule } from "@/lib/rulepack";

export const dynamic = "force-dynamic";

/**
 * Plan de correction, devis et exposition théorique.
 *
 *   GET /api/remediation?url=exemple.fr&stack=wordpress&ca=4500000
 *
 * Les trois sortent du même appel parce qu'un dirigeant ne les lit jamais
 * séparément : il veut savoir ce qui cloche, ce que ça coûte de corriger, et
 * ce que ça coûte de ne pas corriger. Les présenter isolément, c'est laisser
 * le premier chiffre agir seul — ce que le garde-fou n°2 interdit.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const url = params.get("url");
  if (!url) {
    return Response.json({ error: "Paramètre `url` requis." }, { status: 400 });
  }

  const stackParam = params.get("stack");
  const stack = STACKS.find((s) => s.id === stackParam)?.id as Stack | undefined;

  const revenueRaw = params.get("ca");
  const revenueEur = revenueRaw ? Number(revenueRaw) : undefined;
  if (revenueRaw && (!Number.isFinite(revenueEur) || (revenueEur ?? 0) < 0)) {
    return Response.json({ error: "Paramètre `ca` invalide." }, { status: 400 });
  }

  try {
    const scan = await runScan(url);
    const quote = buildQuote(scan, stack);

    // L'exposition n'est calculée que si un chiffre d'affaires est fourni.
    // Sans lui, afficher le plafond légal seul serait le contraire de ce que
    // le produit promet.
    const exposure =
      revenueEur === undefined
        ? null
        : computeExposure({ revenueEur, findings: scan.findings });

    return Response.json(
      {
        disclaimer: DISCLAIMER_SHORT,
        hostname: scan.hostname,
        score: scan.score,
        grade: scan.grade,
        detectedStack: detectStack(scan),
        appliedStack: quote.stack,
        plan: scan.findings
          .map((f) => {
            const rule = getRule(f.ruleId);
            if (!rule) return null;
            return {
              ruleId: f.ruleId,
              severity: f.severity,
              title: rule.title,
              occurrences: f.occurrences,
              effort: rule.remediation.effort,
              billable: rule.remediation.billable,
              steps: rule.remediation.steps,
              references: rule.references,
            };
          })
          .filter(Boolean),
        quote,
        exposure,
        exposureNote:
          exposure === null
            ? "Aucun chiffre d'affaires fourni : l'exposition n'est pas calculée. Un plafond légal affiché sans la fourchette réellement observée serait trompeur."
            : "Plafonds légaux théoriques, présentés avec la fourchette réellement constatée en procédure simplifiée. Ne préjugent d'aucune décision d'une autorité.",
        notEvaluatedRuleIds: scan.notEvaluatedRuleIds,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ScanError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    return Response.json({ error: "L'analyse a échoué." }, { status: 500 });
  }
}
