import type { Rule } from "../types";

/**
 * Famille TCF — Transparency & Consent Framework de l'IAB Europe.
 *
 * Cette famille était déclarée dans le type `Family` mais n'avait aucune règle :
 * un rapport pouvait donc conclure sans jamais examiner la chaîne publicitaire,
 * alors que c'est précisément là que le consentement se monnaie.
 *
 * Précaution de lecture, valable pour toute la famille. Le TCF est un cadre
 * PRIVÉ, édicté par un organisme professionnel, et non une norme juridique.
 * L'autorité belge de protection des données l'a jugé non conforme en février
 * 2022 ; la décision a été partiellement confirmée par le Tribunal de l'Union
 * le 14 mars 2024 (T-111/23), et l'IAB a publié depuis des versions corrigées.
 * En conséquence : un écart au TCF n'est PAS en soi un manquement au RGPD, et
 * une conformité au TCF ne vaut PAS conformité au RGPD. Les messages de cette
 * famille disent ce qui est observé et ce que la spécification prévoit — jamais
 * ce qu'un juge en conclurait.
 */

const REVIEWED = "2026-08-08";

const TCF_SPEC = "IAB Europe, TCF Policies v2.2 — cadre privé, sans valeur normative propre";

export const TCF_RULES: readonly Rule[] = [
  {
    id: "KZC-TCF-001",
    family: "TCF",
    severity: "MAJOR",
    weight: 10,
    phases: ["A", "C"],
    engine: "headless",
    title: "Des partenaires publicitaires TCF sont sollicités sans que l'interface TCF soit exposée",
    references: [TCF_SPEC, "RGPD, article 7(1) — charge de la preuve du consentement"],
    omnibusStatus:
      "Sans objet — le projet COM(2025) 837 ne traite pas des cadres sectoriels privés.",
    messageExec:
      "Votre site contacte des régies publicitaires qui attendent un signal de consentement normalisé, mais ce signal n'est pas publié. Chaque régie décide alors seule de ce qu'elle fait de la donnée.",
    messageTech:
      "Vendors TCF observés ({vendors}) sans `window.__tcfapi` exposé ni CMP enregistré.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: [
        "Déployer une CMP enregistrée auprès de l'IAB Europe, ou retirer les régies qui exigent le cadre.",
        "Vérifier que `__tcfapi` répond avant le premier appel publicitaire.",
      ],
    },
    falsePositiveNotes:
      "Un vendor peut être appelé pour un usage non publicitaire (CDN mutualisé). Vérifier le chemin de la requête avant de conclure.",
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-TCF-002",
    family: "TCF",
    severity: "MAJOR",
    weight: 8,
    phases: ["A", "B", "C"],
    engine: "headless",
    title: "La chaîne de consentement transmise est illisible ou corrompue",
    references: [TCF_SPEC, "RGPD, article 7(1)"],
    omnibusStatus: "Sans objet.",
    messageExec:
      "Le message de consentement envoyé à vos partenaires ne peut pas être relu. Vous ne pouvez donc pas démontrer ce que vos visiteurs ont accepté.",
    messageTech: "TCString `{tcstring}` non décodable : {reason}.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["Mettre à jour la CMP.", "Vérifier qu'aucun script ne réécrit le cookie `euconsent-v2`."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-TCF-003",
    family: "TCF",
    severity: "MODERATE",
    weight: 5,
    phases: ["A", "C"],
    engine: "headless",
    title: "L'identifiant de CMP déclaré n'est pas un identifiant enregistré",
    references: [TCF_SPEC],
    omnibusStatus: "Sans objet.",
    messageExec:
      "L'outil qui recueille le consentement se présente sous un identifiant que le registre professionnel ne reconnaît pas.",
    messageTech: "`cmpId` = {cmpId}, absent de la liste des CMP enregistrées.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 390],
      steps: ["Faire enregistrer la CMP, ou corriger l'identifiant transmis."],
    },
    falsePositiveNotes:
      "Notre copie du registre peut avoir du retard sur un enregistrement récent. La règle ne se déclenche qu'au-delà de 30 jours d'écart.",
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-TCF-004",
    family: "TCF",
    severity: "MODERATE",
    weight: 4,
    phases: ["A", "C"],
    engine: "headless",
    title: "La liste des partenaires utilisée date de plus de trente jours",
    references: [TCF_SPEC],
    omnibusStatus: "Sans objet.",
    messageExec:
      "La liste des sociétés à qui vos visiteurs donnent leur accord n'est plus à jour. Des partenaires récents peuvent recevoir des données sans figurer dans le choix proposé.",
    messageTech: "Global Vendor List v{version}, publiée le {date} — {age} jours.",
    remediation: {
      effort: "LOW",
      billable: false,
      steps: ["Activer le rafraîchissement automatique de la liste des partenaires dans la CMP."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-TCF-005",
    family: "TCF",
    severity: "MAJOR",
    weight: 12,
    phases: ["A", "C"],
    engine: "headless",
    title: "Des partenaires reçoivent des données sans figurer dans le consentement transmis",
    references: [TCF_SPEC, "RGPD, article 5(1)(a) — loyauté et transparence"],
    omnibusStatus: "Sans objet.",
    messageExec:
      "Des sociétés reçoivent les données de vos visiteurs alors qu'elles ne font pas partie de celles auxquelles ces visiteurs ont dit oui.",
    messageTech: "Vendors contactés hors TCString : {vendors}.",
    remediation: {
      effort: "HIGH",
      billable: true,
      priceHintEur: [890, 1900],
      steps: [
        "Rapprocher la liste des partenaires déclarés dans la CMP de ceux réellement appelés.",
        "Retirer les partenaires non déclarés ou les ajouter au choix proposé.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-TCF-006",
    family: "TCF",
    severity: "MAJOR",
    weight: 12,
    phases: ["A", "B", "C"],
    engine: "headless",
    title: "L'intérêt légitime est invoqué pour de la publicité personnalisée",
    references: [
      TCF_SPEC,
      "RGPD, article 6(1)(f) et considérant 47",
      "CJUE, 4 octobre 2024, C-621/22 (KNLTB) — la finalité commerciale ne suffit pas",
    ],
    omnibusStatus: "Sans objet.",
    messageExec:
      "Certaines finalités publicitaires sont activées sans demander l'accord, au motif d'un « intérêt légitime ». La Cour de justice a jugé qu'un intérêt purement commercial ne suffit pas à lui seul.",
    messageTech: "Finalités {purposes} portées en `legitimateInterest` dans le TCString.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: [
        "Basculer les finalités publicitaires sur le consentement.",
        "Documenter la mise en balance pour les finalités maintenues en intérêt légitime.",
      ],
    },
    falsePositiveNotes:
      "L'intérêt légitime reste défendable pour la mesure et la sécurité. La règle ne vise que les finalités de ciblage.",
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-TCF-007",
    family: "TCF",
    severity: "MODERATE",
    weight: 4,
    phases: ["A", "C"],
    engine: "headless",
    title: "Aucune restriction éditeur n'est configurée",
    references: [TCF_SPEC],
    omnibusStatus: "Sans objet.",
    messageExec:
      "Vous laissez chaque partenaire décider seul de ce qu'il fait des données de vos visiteurs, alors que vous pouvez l'encadrer.",
    messageTech: "Aucune `publisherRestriction` dans le TCString.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 390],
      steps: ["Déclarer les restrictions éditeur pour interdire l'intérêt légitime sur le ciblage."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-TCF-008",
    family: "TCF",
    severity: "CRITICAL",
    weight: 20,
    phases: ["A"],
    engine: "headless",
    title: "Un consentement est transmis avant toute action de l'utilisateur",
    references: [
      TCF_SPEC,
      "RGPD, article 4(11) — le consentement suppose un acte positif",
      "CNIL, lignes directrices, délibération n° 2020-091",
    ],
    omnibusStatus:
      "Maintenu — le projet d'article 88a §1 conserve l'exigence d'un acte positif préalable.",
    messageExec:
      "Un accord est transmis à vos partenaires publicitaires avant que le visiteur ait cliqué sur quoi que ce soit. L'accord annoncé n'a donc pas été donné.",
    messageTech: "TCString émis à T+{ms} ms, avant toute interaction ; `created` = {created}.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: [
        "Ne produire la chaîne de consentement qu'après action explicite.",
        "Vérifier qu'aucune valeur par défaut n'est pré-positionnée dans la configuration de la CMP.",
      ],
    },
    lastReviewed: REVIEWED,
  },
];
