import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { withApiAuth } from "@/lib/api/auth";
import { generateDocument, hasGenerator } from "@/lib/docs";
import { runVerdictScan } from "@/lib/engine/orchestrate";
import { ScanError } from "@/lib/engine/scan";

export const dynamic = "force-dynamic";

/**
 * Doc Factory exposée par API.
 *
 *   GET /api/documents                      → catalogue
 *   GET /api/documents?url=…&slug=…         → document généré
 *
 * Le catalogue distingue explicitement les gabarits ÉCRITS des gabarits
 * seulement prévus. Le PRD en annonce 24 ; sept existent. Renvoyer un
 * catalogue de 24 entrées dont 17 échouent à la génération ferait perdre du
 * temps à tout intégrateur, et à tout agent.
 */

const CATALOGUE = [
  { id: "D01", slug: "politique-confidentialite", title: "Politique de confidentialité", available: true },
  { id: "D02", slug: "politique-cookies", title: "Politique de gestion des cookies", available: true },
  { id: "D03", slug: "mentions-legales", title: "Mentions légales", available: true },
  { id: "D08", slug: "registre-traitements", title: "Registre des activités de traitement", available: true },
  { id: "D15", slug: "procedure-violation", title: "Procédure de gestion des violations", available: true },
  { id: "D16", slug: "procedure-droits", title: "Procédure d'exercice des droits", available: true },
  { id: "D19", slug: "contrat-sous-traitance", title: "Contrat de sous-traitance (DPA)", available: true },
  { id: "D04", slug: "cgu", title: "Conditions générales d'utilisation", available: false },
  { id: "D05", slug: "cgv", title: "Conditions générales de vente", available: false },
  { id: "D06", slug: "politique-facile-a-lire", title: "Politique en langage clair", available: false },
  { id: "D09", slug: "registre-sous-traitant", title: "Registre — rôle de sous-traitant", available: true },
  { id: "D10", slug: "registre-violations", title: "Registre des violations", available: true },
  { id: "D11", slug: "registre-demandes", title: "Registre des demandes de droits", available: true },
  { id: "D12", slug: "registre-consentements", title: "Registre des consentements", available: true },
  { id: "D13", slug: "politique-conservation", title: "Politique de conservation et de purge", available: true },
  { id: "D14", slug: "pssi", title: "Politique de sécurité (socle)", available: true },
  { id: "D17", slug: "aipd", title: "Analyse d'impact (AIPD)", available: false },
  { id: "D18", slug: "tia", title: "Analyse d'impact des transferts (TIA)", available: true },
  { id: "D20", slug: "annexes-cct", title: "Annexes CCT 2021", available: false },
  { id: "D21", slug: "responsabilite-conjointe", title: "Accord de responsabilité conjointe", available: false },
  { id: "D22", slug: "clause-confidentialite", title: "Clause de confidentialité", available: false },
  { id: "D23", slug: "charte-informatique", title: "Charte informatique et note salariés", available: false },
  { id: "D24", slug: "designation-dpo", title: "Lettre de désignation du DPO", available: true },
] as const;

async function handleGET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = params.get("slug");
  const url = params.get("url");

  if (!slug) {
    return Response.json({
      disclaimer: DISCLAIMER_SHORT,
      available: CATALOGUE.filter((d) => d.available).length,
      planned: CATALOGUE.filter((d) => !d.available).length,
      note: "Les gabarits marqués `available: false` ne sont pas écrits. Ils sont listés pour que le périmètre annoncé soit vérifiable, pas pour être appelés.",
      documents: CATALOGUE,
    });
  }

  if (!hasGenerator(slug)) {
    const known = CATALOGUE.find((d) => d.slug === slug);
    return Response.json(
      {
        error: known
          ? `Le gabarit « ${known.title} » est prévu mais n'est pas encore écrit.`
          : "Gabarit inconnu.",
        availableSlugs: CATALOGUE.filter((d) => d.available).map((d) => d.slug),
      },
      { status: 404 },
    );
  }

  if (!url) {
    return Response.json(
      { error: "Paramètre `url` requis : les documents sont alimentés par un scan réel." },
      { status: 400 },
    );
  }

  try {
    // La politique cookies liste les services RÉELLEMENT observés. En mode
    // statique, ceux chargés par JavaScript échappent à l'inventaire : la
    // politique publiée serait plus courte que la réalité du site — soit
    // exactement le défaut que le document est censé corriger.
    const { result: scan } = await runVerdictScan(url);
    const doc = generateDocument(slug, scan);
    if (!doc) return Response.json({ error: "Génération impossible." }, { status: 500 });

    return Response.json(
      {
        disclaimer: DISCLAIMER_SHORT,
        hostname: scan.hostname,
        document: doc,
        // Le nombre de champs à compléter est remonté au premier niveau :
        // c'est l'indicateur qui dit si le document est exploitable en l'état.
        todoCount: doc.todos.length,
        note: "Modèle à personnaliser et à faire valider par un professionnel du droit avant publication. Les champs [[À COMPLÉTER]] ne sont jamais remplis par déduction.",
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

/**
 * Contrôle, quota et journal.
 *
 * La route reste ouverte sans clé — le verdict sans compte est la promesse
 * produit n°1. Une clé présentée est vérifiée, rattachée à son organisation,
 * décomptée de son quota et journalisée.
 */
export const GET = withApiAuth("documents:read", handleGET);
