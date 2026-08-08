/**
 * Ressources et prompts métier.
 *
 * Les prompts ne sont pas décoratifs. Un agent à qui l'on demande « fais-moi
 * un audit » produira un résumé rassurant ou alarmiste selon la formulation de
 * la question. Ces gabarits lui imposent ce que le produit s'impose : citer ce
 * qui n'a PAS été vérifié, ne jamais qualifier une infraction, et ne jamais
 * afficher un plafond légal sans la fourchette réellement observée.
 *
 * C'est le seul endroit où les garde-fous du §3.2 peuvent être transmis à un
 * système qu'on ne contrôle pas.
 */

const BASE_URL = process.env["KONSENT_API_URL"] ?? "https://konsent-zeta.vercel.app";

export const RESOURCES = [
  {
    uri: "konsent://rulepack",
    name: "Référentiel de règles",
    description:
      "Les 139 règles d'analyse, avec référence normative, gravité, poids et statut sous le projet Digital Omnibus.",
    mimeType: "application/json",
  },
  {
    uri: "konsent://regwatch",
    name: "Veille réglementaire",
    description: "Textes applicables, projets non adoptés et jurisprudence, rattachés aux règles.",
    mimeType: "application/json",
  },
  {
    uri: "konsent://vendors",
    name: "Base des destinataires",
    description:
      "Les entités qui reçoivent les données des visiteurs : société, juridiction effective, statut d'adéquation.",
    mimeType: "application/json",
  },
  {
    uri: "konsent://jurisdictions",
    name: "Couverture multi-juridiction",
    description:
      "Les juridictions couvertes, leur régime de consentement, et le degré de qualification atteint.",
    mimeType: "application/json",
  },
  {
    uri: "konsent://templates",
    name: "Catalogue documentaire",
    description: "Les gabarits juridiques disponibles, et ceux qui sont seulement prévus.",
    mimeType: "application/json",
  },
] as const;

const RESOURCE_PATHS: Record<string, string> = {
  "konsent://rulepack": "/api/rulepack",
  "konsent://regwatch": "/api/regwatch",
  "konsent://vendors": "/api/vendors",
  "konsent://jurisdictions": "/api/juridictions",
  "konsent://templates": "/api/documents",
};

export async function readResource(uri: string): Promise<string> {
  const path = RESOURCE_PATHS[uri];
  if (!path) throw new Error(`Ressource inconnue : ${uri}`);
  const res = await fetch(`${BASE_URL}${path}`, { headers: { Accept: "application/json" } });
  return res.text();
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments: { name: string; description: string; required: boolean }[];
  build: (args: Record<string, string>) => string;
}

const RESTITUTION = [
  "",
  "Contraintes de restitution, non negociables :",
  "- Ne jamais ecrire « vous etes en infraction ». Formuler : « le comportement",
  "  observe presente un ecart avec [reference] ». Seule la CNIL ou un juge peut",
  "  qualifier une infraction.",
  "- Toujours indiquer combien de regles n'ont PAS ete evaluees, et preciser",
  "  qu'elles ne sont pas pour autant satisfaites. Appelle konsent_scan_coverage.",
  "- Ne jamais afficher un plafond legal sans la fourchette reellement observee",
  "  en procedure simplifiee. Les deux ensemble, ou aucun des deux.",
  "- Aucun logo d'autorite, aucune mise en demeure simulee, aucune fausse urgence.",
  "- Si la juridiction du client n'est pas la France, appelle",
  "  konsent_list_jurisdictions avant de conclure : sous un regime d'opposition,",
  "  un depot avant action n'est pas un ecart.",
].join("\n");

export const PROMPTS: readonly PromptDefinition[] = [
  {
    name: "audit_client_complet",
    description:
      "Analyse un site, explique les écarts à un dirigeant non technique, et propose un plan d'action chiffré.",
    arguments: [
      { name: "domaine", description: "Le site à auditer.", required: true },
      { name: "ca", description: "Chiffre d'affaires annuel en euros, si connu.", required: false },
    ],
    build: (a) =>
      [
        `Audite ${a["domaine"] ?? "[domaine]"} et restitue le resultat a un dirigeant qui n'a`,
        `aucune culture technique ni juridique.`,
        ``,
        `Marche a suivre :`,
        `1. konsent_scan_url puis konsent_scan_coverage.`,
        `2. konsent_explain_score : dis si un plafond a ete applique, et pourquoi.`,
        `3. konsent_list_vendors et konsent_transfer_analysis : nomme les societes qui`,
        `   recoivent les donnees et dis dans quel pays elles partent.`,
        a["ca"]
          ? `4. konsent_remediation_plan puis konsent_risk_exposure avec revenueEur=${a["ca"]}.`
          : `4. konsent_remediation_plan.`,
        ``,
        `Structure attendue : ce qui se passe sur le site en trois phrases, les trois`,
        `ecarts les plus graves expliques sans jargon, ou partent les donnees, ce que`,
        `coute la correction.`,
        RESTITUTION,
      ].join("\n"),
  },
  {
    name: "preparer_controle",
    description:
      "Assemble les pièces qu'une autorité demanderait en premier : constats, preuve, registre, documents.",
    arguments: [{ name: "domaine", description: "Le site concerné.", required: true }],
    build: (a) =>
      [
        `Prepare le dossier de ${a["domaine"] ?? "[domaine]"} en vue d'un controle.`,
        ``,
        `1. konsent_scan_url et konsent_scan_coverage.`,
        `2. konsent_evidence_bundle : archive signee. Precise explicitement qu'elle`,
        `   atteste l'origine et l'integrite, PAS la date au sens d'un horodatage`,
        `   qualifie eIDAS.`,
        `3. konsent_build_register : registre article 30.`,
        `4. konsent_list_templates puis konsent_generate_document pour la politique de`,
        `   confidentialite et la politique cookies.`,
        `5. Liste les champs [[A COMPLETER]] restants : ce sont les seules choses que`,
        `   le client doit fournir lui-meme.`,
        ``,
        `Rappelle que chaque document genere est un MODELE a faire valider par un`,
        `professionnel du droit avant publication.`,
        RESTITUTION,
      ].join("\n"),
  },
  {
    name: "revue_portefeuille",
    description: "Pour une agence : compare plusieurs domaines et hiérarchise les urgences.",
    arguments: [
      { name: "domaines", description: "Domaines séparés par des virgules.", required: true },
    ],
    build: (a) =>
      [
        `Passe en revue ce portefeuille : ${a["domaines"] ?? "[domaines]"}.`,
        ``,
        `1. konsent_scan_portfolio sur l'ensemble.`,
        `2. Pour les trois plus exposes, konsent_list_findings avec severity=CRITICAL.`,
        `3. konsent_generate_quote sur chacun de ces trois.`,
        ``,
        `Rends un tableau : domaine, score, nombre d'ecarts critiques, cout de`,
        `correction estime. Puis dis par lequel commencer et pourquoi — le critere`,
        `est la gravite reelle, pas le score seul.`,
        RESTITUTION,
      ].join("\n"),
  },
  {
    name: "verifier_avant_mise_en_ligne",
    description:
      "Contrôle de non-régression avant une mise en production, pour une chaîne d'intégration continue.",
    arguments: [
      { name: "url", description: "URL de la préproduction ou de l'aperçu.", required: true },
      {
        name: "reference",
        description: "Jeton de référence de la version en ligne.",
        required: false,
      },
    ],
    build: (a) =>
      [
        `Verifie ${a["url"] ?? "[url]"} avant mise en ligne.`,
        ``,
        a["reference"]
          ? `konsent_diff_scans avec reference=${a["reference"]} : signale toute regression.`
          : `konsent_scan_url puis konsent_list_findings avec severity=CRITICAL.`,
        ``,
        `Conclus par un verdict binaire : BLOQUANT s'il existe au moins un ecart`,
        `critique de la famille DEPOT ou REFUS, sinon NON BLOQUANT. Justifie en une`,
        `phrase. N'ajoute aucune nuance rassurante a un verdict bloquant.`,
        RESTITUTION,
      ].join("\n"),
  },
  {
    name: "expliquer_une_regle",
    description:
      "Explique une règle du référentiel, son fondement, et ce que le projet européen changerait.",
    arguments: [{ name: "regle", description: "Identifiant, ex. KZC-DEPOT-001.", required: true }],
    build: (a) =>
      [
        `Explique la regle ${a["regle"] ?? "[regle]"}.`,
        ``,
        `1. konsent_explain_rule.`,
        `2. konsent_regwatch sur cette regle.`,
        `3. konsent_rule_applicability pour FR, CH et US_CA.`,
        ``,
        `Dis : ce que la regle constate, sur quel texte elle s'appuie, comment on`,
        `corrige, et ce que le projet Digital Omnibus changerait. Rappelle que ce`,
        `projet N'EST PAS adopte et ne doit fonder aucune decision aujourd'hui.`,
      ].join("\n"),
  },
];
