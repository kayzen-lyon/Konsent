import { EDITOR } from "../disclaimer";
import type { ScanResult } from "../engine/types";
import { TodoTracker, type DocSection, type GeneratedDoc } from "./types";

/**
 * D01 — Politique de confidentialité (RGPD, art. 12 à 14).
 *
 * Alimentée par le scan pour la partie destinataires et transferts : c'est
 * précisément là que les politiques publiées divergent le plus souvent de
 * la réalité du site, et c'est ce que détecte la règle KZC-DOC-016.
 */
export function generatePrivacyPolicy(scan: ScanResult): GeneratedDoc {
  const t = new TodoTracker();
  const outsideEea = scan.vendors.filter((v) => v.adequacy !== "EEA");

  const sections: DocSection[] = [
    {
      id: "qui",
      heading: "1. Qui est responsable de vos données",
      clauseRef: "RGPD, article 13(1)(a) et (b)",
      body: [
        `Le responsable du traitement de vos données personnelles est ${t.mark("dénomination sociale")}, ${t.mark("forme juridique")}, immatriculée sous le numéro ${t.mark("SIREN")}, dont le siège est situé ${t.mark("adresse du siège social")}.`,
        `Pour toute question relative à vos données, vous pouvez écrire à ${t.mark("adresse de contact dédiée à la protection des données")}.`,
        `Délégué à la protection des données : ${t.mark("nom et coordonnées du DPO, ou mention « non désigné » avec le référent interne")}`,
      ],
    },
    {
      id: "quoi",
      heading: "2. Quelles données nous traitons",
      clauseRef: "RGPD, article 13",
      body: [
        "Lorsque vous consultez ce site, des données techniques sont traitées automatiquement : adresse IP, type de navigateur et de terminal, pages consultées, date et heure de consultation, et site d'origine le cas échéant.",
        `Lorsque vous nous contactez ou utilisez nos services, nous traitons également les données que vous nous fournissez : ${t.mark("liste des données collectées via vos formulaires")}.`,
      ],
    },
    {
      id: "pourquoi",
      heading: "3. Pourquoi nous les traitons",
      clauseRef: "RGPD, articles 6 et 13(1)(c)",
      body: [
        "Chaque traitement repose sur une base légale déterminée :",
      ],
      table: {
        columns: ["Finalité", "Base légale", "Durée de conservation"],
        rows: [
          [
            "Fournir et sécuriser le site",
            "Intérêt légitime (art. 6(1)(f))",
            t.mark("durée de conservation des journaux techniques"),
          ],
          [
            "Répondre à vos demandes",
            "Mesures précontractuelles ou intérêt légitime",
            t.mark("durée de conservation des demandes de contact"),
          ],
          [
            "Mesurer l'audience et diffuser de la publicité",
            "Consentement (art. 6(1)(a)) et article 82 de la loi n° 78-17",
            "13 mois pour les traceurs, 25 mois pour les données collectées",
          ],
          [
            "Prospection commerciale",
            "Consentement ou intérêt légitime selon le canal",
            "3 ans à compter du dernier contact",
          ],
        ],
      },
    },
  ];

  // ── Destinataires : alimentés par le scan ──
  if (scan.vendors.length > 0) {
    sections.push({
      id: "destinataires",
      heading: "4. Qui reçoit vos données",
      clauseRef: "RGPD, article 13(1)(e)",
      body: [
        `Les services tiers suivants ont été identifiés sur ce site lors de l'analyse technique du ${new Date(scan.scannedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })}. Cette liste reflète les services réellement présents, et non une liste théorique.`,
      ],
      table: {
        columns: ["Service", "Éditeur", "Finalité", "Pays"],
        rows: scan.vendors.map((v) => [
          v.name,
          v.entity,
          v.purposeFr.split(".")[0] ?? v.purposeFr,
          v.effectiveJurisdiction,
        ]),
      },
    });
  }

  const idx = scan.vendors.length > 0 ? 5 : 4;

  if (outsideEea.length > 0) {
    sections.push({
      id: "transferts",
      heading: `${idx}. Transferts hors Union européenne`,
      clauseRef: "RGPD, articles 13(1)(f) et 44 à 49",
      body: [
        `Certains de ces destinataires relèvent d'une juridiction située hors de l'Espace économique européen : ${outsideEea.map((v) => `${v.name} (${v.effectiveJurisdiction})`).join(", ")}.`,
        `Ces transferts sont encadrés par ${t.mark("garanties applicables : décision d'adéquation, clauses contractuelles types ou règles d'entreprise contraignantes")}. Vous pouvez en obtenir copie en nous écrivant.`,
      ],
    });
  }

  const idx2 = idx + (outsideEea.length > 0 ? 1 : 0);

  sections.push(
    {
      id: "traceurs",
      heading: `${idx2}. Cookies et traceurs`,
      clauseRef: "Article 82 de la loi n° 78-17 modifiée",
      body: [
        "Le détail des traceurs déposés, de leur finalité et de leur durée figure dans notre politique de gestion des cookies.",
        `Vous pouvez modifier vos préférences à tout moment depuis ${t.mark("emplacement du lien de gestion des cookies")}.`,
      ],
    },
    {
      id: "droits",
      heading: `${idx2 + 1}. Vos droits`,
      clauseRef: "RGPD, articles 15 à 22 et 77",
      body: [
        "Vous disposez, sur les données vous concernant, des droits suivants :",
      ],
      bullets: [
        "Droit d'accès : obtenir la confirmation que vos données sont traitées et en recevoir une copie.",
        "Droit de rectification : faire corriger des données inexactes ou incomplètes.",
        "Droit à l'effacement : demander la suppression de vos données, dans les cas prévus par le règlement.",
        "Droit à la limitation : demander le gel temporaire d'un traitement contesté.",
        "Droit d'opposition : vous opposer à un traitement fondé sur l'intérêt légitime, et à tout moment à la prospection.",
        "Droit à la portabilité : recevoir vos données dans un format structuré et lisible par machine.",
        "Droit de retirer votre consentement à tout moment, sans que cela remette en cause la licéité des traitements antérieurs.",
        "Droit de définir des directives relatives au sort de vos données après votre décès.",
      ],
    },
    {
      id: "exercice",
      heading: `${idx2 + 2}. Comment exercer vos droits`,
      clauseRef: "RGPD, article 12(3)",
      body: [
        `Adressez votre demande à ${t.mark("adresse d'exercice des droits")}. Nous y répondons dans un délai d'un mois, prolongeable de deux mois en cas de demande complexe — auquel cas nous vous en informons.`,
        "Nous pouvons être amenés à vérifier votre identité en cas de doute raisonnable, sans exiger de pièce d'identité de manière systématique.",
        "Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission nationale de l'informatique et des libertés (CNIL), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, ou sur cnil.fr.",
      ],
    },
    {
      id: "securite",
      heading: `${idx2 + 3}. Sécurité`,
      clauseRef: "RGPD, article 32",
      body: [
        "Nous mettons en œuvre des mesures techniques et organisationnelles adaptées au risque : chiffrement des communications, contrôle des accès, journalisation, et sensibilisation des personnes habilitées.",
        `Hébergement : ${t.mark("hébergeur et localisation des serveurs")}.`,
      ],
    },
    {
      id: "evolution",
      heading: `${idx2 + 4}. Évolution de cette politique`,
      body: [
        `Cette politique peut être modifiée pour tenir compte de l'évolution de nos traitements ou de la réglementation. Version du ${new Date(scan.scannedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })}.`,
        "Nous vous invitons à la consulter régulièrement. Les modifications substantielles vous seront signalées.",
      ],
    },
  );

  return {
    templateId: "D01",
    slug: "politique-confidentialite",
    title: "Politique de confidentialité",
    subtitle: scan.hostname,
    generatedAt: scan.scannedAt,
    todos: t.list(),
    sections,
    footer: `Modèle généré par ${EDITOR.product} le ${new Date(scan.scannedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })} à partir de l'analyse de ${scan.hostname} (référentiel ${scan.rulepackVersion}). Les sections « destinataires » et « transferts » sont alimentées par les services réellement observés sur le site, ce qui évite la désynchronisation entre la politique publiée et la réalité technique. Ce document est un modèle à personnaliser et à faire valider par un professionnel du droit avant publication.`,
  };
}
