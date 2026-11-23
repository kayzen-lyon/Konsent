import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { withApiAuth } from "@/lib/api/auth";
import { auditTcf, summarizeTcf } from "@/lib/tcf/audit";
import { decodeTcString } from "@/lib/tcf/decode";

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
async function handlePOST(request: Request) {
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

  // Même logique que le moteur d'analyse : une chaîne seule, hors de tout
  // site, ne dit ni quand elle a été émise ni quels partenaires ont été
  // contactés. Les règles qui en dépendent (TCF-001, 003, 004, 005, 008)
  // sont donc déclarées non évaluées, jamais réputées satisfaites.
  const audit = auditTcf({
    tcString: body.tcString ?? "",
    apiPresent: true,
    vendorsContacted: [],
    observedBeforeInteraction: false,
  });
  const standalone = new Set(["KZC-TCF-001", "KZC-TCF-008"]);

  return Response.json(
    {
      disclaimer: DISCLAIMER_SHORT,
      decoded: true,
      summary: summarizeTcf(result.core),
      core: result.core,
      observations: audit.findings.map((f) => ({
        ruleId: f.ruleId,
        severity: f.severity,
        title: f.title,
        detail: f.evidence
          .map((e) => (e.detail ? `${e.label} — ${e.detail}` : e.label))
          .join(" · "),
      })),
      notEvaluated: [...new Set([...audit.notEvaluated, ...standalone])].sort(),
      notEvaluatedNote:
        "Ces règles exigent d'observer le site lui-même (moment d'émission de la chaîne, partenaires réellement contactés, registres IAB). Lancez une analyse complète du site pour les trancher.",
      scope:
        "Le TCF est un cadre privé de l'IAB Europe, sans valeur normative propre. Un écart au TCF n'est pas en soi un manquement au RGPD, et une conformité au TCF ne vaut pas conformité au RGPD.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Contrôle, quota et journal.
 *
 * La route reste ouverte sans clé — le verdict sans compte est la promesse
 * produit n°1. Une clé présentée est vérifiée, rattachée à son organisation,
 * décomptée de son quota et journalisée.
 */
export const POST = withApiAuth("rules:read", handlePOST);
