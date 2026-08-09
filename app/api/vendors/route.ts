import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { withApiAuth } from "@/lib/api/auth";
import { TRACKERS } from "@/lib/trackers/db";

export const dynamic = "force-static";

/**
 * Base des destinataires, exposée en lecture.
 *
 *   GET /api/vendors            → toutes les fiches
 *   GET /api/vendors?q=meta     → recherche par domaine, nom ou entité
 *
 * Ouvrir cette base est un choix : elle est l'actif le plus coûteux à
 * constituer, et la rendre consultable est ce qui permet de contester une
 * fiche. Une base fermée est une base qu'on doit croire sur parole.
 */
async function handleGET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase();

  const matches = !q
    ? TRACKERS
    : TRACKERS.filter(
        (t) =>
          t.slug.includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.entity.toLowerCase().includes(q) ||
          (t.ultimateParent ?? "").toLowerCase().includes(q) ||
          t.domains.some((d) => d.toLowerCase().includes(q)),
      );

  return Response.json({
    disclaimer: DISCLAIMER_SHORT,
    total: TRACKERS.length,
    count: matches.length,
    ...(q ? { query: q } : {}),
    note:
      "Le statut d'adéquation et la certification DPF sont des instantanés datés. Ils doivent être revérifiés à leur source officielle avant toute exploitation.",
    vendors: matches.map((t) => ({
      slug: t.slug,
      name: t.name,
      entity: t.entity,
      ultimateParent: t.ultimateParent ?? null,
      hqJurisdiction: t.hqJurisdiction,
      effectiveJurisdiction: t.effectiveJurisdiction,
      adequacy: t.adequacy,
      dpf: t.dpf ?? null,
      categories: t.categories,
      domains: t.domains,
      exemptEligible: t.exemptEligible,
      purposeFr: t.purposeFr,
      riskNotesFr: t.riskNotesFr,
      alternativesEu: t.alternativesEu ?? [],
      sources: t.sources,
    })),
  });
}

/**
 * Contrôle, quota et journal.
 *
 * La route reste ouverte sans clé — le verdict sans compte est la promesse
 * produit n°1. Une clé présentée est vérifiée, rattachée à son organisation,
 * décomptée de son quota et journalisée.
 */
export const GET = withApiAuth("vendors:read", handleGET);
