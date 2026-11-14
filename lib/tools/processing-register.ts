import { EDITOR } from "../disclaimer";
import type { DocSection, GeneratedDoc } from "../docs/types";
import { DocTracker, formatDateFr, slugPart } from "./legal-notice";

/**
 * Générateur de registre des activités de traitement (RGPD, art. 30, § 1) —
 * logique pure, configuration vers fiches. Aucun appel réseau.
 *
 * Structure reprise du modèle de registre publié par la CNIL : une fiche par
 * traitement (acteurs, finalités, catégories de personnes et de données,
 * destinataires, transferts, durées, mesures de sécurité). Les traitements
 * types arrivent préremplis à partir des référentiels de la CNIL et des
 * textes cités ; ce sont des points de départ, la fiche doit décrire la
 * pratique réelle de l'organisme.
 */

export interface RegisterEntry {
  id: string;
  enabled: boolean;
  /** Numéro de référence interne de la fiche. */
  ref: string;
  label: string;
  createdAt: string;
  purposes: string;
  basis: string;
  persons: string;
  data: string;
  /** Données sensibles (art. 9) ou d'infraction (art. 10), le cas échéant. */
  sensitive: string;
  recipients: string;
  processors: string;
  /** Pays hors UE/EEE, vide si aucun transfert. */
  transferCountries: string;
  transferGuarantees: string;
  retention: string;
  security: string;
  /** Références : référentiel CNIL, textes. Affichées dans la fiche. */
  references: string;
}

const SECURITY_BASE =
  "Habilitations selon le besoin d'en connaître ; authentification individuelle et mots de passe robustes ; journalisation des accès ; sauvegardes régulières ; mises à jour de sécurité ; chiffrement des échanges (HTTPS/TLS) ; contrats de sous-traitance conformes à l'art. 28.";

function preset(p: Omit<RegisterEntry, "enabled" | "createdAt" | "processors" | "security"> & {
  processors?: string;
  security?: string;
}): RegisterEntry {
  return {
    enabled: false,
    createdAt: "",
    processors: "",
    security: SECURITY_BASE,
    ...p,
  };
}

export const REGISTER_PRESETS: readonly RegisterEntry[] = [
  preset({
    id: "clients",
    ref: "T-01",
    label: "Gestion des clients",
    purposes:
      "Gestion des contrats, commandes, livraisons, factures et de la relation client (réclamations, service après-vente, garanties légales).",
    basis: "Exécution du contrat (art. 6, § 1, b) ; obligation légale pour la facturation (art. 6, § 1, c).",
    persons: "Clients et leurs interlocuteurs.",
    data: "Identité, coordonnées, données relatives aux commandes et aux paiements (hors données complètes de carte), historique de la relation, correspondances.",
    sensitive: "",
    recipients: "Services commercial, comptable et logistique habilités ; transporteurs ; prestataire de paiement.",
    transferCountries: "",
    transferGuarantees: "",
    retention:
      "Durée de la relation commerciale, puis 3 ans à des fins de prospection ; pièces comptables : 10 ans (code de commerce, art. L. 123-22).",
    references:
      "Référentiel CNIL « gestion des activités commerciales » (délibération n° 2021-131 du 23 septembre 2021) ; code de commerce, art. L. 123-22.",
  }),
  preset({
    id: "prospection",
    ref: "T-02",
    label: "Prospection commerciale",
    purposes: "Envoi d'offres commerciales, sollicitations, organisation d'opérations promotionnelles.",
    basis:
      "Intérêt légitime (art. 6, § 1, f) pour les clients (produits ou services analogues) et les professionnels ; consentement (art. 6, § 1, a) pour la prospection électronique des particuliers non clients.",
    persons: "Prospects et clients.",
    data: "Identité, coordonnées, données relatives à la relation commerciale, choix en matière de prospection (consentement, opposition).",
    sensitive: "",
    recipients: "Service commercial et marketing ; prestataire d'envoi de courriels.",
    transferCountries: "",
    transferGuarantees: "",
    retention:
      "3 ans à compter de la fin de la relation commerciale ou du dernier contact émanant du prospect ; liste d'opposition : 3 ans.",
    references:
      "Référentiel CNIL « gestion des activités commerciales » (délibération n° 2021-131) ; code des postes et des communications électroniques, art. L. 34-5.",
  }),
  preset({
    id: "rh",
    ref: "T-03",
    label: "Gestion du personnel et paie",
    purposes:
      "Gestion administrative du personnel, établissement de la paie et des déclarations sociales, gestion des carrières, de la formation et des temps.",
    basis: "Exécution du contrat de travail (art. 6, § 1, b) ; obligations légales (art. 6, § 1, c).",
    persons: "Salariés, stagiaires, intérimaires, anciens salariés.",
    data: "Identité, situation familiale, vie professionnelle, rémunération, numéro de sécurité sociale (NIR), coordonnées bancaires, temps de travail, absences.",
    sensitive:
      "Le cas échéant : données de santé limitées à ce qu'imposent les obligations légales (arrêts de travail, aptitude, handicap) ; NIR, dont l'usage est encadré.",
    recipients:
      "Service des ressources humaines et de la paie ; organismes sociaux et fiscaux ; mutuelle et prévoyance ; expert-comptable ; médecine du travail.",
    transferCountries: "",
    transferGuarantees: "",
    retention:
      "Durée du contrat de travail ; bulletins de paie (double) : 5 ans (code du travail, art. L. 3243-4) ; au-delà, durées de prescription applicables. Vérifier chaque catégorie avec le référentiel.",
    references:
      "Référentiel CNIL « gestion du personnel » (délibération n° 2019-160 du 21 novembre 2019) ; code du travail, art. L. 3243-4.",
  }),
  preset({
    id: "recrutement",
    ref: "T-04",
    label: "Recrutement",
    purposes: "Réception, examen et suivi des candidatures ; constitution d'un vivier de candidats avec leur accord.",
    basis: "Mesures précontractuelles (art. 6, § 1, b) ; consentement pour la conservation dans un vivier (art. 6, § 1, a).",
    persons: "Candidats.",
    data: "Curriculum vitae, lettre de motivation, coordonnées, diplômes et expériences, notes d'entretien.",
    sensitive: "",
    recipients: "Personnes en charge du recrutement et managers concernés ; cabinet de recrutement le cas échéant.",
    transferCountries: "",
    transferGuarantees: "",
    retention:
      "Durée du processus ; en l'absence de suite, 2 ans au plus à compter du dernier contact, sauf opposition du candidat.",
    references:
      "Référentiel CNIL « gestion du personnel » (délibération n° 2019-160) ; guide CNIL du recrutement ; code du travail, art. L. 1221-6 et suivants.",
  }),
  preset({
    id: "contact",
    ref: "T-05",
    label: "Site web : formulaire de contact",
    purposes: "Réponse aux demandes adressées par le formulaire de contact du site ou par courriel.",
    basis: "Intérêt légitime (art. 6, § 1, f) : répondre aux personnes qui nous sollicitent.",
    persons: "Visiteurs du site, prospects, clients.",
    data: "Nom, prénom, adresse électronique, téléphone le cas échéant, contenu du message, date d'envoi.",
    sensitive: "",
    recipients: "Personnes habilitées à traiter les demandes ; hébergeur du site.",
    transferCountries: "",
    transferGuarantees: "",
    retention:
      "Le temps de traiter la demande ; 3 ans à compter du dernier contact lorsque la demande émane d'un prospect.",
    references: "Référentiel CNIL « gestion des activités commerciales » (délibération n° 2021-131).",
  }),
  preset({
    id: "newsletter",
    ref: "T-06",
    label: "Lettre d'information",
    purposes: "Envoi de la lettre d'information aux personnes abonnées ; mesure de son ouverture le cas échéant.",
    basis: "Consentement (art. 6, § 1, a).",
    persons: "Abonnés.",
    data: "Adresse électronique, date et preuve du consentement, statistiques d'ouverture le cas échéant.",
    sensitive: "",
    recipients: "Service communication ; prestataire d'envoi de courriels.",
    transferCountries: "",
    transferGuarantees: "",
    retention:
      "Jusqu'au désabonnement ; à défaut, 3 ans à compter du dernier contact actif. Preuve du consentement conservée le temps nécessaire à la démontrer.",
    references:
      "RGPD, art. 7, § 1 ; code des postes et des communications électroniques, art. L. 34-5.",
  }),
  preset({
    id: "audience",
    ref: "T-07",
    label: "Mesure d'audience du site",
    purposes: "Mesure de la fréquentation du site et amélioration de son ergonomie.",
    basis:
      "Consentement (art. 82 de la loi n° 78-17 ; art. 6, § 1, a), sauf solution remplissant les conditions d'exemption définies par la CNIL.",
    persons: "Visiteurs du site.",
    data: "Identifiant du traceur, pages consultées, durée de visite, données relatives au terminal, adresse IP tronquée.",
    sensitive: "",
    recipients: "Service communication ; éditeur de la solution de mesure d'audience.",
    transferCountries: "",
    transferGuarantees: "",
    retention: "Traceurs : 13 mois au plus ; données collectées : 25 mois au plus.",
    references:
      "Loi n° 78-17, art. 82 ; lignes directrices et recommandation CNIL « cookies et autres traceurs » (délibérations n° 2020-091 et 2020-092 du 17 septembre 2020).",
  }),
  preset({
    id: "video",
    ref: "T-08",
    label: "Vidéosurveillance / vidéoprotection",
    purposes: "Sécurité des biens et des personnes ; prévention des atteintes aux biens.",
    basis: "Intérêt légitime (art. 6, § 1, f) : sécurité des locaux.",
    persons: "Salariés, visiteurs, clients.",
    data: "Images des personnes filmées, date et heure, lieu de la caméra.",
    sensitive: "",
    recipients: "Personnes habilitées et nommément désignées (direction, sécurité) ; forces de l'ordre sur réquisition.",
    transferCountries: "",
    transferGuarantees: "",
    retention:
      "Quelques jours, un mois au plus (lieux ouverts au public : code de la sécurité intérieure, art. L. 252-5), sauf procédure en cours.",
    references:
      "Code de la sécurité intérieure, art. L. 251-1 et suivants (lieux ouverts au public, autorisation préfectorale) ; code du travail, art. L. 1222-4 et L. 2312-38 (information des salariés et du CSE) ; fiches CNIL « vidéosurveillance ».",
    security:
      "Accès aux images limité aux personnes habilitées ; journalisation des consultations ; écrans non visibles du public ; pas de caméra filmant les postes de travail en continu ni les zones de pause ; " +
      SECURITY_BASE,
  }),
  preset({
    id: "compta",
    ref: "T-09",
    label: "Comptabilité et gestion des fournisseurs",
    purposes: "Tenue de la comptabilité, gestion des fournisseurs, paiements et recouvrement.",
    basis: "Obligation légale (art. 6, § 1, c) ; exécution des contrats fournisseurs (art. 6, § 1, b).",
    persons: "Clients, fournisseurs et leurs interlocuteurs.",
    data: "Identité, coordonnées, coordonnées bancaires, factures, règlements.",
    sensitive: "",
    recipients: "Service comptable ; expert-comptable ; commissaire aux comptes le cas échéant ; administration fiscale.",
    transferCountries: "",
    transferGuarantees: "",
    retention: "Pièces et documents comptables : 10 ans à compter de la clôture de l'exercice (code de commerce, art. L. 123-22).",
    references: "Code de commerce, art. L. 123-22 ; livre des procédures fiscales, art. L. 102 B.",
  }),
  preset({
    id: "journaux",
    ref: "T-10",
    label: "Sécurité du système d'information (journaux)",
    purposes: "Journalisation des accès et des opérations pour détecter les incidents et en identifier l'origine.",
    basis: "Obligation de sécurité (art. 32) et intérêt légitime (art. 6, § 1, f).",
    persons: "Utilisateurs du système d'information, visiteurs du site.",
    data: "Identifiant, adresse IP, date et heure, opération effectuée.",
    sensitive: "",
    recipients: "Administrateurs habilités ; hébergeur ou infogérant.",
    transferCountries: "",
    transferGuarantees: "",
    retention: "6 mois à 1 an, sauf obligation légale ou incident justifiant une durée plus longue.",
    references: "RGPD, art. 32 ; recommandation CNIL relative à la journalisation (délibération n° 2021-122 du 14 octobre 2021).",
  }),
];

export interface RegisterConfig {
  orgName: string;
  orgAddress: string;
  orgSiren: string;
  orgContact: string;
  /** Représentant dans l'Union, pour un responsable établi hors UE (art. 27). */
  representative: string;
  dpo: string;
  updatedAt: string;
  entries: RegisterEntry[];
}

export const DEFAULT_REGISTER: RegisterConfig = {
  orgName: "",
  orgAddress: "",
  orgSiren: "",
  orgContact: "",
  representative: "",
  dpo: "",
  updatedAt: "",
  entries: REGISTER_PRESETS.map((p) => ({ ...p, enabled: ["clients", "contact"].includes(p.id) })),
};

let customSeq = 0;

/** Fiche vierge pour un traitement propre à l'organisme. */
export function blankEntry(index: number): RegisterEntry {
  customSeq += 1;
  return {
    id: `perso-${customSeq}`,
    enabled: true,
    ref: `T-${String(index).padStart(2, "0")}`,
    label: "",
    createdAt: "",
    purposes: "",
    basis: "",
    persons: "",
    data: "",
    sensitive: "",
    recipients: "",
    processors: "",
    transferCountries: "",
    transferGuarantees: "",
    retention: "",
    security: SECURITY_BASE,
    references: "",
  };
}

interface Row {
  field: string;
  value: string;
}

function entryRows(e: RegisterEntry, c: RegisterConfig, t: DocTracker): Row[] {
  const name = e.label.trim() || "intitulé du traitement";
  const v = (value: string, label: string) => t.val(value, `${label} — ${name}`);
  const transfer = e.transferCountries.trim();
  return [
    { field: "Référence", value: v(e.ref, "référence") },
    { field: "Date de création", value: e.createdAt ? formatDateFr(e.createdAt) : t.mark(`date de création — ${name}`) },
    { field: "Responsable du traitement", value: t.val(c.orgName, "nom de l'organisme") },
    { field: "Délégué à la protection des données", value: c.dpo.trim() || "Aucun délégué désigné." },
    { field: "Finalité(s)", value: v(e.purposes, "finalités") },
    { field: "Base légale", value: v(e.basis, "base légale") },
    { field: "Catégories de personnes concernées", value: v(e.persons, "catégories de personnes") },
    { field: "Catégories de données", value: v(e.data, "catégories de données") },
    { field: "Données sensibles ou d'infraction", value: e.sensitive.trim() || "Aucune." },
    { field: "Destinataires", value: v(e.recipients, "destinataires") },
    { field: "Sous-traitants", value: v(e.processors, "sous-traitants (nom, prestation, pays)") },
    {
      field: "Transferts hors de l'UE/EEE",
      value: transfer ? transfer : "Aucun transfert hors de l'Union européenne ou de l'Espace économique européen.",
    },
    ...(transfer
      ? [{ field: "Garanties encadrant le transfert", value: v(e.transferGuarantees, "garanties du transfert (art. 45 à 49)") }]
      : []),
    { field: "Durées de conservation", value: v(e.retention, "durées de conservation") },
    { field: "Mesures de sécurité", value: v(e.security, "mesures de sécurité") },
    { field: "Références", value: e.references.trim() || "—" },
  ];
}

export function generateRegisterDoc(c: RegisterConfig): GeneratedDoc {
  const t = new DocTracker();
  const org = t.val(c.orgName, "nom de l'organisme");
  const updated = c.updatedAt ? formatDateFr(c.updatedAt) : t.mark("date de mise à jour");
  const active = c.entries.filter((e) => e.enabled);

  const sections: DocSection[] = [
    {
      id: "responsable",
      heading: "Responsable du traitement",
      body: [],
      table: {
        columns: ["Rubrique", "Information"],
        rows: [
          ["Organisme", org],
          ["Adresse", t.val(c.orgAddress, "adresse de l'organisme")],
          ["SIREN", c.orgSiren.trim() || "—"],
          ["Contact", t.val(c.orgContact, "contact (nom, fonction, courriel)")],
          ["Représentant dans l'Union", c.representative.trim() || "Sans objet (organisme établi dans l'Union)."],
          ["Délégué à la protection des données", c.dpo.trim() || "Aucun délégué désigné."],
        ],
      },
      clauseRef: "RGPD, art. 30, § 1, a)",
    },
    {
      id: "liste",
      heading: "Liste des traitements",
      body: active.length === 0 ? [t.mark("au moins un traitement")] : [],
      bullets: active.map((e) => `${e.ref.trim() || "—"} · ${e.label.trim() || "[[À COMPLÉTER : intitulé du traitement]]"}`),
    },
  ];

  active.forEach((e, i) => {
    sections.push({
      id: `fiche-${e.id}`,
      heading: `Fiche ${i + 1} — ${e.label.trim() || t.mark("intitulé du traitement")}`,
      body: [],
      table: {
        columns: ["Rubrique", "Description"],
        rows: entryRows(e, c, t).map((r) => [r.field, r.value]),
      },
      clauseRef: "RGPD, art. 30, § 1, b) à g)",
    });
  });

  return {
    templateId: "D08",
    slug: "registre-traitements",
    title: "Registre des activités de traitement",
    subtitle: `${org} · mis à jour le ${updated}`,
    generatedAt: new Date().toISOString(),
    todos: t.list(),
    sections,
    footer: `Modèle généré avec ${EDITOR.product} (${EDITOR.productSite}), dans le navigateur, sans conservation des informations saisies. Structure inspirée du modèle de registre publié par la CNIL. Ce registre est un document interne, tenu par écrit et mis à la disposition de la CNIL sur demande (RGPD, art. 30, § 3 et 4). Il doit refléter la pratique réelle et être tenu à jour ; les marqueurs [[À COMPLÉTER]] doivent tous avoir disparu.`,
  };
}

// ─────────────────────────── Export CSV ────────────────────────────────────

const BOM = "﻿";

/**
 * Cellule CSV à séparateur « ; ». Une cellule commençant par = + - @ (ou une
 * tabulation) est préfixée d'une apostrophe : un tableur ne doit pas
 * l'interpréter comme une formule.
 */
export function csvCell(value: string): string {
  let text = value.replace(/\r\n?/g, "\n");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Une ligne par traitement, prête pour Excel en français (BOM, « ; », CRLF). */
export function renderRegisterCsv(c: RegisterConfig): string {
  const t = new DocTracker();
  const active = c.entries.filter((e) => e.enabled);
  const headers = [
    "Référence",
    "Intitulé",
    "Date de création",
    "Responsable du traitement",
    "Délégué à la protection des données",
    "Finalité(s)",
    "Base légale",
    "Catégories de personnes concernées",
    "Catégories de données",
    "Données sensibles ou d'infraction",
    "Destinataires",
    "Sous-traitants",
    "Transferts hors de l'UE/EEE",
    "Garanties encadrant le transfert",
    "Durées de conservation",
    "Mesures de sécurité",
    "Références",
  ];

  const lines = [headers.map(csvCell).join(";")];
  for (const e of active) {
    const rows = entryRows(e, c, t);
    const byField = new Map(rows.map((r) => [r.field, r.value]));
    byField.set("Intitulé", e.label.trim() || "[[À COMPLÉTER : intitulé du traitement]]");
    if (!byField.has("Garanties encadrant le transfert")) byField.set("Garanties encadrant le transfert", "Sans objet");
    lines.push(headers.map((h) => csvCell(byField.get(h) ?? "")).join(";"));
  }
  return BOM + lines.join("\r\n") + "\r\n";
}

export function registerFileBase(c: RegisterConfig): string {
  return `registre-traitements${slugPart(c.orgName)}`;
}
