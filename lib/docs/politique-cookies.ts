import { EDITOR } from "../disclaimer";
import type { ScanResult } from "../engine/types";
import { CATEGORY_LABELS, CONSENT_REQUIRED_CATEGORIES } from "../trackers/db";
import type { TrackerEntity } from "../trackers/types";

/**
 * M08 — Doc Factory, premier gabarit.
 *
 * Principe (§9.1) : le document est alimenté par le SCAN, pas par un
 * formulaire. Les traceurs listés sont ceux réellement observés, ce qui rend
 * structurellement impossible la désynchronisation entre la politique
 * publiée et la réalité du site (règle KZC-DOC-016).
 *
 * Contraintes de génération (§9.3) :
 *  - aucun modèle de langage : gabarit déterministe, coût nul, sortie stable ;
 *  - toute variable inconnue apparaît en clair sous la forme [[À COMPLÉTER]],
 *    jamais silencieusement inventée. Un document qui invente est pire
 *    qu'un document absent.
 */

export interface DocSection {
  id: string;
  heading: string;
  /** Paragraphes de texte. */
  body: readonly string[];
  /** Référence normative de la clause, affichée en mode expert (§9.3). */
  clauseRef?: string;
  table?: {
    columns: readonly string[];
    rows: readonly (readonly string[])[];
  };
}

export interface GeneratedDoc {
  title: string;
  subtitle: string;
  generatedAt: string;
  /** Variables non renseignées, listées explicitement pour l'utilisateur. */
  todos: readonly string[];
  sections: readonly DocSection[];
  footer: string;
}

const TODO = (label: string) => `[[À COMPLÉTER : ${label}]]`;

function needsConsent(t: TrackerEntity): boolean {
  return !t.exemptEligible && t.categories.some((c) => CONSENT_REQUIRED_CATEGORIES.has(c));
}

/**
 * Le marqueur passe par le collecteur, il ne se fabrique pas sur place.
 *
 * Un `[[À COMPLÉTER]]` posé dans le corps sans être inscrit dans `todos` ne
 * remonte pas en tête du document : le lecteur publie alors une politique
 * trouée sans qu'aucun avertissement le lui ait dit. C'est exactement ce que
 * `scripts/test-docs.mjs` vérifie désormais sur tous les gabarits.
 */
function lifetimeLabel(t: TrackerEntity, track: (label: string) => string): string {
  if (!t.cookies || t.cookies.length === 0) return track("durée de vie");
  const max = t.cookies.reduce<number | null>((acc, c) => {
    if (c.maxLifetimeDays === null) return acc;
    return acc === null ? c.maxLifetimeDays : Math.max(acc, c.maxLifetimeDays);
  }, null);
  return max === null ? "session" : `${max} jours`;
}

export function generateCookiePolicy(scan: ScanResult): GeneratedDoc {
  const todos: string[] = [];
  const track = (label: string) => {
    if (!todos.includes(label)) todos.push(label);
    return TODO(label);
  };

  const vendors = [...scan.vendors].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const consentVendors = vendors.filter(needsConsent);
  const exemptVendors = vendors.filter((v) => !needsConsent(v));
  const outsideEea = vendors.filter((v) => v.adequacy !== "EEA");

  const sections: DocSection[] = [];

  sections.push({
    id: "objet",
    heading: "1. Objet",
    clauseRef: "RGPD, art. 12 · art. 82 de la loi n° 78-17 du 6 janvier 1978 modifiée",
    body: [
      `La présente politique décrit les traceurs déposés ou lus lors de votre navigation sur le site ${scan.hostname}, leur finalité, leur durée de conservation et leurs destinataires.`,
      `Elle est publiée par ${track("dénomination sociale de l'éditeur")}, ${track("forme juridique et capital")}, immatriculée sous le numéro ${track("SIREN")}, dont le siège est situé ${track("adresse du siège")}.`,
      "On désigne par « traceur » tout cookie, pixel, script ou technique équivalente permettant de stocker des informations dans votre équipement terminal ou d'y accéder.",
    ],
  });

  sections.push({
    id: "base",
    heading: "2. Fondement du recueil de votre accord",
    clauseRef: "Article 82 de la loi n° 78-17 modifiée · RGPD, art. 4(11) et 7",
    body: [
      "Le dépôt et la lecture de traceurs qui ne sont pas strictement nécessaires à la fourniture du service que vous demandez supposent votre consentement préalable, libre, spécifique, éclairé et univoque.",
      "Vous pouvez accepter ou refuser ces traceurs, finalité par finalité. Le refus est aussi simple que l'acceptation et n'a pas de conséquence sur votre accès au contenu.",
      "Vous pouvez retirer votre consentement à tout moment. Le retrait est aussi simple que l'octroi et ne remet pas en cause la licéité des traitements effectués avant ce retrait.",
    ],
  });

  if (consentVendors.length > 0) {
    sections.push({
      id: "soumis",
      heading: "3. Traceurs soumis à votre consentement",
      clauseRef: "RGPD, art. 13(1)(e) · CNIL, délibération n° 2020-091, pt. 29",
      body: [
        `Les services suivants ont été identifiés sur ce site le ${new Date(scan.scannedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })}. Ils ne sont déposés qu'après recueil de votre accord.`,
      ],
      table: {
        columns: ["Service", "Éditeur", "Finalité", "Durée", "Pays"],
        rows: consentVendors.map((v) => [
          v.name,
          v.entity,
          v.categories.map((c) => CATEGORY_LABELS[c] ?? c).join(", "),
          lifetimeLabel(v, track),
          v.effectiveJurisdiction,
        ]),
      },
    });
  }

  if (exemptVendors.length > 0) {
    sections.push({
      id: "exemptes",
      heading: `${consentVendors.length > 0 ? "4" : "3"}. Traceurs exemptés de consentement`,
      clauseRef: "Article 82 de la loi n° 78-17 modifiée · CNIL, recommandation mesure d'audience",
      body: [
        "Les traceurs suivants sont, sous réserve de leur configuration effective, strictement nécessaires à la fourniture du service ou relèvent d'une exemption. Leur qualification doit être confirmée au regard de votre usage réel.",
      ],
      table: {
        columns: ["Service", "Éditeur", "Rôle", "Pays"],
        rows: exemptVendors.map((v) => [
          v.name,
          v.entity,
          v.categories.map((c) => CATEGORY_LABELS[c] ?? c).join(", "),
          v.effectiveJurisdiction,
        ]),
      },
    });
  }

  const transferIndex = 3 + (consentVendors.length > 0 ? 1 : 0) + (exemptVendors.length > 0 ? 1 : 0);

  if (outsideEea.length > 0) {
    sections.push({
      id: "transferts",
      heading: `${transferIndex}. Transferts hors Union européenne`,
      clauseRef: "RGPD, art. 13(1)(f) et art. 44 à 49",
      body: [
        `Certains destinataires identifiés ci-dessus relèvent d'une juridiction située hors de l'Espace économique européen : ${outsideEea
          .map((v) => `${v.name} (${v.effectiveJurisdiction})`)
          .join(", ")}.`,
        `Ces transferts sont encadrés par ${track("garanties applicables : décision d'adéquation, clauses contractuelles types, règles d'entreprise contraignantes")}. Vous pouvez en obtenir une copie en écrivant à ${track("adresse de contact")}.`,
        outsideEea.some((v) => v.adequacy === "NONE" || v.adequacy === "EXTENDED_ACCESS")
          ? "Certains de ces destinataires ne bénéficient d'aucune décision d'adéquation de la Commission européenne. Une analyse d'impact des transferts doit être documentée pour chacun d'eux."
          : "",
      ].filter(Boolean),
    });
  }

  sections.push({
    id: "controle",
    heading: `${transferIndex + (outsideEea.length > 0 ? 1 : 0)}. Comment exercer votre choix`,
    clauseRef: "RGPD, art. 7(3) · CNIL, délibération n° 2020-092",
    body: [
      `Vous pouvez modifier vos préférences à tout moment depuis ${track("emplacement du lien de gestion des cookies, par exemple le pied de page")}.`,
      "Vous pouvez également configurer votre navigateur pour refuser tout ou partie des traceurs. Ce réglage peut affecter le fonctionnement de certaines fonctionnalités.",
      "Votre choix est conservé pendant six mois. À l'issue de cette période, votre accord vous sera de nouveau demandé.",
    ],
  });

  sections.push({
    id: "droits",
    heading: `${transferIndex + (outsideEea.length > 0 ? 2 : 1)}. Vos droits`,
    clauseRef: "RGPD, art. 15 à 22 et art. 77",
    body: [
      "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité sur les données vous concernant.",
      `Ces droits s'exercent auprès de ${track("contact du responsable de traitement ou du délégué à la protection des données")}.`,
      "Vous pouvez introduire une réclamation auprès de la Commission nationale de l'informatique et des libertés (CNIL), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07.",
    ],
  });

  return {
    title: "Politique de gestion des cookies et autres traceurs",
    subtitle: scan.hostname,
    generatedAt: scan.scannedAt,
    todos,
    sections,
    footer: `Modèle généré par ${EDITOR.product} le ${new Date(scan.scannedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })} à partir de l'analyse de ${scan.hostname} (référentiel ${scan.rulepackVersion}). Ce document est un modèle à personnaliser et à faire valider par un professionnel du droit avant publication. Les champs signalés [[À COMPLÉTER]] doivent impérativement être renseignés.`,
  };
}

/** Rendu Markdown, pour export et reprise dans un traitement de texte. */
export function renderMarkdown(doc: GeneratedDoc): string {
  const out: string[] = [`# ${doc.title}`, "", `**${doc.subtitle}**`, ""];

  for (const s of doc.sections) {
    out.push(`## ${s.heading}`, "");
    for (const p of s.body) out.push(p, "");
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
