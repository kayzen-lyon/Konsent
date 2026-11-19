import { EDITOR } from "@/lib/disclaimer";
import { FAMILY_LABELS, FAMILY_ORDER, RULEPACK, rulesByFamily } from "@/lib/rulepack";
import { TRACKERS } from "@/lib/trackers/db";
import { COOKIES } from "@/lib/seo/cookies";
import { GLOSSARY } from "@/lib/seo/glossary";
import { GUIDES } from "@/lib/seo/guides";
import { SECTORS } from "@/lib/seo/sectors";
import { FREE_TOOLS, toolHref } from "@/lib/tools/catalog";
import { getEcosystem, groupByCategory, withRef } from "@/lib/ecosystem";

/**
 * /llms.txt (https://llmstxt.org) : la carte du site à l'usage des modèles
 * de langage. Titre, résumé, puis des sections de liens absolus commentés.
 * Les chiffres sont calculés depuis les mêmes sources que les pages.
 */
export const dynamic = "force-static";

export async function GET() {
  const B = EDITOR.productSite;
  const link = (path: string, label: string, note?: string) =>
    `- [${label}](${B}${path})${note ? `: ${note}` : ""}`;

  const families = FAMILY_ORDER.map(
    (f) => `${FAMILY_LABELS[f]} (${rulesByFamily(f).length})`,
  ).join(", ");

  // Les autres applications KAYZEN, depuis ecosystem.json (lu au build).
  const ecosystem = groupByCategory(await getEcosystem()).flatMap(([, apps]) =>
    apps.map((a) =>
      a.statut === "bientot"
        ? `- ${a.nom} (bientôt disponible) : ${a.resume}`
        : `- [${a.nom}](${withRef(a.url)}) : ${a.resume}`,
    ),
  );

  const body = [
    "# Konsent",
    "",
    `> Konsent est un service français d'audit technique automatisé du consentement aux cookies et traceurs (article 82 de la loi n° 78-17, RGPD). Il observe ce qui se dépose avant toute réponse du visiteur, après un refus et après une acceptation, identifie les destinataires et leur juridiction effective, et rattache chaque constat à une règle d'un référentiel public de ${RULEPACK.total} règles (version ${RULEPACK.version}). Édité par ${EDITOR.legalName} (${EDITOR.tradeName}), Lyon.`,
    "",
    "Konsent produit des constats techniques, pas des qualifications juridiques : un rapport ne constitue ni une consultation juridique ni une garantie de conformité. Le service est indépendant de toute plateforme de consentement. Contenus en français.",
    "",
    "## Pages clés",
    "",
    link("/", "Accueil et audit gratuit", "lancer une analyse sans inscription"),
    link("/fonctionnalites", "Fonctionnalités"),
    link("/methodologie", "Méthodologie", "protocole en trois phases, limites de la détection"),
    link("/tarifs", "Tarifs"),
    link("/sources", "Sources", "textes, délibérations et décisions sur lesquels repose le référentiel"),
    link("/veille", "Veille réglementaire", "textes en vigueur, projets et textes retirés, chacun avec son statut"),
    link("/juridictions", "Juridictions", "statut d'adéquation des pays de destination"),
    link("/contact", "Contact"),
    "",
    "## Référentiel et bases de connaissance",
    "",
    link("/regles", "Référentiel de règles", `${RULEPACK.total} règles versionnées et sourcées, une fiche par règle (/regles/{identifiant}) ; familles : ${families}`),
    link("/traceurs", "Base des traceurs", `${TRACKERS.length} services tiers : finalité, entité destinataire, société mère, juridiction effective, cookies`),
    link("/cookies", "Index des cookies", `${COOKIES.length} cookies nommés : éditeur, finalité, durée, consentement requis ou non`),
    link("/guides", "Guides de correction", `${GUIDES.length} guides, un par service : comment le bloquer avant consentement, avec le code`),
    link("/glossaire", "Glossaire", `${GLOSSARY.length} termes définis avec leur référence`),
    link("/secteurs", "Fiches par secteur", SECTORS.map((s) => s.name).join(", ")),
    ...SECTORS.map((s) => link(`/secteurs/${s.slug}`, s.title)),
    "",
    "## API",
    "",
    link("/api/openapi.json", "Spécification OpenAPI", "description complète de l'API publique"),
    link("/api/rulepack", "Référentiel (JSON)", "toutes les règles, familles, sévérités et références"),
    link("/api/vendors", "Base des destinataires (JSON)"),
    link("/api/regwatch", "Veille réglementaire (JSON)"),
    link("/api/juridictions", "Couche multi-juridiction (JSON)"),
    link("/api/scan", "Analyse d'une adresse", "GET avec le paramètre url ; limitée en débit"),
    "",
    "## Flux",
    "",
    link("/veille/rss.xml", "Veille réglementaire (RSS 2.0)"),
    link("/veille/feed.json", "Veille réglementaire (JSON Feed 1.1)"),
    "",
    "## Outils gratuits",
    "",
    ...FREE_TOOLS.filter((t) => t.available).map((t) => link(toolHref(t), t.title, t.question)),
    "",
    "## Optional",
    "",
    link("/mentions-legales", "Mentions légales"),
    link("/confidentialite", "Politique de confidentialité"),
    link("/accessibilite", "Déclaration d'accessibilité"),
    link("/plan-du-site", "Plan du site"),
    `- [Sitemap XML](${B}/sitemap.xml)`,
    "",
    "## Écosystème KAYZEN",
    "",
    ...ecosystem,
    "",
    "## Éditeur",
    "",
    "KAYZEN, Lyon — https://www.kayzen-lyon.com/",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
