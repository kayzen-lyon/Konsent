import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { withApiAuth } from "@/lib/api/auth";
import { JURISDICTIONS, applicability, partitionForJurisdiction, type JurisdictionCode } from "@/lib/jurisdictions";
import { RULES, getRule } from "@/lib/rulepack";

export const dynamic = "force-static";

/**
 * Couverture multi-juridiction, exposée en lecture.
 *
 *   GET /api/juridictions                       → les juridictions couvertes
 *   GET /api/juridictions?code=CH               → détail et règles hors périmètre
 *   GET /api/juridictions?rule=…&code=…         → applicabilité d'une règle
 *
 * L'enjeu de cette route est qu'un agent qui restitue un rapport hors de
 * France ne transpose pas mécaniquement un constat français. En Suisse et en
 * Californie, un dépôt avant action n'est pas un écart : c'est le régime
 * normal. Un résumé qui l'ignore est faux, pas approximatif.
 */
async function handleGET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code") as JurisdictionCode | null;
  const ruleId = params.get("rule");

  if (ruleId) {
    const rule = getRule(ruleId.toUpperCase());
    if (!rule) return Response.json({ error: `Règle inconnue : ${ruleId}` }, { status: 404 });
    if (!code) return Response.json({ error: "Paramètre `code` requis avec `rule`." }, { status: 400 });

    const jurisdiction = JURISDICTIONS.find((j) => j.code === code);
    if (!jurisdiction) return Response.json({ error: `Juridiction inconnue : ${code}` }, { status: 404 });

    const result = applicability(rule, code);
    return Response.json({
      disclaimer: DISCLAIMER_SHORT,
      ruleId: rule.id,
      title: rule.title,
      jurisdiction: { code: jurisdiction.code, label: jurisdiction.label, regime: jurisdiction.regime },
      applies: result.applies,
      reason: result.reason ?? null,
      basis: result.localBasis ?? jurisdiction.basis,
      maturity: jurisdiction.maturity,
      caveat: jurisdiction.caveat,
    });
  }

  if (code) {
    const jurisdiction = JURISDICTIONS.find((j) => j.code === code);
    if (!jurisdiction) return Response.json({ error: `Juridiction inconnue : ${code}` }, { status: 404 });

    const { applicable, outOfScope } = partitionForJurisdiction(RULES, code);
    return Response.json({
      disclaimer: DISCLAIMER_SHORT,
      jurisdiction,
      applicableCount: applicable.length,
      outOfScope: outOfScope.map((o) => ({
        ruleId: o.rule.id,
        family: o.rule.family,
        title: o.rule.title,
        reason: o.reason,
      })),
      note:
        "Les règles hors périmètre ne sont pas des règles satisfaites : elles ne s'appliquent pas dans cette juridiction. Ne les comptez ni d'un côté ni de l'autre.",
    });
  }

  return Response.json({
    disclaimer: DISCLAIMER_SHORT,
    default: "FR",
    jurisdictions: JURISDICTIONS.map((j) => {
      const { applicable, outOfScope } = partitionForJurisdiction(RULES, j.code);
      return { ...j, applicableCount: applicable.length, outOfScopeCount: outOfScope.length };
    }),
    warning:
      "Seules les qualifications FR et EU sont établies à partir des textes et de la doctrine de l'autorité compétente. Les autres sont indicatives, par analogie de régime, et doivent être validées par un juriste local avant toute exploitation commerciale.",
  });
}

/**
 * Contrôle, quota et journal.
 *
 * La route reste ouverte sans clé — le verdict sans compte est la promesse
 * produit n°1. Une clé présentée est vérifiée, rattachée à son organisation,
 * décomptée de son quota et journalisée.
 */
export const GET = withApiAuth("rules:read", handleGET);
