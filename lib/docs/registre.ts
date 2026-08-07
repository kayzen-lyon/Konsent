import { EDITOR } from "../disclaimer";
import type { ScanResult } from "../engine/types";
import { CATEGORY_LABELS } from "../trackers/db";
import { TodoTracker, type DocSection, type GeneratedDoc } from "./types";

/**
 * D08 — Registre des activités de traitement (RGPD, art. 30(1)).
 *
 * Le registre est la première pièce demandée lors d'un contrôle, et son
 * absence constitue un manquement autonome. Il est ici pré-rempli par le
 * scan pour la partie que le scan connaît réellement : le traitement de
 * mesure d'audience et de publicité, ses destinataires et leurs
 * juridictions.
 *
 * Les traitements que le scan ne peut pas connaître — paie, recrutement,
 * gestion clients — sont proposés en canevas vide, explicitement signalés
 * comme tels. Le générateur ne prétend pas inventorier ce qu'il n'a pas vu.
 */
export function generateRegistre(scan: ScanResult): GeneratedDoc {
  const t = new TodoTracker();
  const sections: DocSection[] = [];

  const outsideEea = scan.vendors.filter((v) => v.adequacy !== "EEA");
  const trackingVendors = scan.vendors.filter((v) => !v.exemptEligible);

  sections.push({
    id: "responsable",
    heading: "1. Identité du responsable de traitement",
    clauseRef: "RGPD, article 30(1)(a)",
    body: [
      `Dénomination : ${t.mark("dénomination sociale")}`,
      `Forme juridique et capital : ${t.mark("forme juridique et capital social")}`,
      `Immatriculation : ${t.mark("SIREN et ville du greffe")}`,
      `Adresse du siège : ${t.mark("adresse du siège social")}`,
      `Représentant légal : ${t.mark("nom et qualité du représentant légal")}`,
      `Délégué à la protection des données ou référent : ${t.mark("nom et coordonnées du DPO ou du référent")}`,
    ],
  });

  // ── Traitement effectivement observé par le scan ──
  if (trackingVendors.length > 0) {
    sections.push({
      id: "traitement-audience",
      heading: "2. Traitement — Mesure d'audience et publicité en ligne",
      clauseRef: "RGPD, article 30(1)(b) à (g)",
      body: [
        `Ce traitement a été identifié automatiquement à partir de l'analyse de ${scan.hostname} du ${new Date(scan.scannedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })}. Les destinataires listés sont ceux réellement observés, et non déclarés.`,
      ],
      bullets: [
        "Finalité : mesurer la fréquentation du site, analyser le comportement des visiteurs et diffuser de la publicité ciblée.",
        `Base légale : consentement de la personne concernée (RGPD, art. 6(1)(a)) et article 82 de la loi n° 78-17 pour le dépôt des traceurs.`,
        "Catégories de personnes : visiteurs du site.",
        "Catégories de données : identifiants de terminal, adresse IP, pages consultées, horodatage, données de navigation, données techniques du terminal.",
        `Durée de conservation : ${t.mark("durée de conservation des données de mesure d'audience — 25 mois maximum recommandés")}`,
        "Mesures de sécurité : chiffrement des communications (HTTPS), contrôle des accès, journalisation.",
      ],
      table: {
        columns: ["Destinataire", "Entité contractante", "Rôle", "Pays", "Encadrement"],
        rows: scan.vendors.map((v) => [
          v.name,
          v.entity,
          v.categories.map((c) => CATEGORY_LABELS[c] ?? c).join(", "),
          v.effectiveJurisdiction,
          v.adequacy === "EEA"
            ? "Union européenne — aucun transfert"
            : v.adequacy === "ADEQUATE"
              ? "Décision d'adéquation"
              : v.adequacy === "DPF_CONDITIONAL"
                ? "Data Privacy Framework — certification à vérifier"
                : "À documenter : clauses contractuelles types et analyse d'impact",
        ]),
      },
    });
  }

  if (outsideEea.length > 0) {
    sections.push({
      id: "transferts",
      heading: "3. Transferts hors Union européenne",
      clauseRef: "RGPD, articles 30(1)(e) et 44 à 49",
      body: [
        `${outsideEea.length} destinataire(s) identifié(s) relèvent d'une juridiction située hors de l'Espace économique européen.`,
        `Garanties applicables : ${t.mark("garanties pour chaque destinataire hors adéquation — clauses contractuelles types, règles d'entreprise contraignantes, ou dérogation")}`,
        `Analyse d'impact des transferts : ${t.mark("référence et date de la TIA pour chaque destinataire hors adéquation")}`,
      ],
      table: {
        columns: ["Destinataire", "Pays", "Statut d'adéquation"],
        rows: outsideEea.map((v) => [
          v.name,
          v.effectiveJurisdiction,
          v.adequacy === "ADEQUATE"
            ? "Décision d'adéquation en vigueur"
            : v.adequacy === "DPF_CONDITIONAL"
              ? "Adéquation conditionnée à une certification DPF valide"
              : v.adequacy === "EXTENDED_ACCESS"
                ? "Aucune adéquation — juridiction à accès étatique étendu"
                : "Aucune décision d'adéquation",
        ]),
      },
    });
  }

  // ── Canevas pour les traitements que le scan ne peut pas connaître ──
  const nextIndex = 2 + (trackingVendors.length > 0 ? 1 : 0) + (outsideEea.length > 0 ? 1 : 0);

  sections.push({
    id: "autres",
    heading: `${nextIndex}. Autres traitements — à compléter`,
    clauseRef: "RGPD, article 30(1)",
    body: [
      "Un scan technique observe ce qui se passe dans le navigateur de vos visiteurs. Il ne peut rien savoir de vos traitements internes. Les traitements ci-dessous sont des canevas vides, à compléter ou à supprimer selon votre activité réelle.",
      "Nous ne les pré-remplissons pas : un registre qui décrit des traitements imaginaires est pire qu'un registre incomplet.",
    ],
    table: {
      columns: [
        "Traitement",
        "Finalité",
        "Base légale",
        "Personnes",
        "Durée",
        "Destinataires",
      ],
      rows: [
        [
          "Gestion des demandes de contact",
          t.mark("finalité"),
          "Intérêt légitime ou mesures précontractuelles",
          "Prospects",
          t.mark("durée de conservation des demandes de contact"),
          t.mark("destinataires internes et outils utilisés"),
        ],
        [
          "Gestion de la relation client",
          t.mark("finalité"),
          "Exécution du contrat",
          "Clients",
          "Durée de la relation puis prescription légale",
          t.mark("outils de gestion commerciale"),
        ],
        [
          "Prospection commerciale",
          t.mark("finalité"),
          "Consentement ou intérêt légitime selon le canal",
          "Prospects et clients",
          "3 ans à compter du dernier contact",
          t.mark("outil d'envoi et son hébergement"),
        ],
        [
          "Gestion du personnel",
          t.mark("finalité"),
          "Exécution du contrat de travail et obligations légales",
          "Salariés et candidats",
          t.mark("durées par catégorie de données RH"),
          t.mark("prestataire de paie et outils RH"),
        ],
      ],
    },
  });

  sections.push({
    id: "sous-traitants",
    heading: `${nextIndex + 1}. Sous-traitants`,
    clauseRef: "RGPD, articles 28 et 30(1)(d)",
    body: [
      "Chaque sous-traitant doit être lié par un contrat comportant les mentions de l'article 28(3). La chaîne de sous-traitance ultérieure doit également être documentée.",
      `Hébergement du site : ${t.mark("hébergeur, adresse et localisation des serveurs")}`,
    ],
    bullets:
      trackingVendors.length > 0
        ? trackingVendors.map(
            (v) =>
              `${v.name} (${v.entity}) — contrat de sous-traitance : ${todoLabel(v.name)}`,
          )
        : ["Aucun sous-traitant identifié automatiquement par le scan."],
  });

  function todoLabel(name: string): string {
    return t.mark(`référence et date du contrat de sous-traitance avec ${name}`);
  }

  sections.push({
    id: "tenue",
    heading: `${nextIndex + 2}. Tenue du registre`,
    clauseRef: "RGPD, article 30(4)",
    body: [
      `Date de dernière mise à jour : ${new Date(scan.scannedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })} pour la partie issue de l'analyse technique.`,
      `Responsable de la tenue du registre : ${t.mark("nom et fonction de la personne chargée du registre")}`,
      "Le registre doit être tenu à jour et mis à disposition de l'autorité de contrôle sur demande. Toute évolution des traceurs présents sur le site impose de reprendre la section correspondante — la surveillance automatique de Konsent signale ces évolutions.",
    ],
  });

  return {
    templateId: "D08",
    slug: "registre-traitements",
    title: "Registre des activités de traitement",
    subtitle: `${scan.hostname} — responsable de traitement`,
    generatedAt: scan.scannedAt,
    todos: t.list(),
    sections,
    footer: `Modèle généré par ${EDITOR.product} le ${new Date(scan.scannedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })} à partir de l'analyse de ${scan.hostname} (référentiel ${scan.rulepackVersion}). La section relative à la mesure d'audience et à la publicité est alimentée par les destinataires réellement observés. Les autres traitements sont des canevas vides. Ce document est un modèle à personnaliser et à faire valider par un professionnel du droit avant toute utilisation.`,
  };
}
