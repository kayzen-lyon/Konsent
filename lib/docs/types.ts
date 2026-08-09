/**
 * Modèle commun aux gabarits documentaires (M08).
 *
 * Contraintes de génération (§9.3 du PRD), appliquées à tous les documents :
 *
 *  1. Aucun modèle de langage. Gabarits déterministes : coût nul, sortie
 *     stable, aucun risque d'hallucination juridique.
 *  2. Toute variable inconnue apparaît en clair sous la forme
 *     [[À COMPLÉTER : …]]. Un document qui invente est pire qu'un document
 *     absent.
 *  3. Chaque clause porte sa référence normative, consultable.
 *  4. Mention de génération en pied, avec obligation de faire valider.
 */

export interface DocSection {
  id: string;
  heading: string;
  body: readonly string[];
  /** Fondement normatif de la clause. */
  clauseRef?: string;
  table?: {
    columns: readonly string[];
    rows: readonly (readonly string[])[];
  };
  /** Liste à puces, quand la forme s'y prête mieux qu'un paragraphe. */
  bullets?: readonly string[];
}

export interface GeneratedDoc {
  /** Identifiant de gabarit, ex. D08. */
  templateId: string;
  slug: string;
  title: string;
  subtitle: string;
  generatedAt: string;
  /** Champs que le générateur refuse d'inventer. */
  todos: readonly string[];
  sections: readonly DocSection[];
  footer: string;
}

export interface DocTemplate {
  id: string;
  slug: string;
  title: string;
  /** À quoi sert ce document, en une phrase. */
  purpose: string;
  legalBasis: string;
  /** Public destinataire : publié sur le site, ou interne. */
  audience: "public" | "interne" | "contractuel";
  /** Le scan alimente-t-il ce document ? */
  fedByScan: boolean;
}

export const TEMPLATES: readonly DocTemplate[] = [
  {
    id: "D02",
    slug: "politique-cookies",
    title: "Politique de gestion des cookies",
    purpose:
      "Informer vos visiteurs des traceurs déposés, de leur finalité, de leur durée et de leurs destinataires.",
    legalBasis: "Article 82 de la loi n° 78-17 · RGPD, article 13",
    audience: "public",
    fedByScan: true,
  },
  {
    id: "D01",
    slug: "politique-confidentialite",
    title: "Politique de confidentialité",
    purpose:
      "Informer les personnes concernées de l'ensemble des traitements que vous mettez en œuvre.",
    legalBasis: "RGPD, articles 12 à 14",
    audience: "public",
    fedByScan: true,
  },
  {
    id: "D03",
    slug: "mentions-legales",
    title: "Mentions légales",
    purpose:
      "Identifier l'éditeur, le directeur de publication et l'hébergeur du site, comme la loi l'impose.",
    legalBasis: "LCEN, article 6-III",
    audience: "public",
    fedByScan: true,
  },
  {
    id: "D08",
    slug: "registre-traitements",
    title: "Registre des activités de traitement",
    purpose:
      "Inventorier vos traitements. C'est la première pièce qu'un contrôleur demande.",
    legalBasis: "RGPD, article 30(1)",
    audience: "interne",
    fedByScan: true,
  },
  {
    id: "D19",
    slug: "contrat-sous-traitance",
    title: "Contrat de sous-traitance (DPA)",
    purpose:
      "Encadrer la relation avec chaque prestataire qui traite des données pour votre compte.",
    legalBasis: "RGPD, article 28(3)",
    audience: "contractuel",
    fedByScan: true,
  },
  {
    id: "D15",
    slug: "procedure-violation",
    title: "Procédure de gestion des violations de données",
    purpose:
      "Savoir quoi faire dans les 72 heures. Une procédure écrite à froid vaut mieux qu'une improvisation à chaud.",
    legalBasis: "RGPD, articles 33 et 34",
    audience: "interne",
    fedByScan: false,
  },
  {
    id: "D16",
    slug: "procedure-droits",
    title: "Procédure d'exercice des droits",
    purpose:
      "Traiter les demandes d'accès, d'effacement ou d'opposition dans les délais, sans paniquer.",
    legalBasis: "RGPD, articles 12 et 15 à 22",
    audience: "interne",
    fedByScan: false,
  },
  {
    id: "D13",
    slug: "politique-conservation",
    title: "Politique de conservation et de purge",
    purpose:
      "Fixer une durée par catégorie de données, et la purge qui l'applique. Une durée annoncée mais non appliquée est le manquement le plus banal.",
    legalBasis: "RGPD, article 5(1)(e)",
    audience: "interne",
    fedByScan: true,
  },
  {
    id: "D18",
    slug: "tia",
    title: "Analyse d'impact des transferts (TIA)",
    purpose:
      "Évaluer, destinataire par destinataire, si les garanties invoquées résistent au droit du pays de destination.",
    legalBasis: "Arrêt Schrems II · recommandations CEPD 01/2020",
    audience: "interne",
    fedByScan: true,
  },
  {
    id: "D09",
    slug: "registre-sous-traitant",
    title: "Registre des activités de traitement — sous-traitant",
    purpose:
      "Le registre que doit tenir quiconque traite des données pour le compte d'un client. Distinct du D08, et régulièrement oublié.",
    legalBasis: "RGPD, article 30(2)",
    audience: "interne",
    fedByScan: true,
  },
  {
    id: "D10",
    slug: "registre-violations",
    title: "Registre des violations de données",
    purpose:
      "Consigner toute violation, y compris celle qu'on décide de ne pas notifier — c'est cette trace qui prouve que l'analyse a été faite.",
    legalBasis: "RGPD, article 33(5)",
    audience: "interne",
    fedByScan: false,
  },
  {
    id: "D11",
    slug: "registre-demandes",
    title: "Registre des demandes d'exercice de droits",
    purpose:
      "Démontrer que chaque demande a reçu réponse dans le mois. Sans trace, c'est la parole du demandeur qui l'emporte.",
    legalBasis: "RGPD, article 12(3)",
    audience: "interne",
    fedByScan: false,
  },
  {
    id: "D12",
    slug: "registre-consentements",
    title: "Registre des consentements — spécification technique",
    purpose:
      "Ce qu'il faut journaliser pour pouvoir démontrer un consentement. Sans ces éléments, un consentement recueilli ne se prouve pas.",
    legalBasis: "RGPD, article 7(1)",
    audience: "interne",
    fedByScan: true,
  },
  {
    id: "D14",
    slug: "pssi",
    title: "Politique de sécurité des systèmes d'information — socle",
    purpose:
      "Les mesures de l'article 32, dont celles que l'analyse constate de l'extérieur : en-têtes, transport, politique de contenu.",
    legalBasis: "RGPD, article 32",
    audience: "interne",
    fedByScan: true,
  },
  {
    id: "D24",
    slug: "designation-dpo",
    title: "Lettre de désignation du délégué à la protection des données",
    purpose:
      "Désigner un délégué en lui donnant réellement les garanties d'indépendance de l'article 38 — sans quoi la désignation est de façade.",
    legalBasis: "RGPD, articles 37 à 39",
    audience: "interne",
    fedByScan: false,
  },
];

export function getTemplate(slug: string): DocTemplate | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}

/** Marqueur de champ manquant. Jamais rempli au jugé. */
export function todo(label: string): string {
  return `[[À COMPLÉTER : ${label}]]`;
}

/** Collecteur de champs manquants, pour les lister en tête de document. */
export class TodoTracker {
  private readonly seen: string[] = [];

  mark(label: string): string {
    if (!this.seen.includes(label)) this.seen.push(label);
    return todo(label);
  }

  list(): readonly string[] {
    return this.seen;
  }
}

/** Rendu Markdown commun, pour export et reprise dans un traitement de texte. */
export function renderMarkdown(doc: GeneratedDoc): string {
  const out: string[] = [`# ${doc.title}`, "", `**${doc.subtitle}**`, ""];

  if (doc.todos.length > 0) {
    out.push(
      `> ${doc.todos.length} information(s) restent à compléter avant toute publication :`,
      ...doc.todos.map((t) => `> - ${t}`),
      "",
    );
  }

  for (const s of doc.sections) {
    out.push(`## ${s.heading}`, "");
    for (const p of s.body) out.push(p, "");
    if (s.bullets) {
      for (const b of s.bullets) out.push(`- ${b}`);
      out.push("");
    }
    if (s.table) {
      out.push(`| ${s.table.columns.join(" | ")} |`);
      out.push(`| ${s.table.columns.map(() => "---").join(" | ")} |`);
      for (const row of s.table.rows) out.push(`| ${row.join(" | ")} |`);
      out.push("");
    }
    if (s.clauseRef) out.push(`> Fondement : ${s.clauseRef}`, "");
  }

  out.push("---", "", doc.footer, "");
  return out.join("\n");
}
