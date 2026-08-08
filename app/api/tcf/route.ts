import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { summarizeTcf } from "@/lib/tcf/audit";
import { decodeTcString } from "@/lib/tcf/decode";
import { TCF_PURPOSES } from "@/lib/tcf/purposes";

export const dynamic = "force-dynamic";

/**
 * Décodage d'une chaîne de consentement publicitaire.
 *
 *   POST /api/tcf   { "tcString": "CO…" }
 *
 * En POST et non en GET : une chaîne de consentement finirait sinon dans les
 * journaux d'accès et les historiques de navigation. Elle décrit le choix
 * d'une personne réelle sur un site réel — ce n'est pas une donnée à laisser
 * traîner dans une URL.
 *
 * Rien n'est conservé.
 */
export async function POST(request: Request) {
  let body: { tcString?: string };
  try {
    body = (await request.json()) as { tcString?: string };
  } catch {
    return Response.json({ error: "Corps de requête illisible." }, { status: 400 });
  }

  const result = decodeTcString(body.tcString ?? "");

  if (!result.ok) {
    return Response.json(
      {
        disclaimer: DISCLAIMER_SHORT,
        decoded: false,
        reason: result.reason,
        finding: "KZC-TCF-002",
        note: "Une chaîne illisible signifie que l'éditeur ne peut pas démontrer ce que ses visiteurs ont accepté.",
      },
      { status: 200 },
    );
  }

  const targeting = TCF_PURPOSES.filter((p) => !p.legitimateInterestDefensible).map((p) => p.id);
  const abusiveLi = result.core.purposesLegitimateInterest.filter((p) => targeting.includes(p));

  return Response.json(
    {
      disclaimer: DISCLAIMER_SHORT,
      decoded: true,
      summary: summarizeTcf(result.core),
      core: result.core,
      observations: [
        ...(abusiveLi.length > 0
          ? [
              {
                ruleId: "KZC-TCF-006",
                detail: `${abusiveLi.length} finalité(s) de ciblage activée(s) en intérêt légitime.`,
              },
            ]
          : []),
        ...(result.core.publisherRestrictions.length === 0
          ? [{ ruleId: "KZC-TCF-007", detail: "Aucune restriction éditeur déclarée." }]
          : []),
      ],
      scope:
        "Le TCF est un cadre privé de l'IAB Europe, sans valeur normative propre. Un écart au TCF n'est pas en soi un manquement au RGPD, et une conformité au TCF ne vaut pas conformité au RGPD.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
