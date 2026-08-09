import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { withApiAuth } from "@/lib/api/auth";
import { PILLARS, RULEPACK, RULES } from "@/lib/rulepack";

/**
 * Référentiel exposé par API : les intégrateurs peuvent construire dessus
 * (§16, n°95). Un référentiel consultable est un référentiel contestable —
 * c'est précisément l'intérêt.
 */
async function handleGET() {
  return Response.json(
    {
      disclaimer: DISCLAIMER_SHORT,
      version: RULEPACK.version,
      counts: {
        total: RULEPACK.total,
        evaluableWithoutBrowser: RULEPACK.staticCount,
        requiresBrowser: RULEPACK.headlessCount,
      },
      pillars: PILLARS.map((p) => ({
        id: p.id,
        index: p.index,
        title: p.title,
        description: p.description,
        families: p.families,
      })),
      rules: RULES.map((r) => ({
        id: r.id,
        family: r.family,
        severity: r.severity,
        weight: r.weight,
        phases: r.phases,
        engine: r.engine,
        title: r.title,
        references: r.references,
        omnibusStatus: r.omnibusStatus,
        messageExec: r.messageExec,
        remediation: r.remediation,
        falsePositiveNotes: r.falsePositiveNotes ?? null,
        lastReviewed: r.lastReviewed,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}

/**
 * Contrôle, quota et journal.
 *
 * La route reste ouverte sans clé — le verdict sans compte est la promesse
 * produit n°1. Une clé présentée est vérifiée, rattachée à son organisation,
 * décomptée de son quota et journalisée.
 */
export const GET = withApiAuth("rules:read", handleGET);
