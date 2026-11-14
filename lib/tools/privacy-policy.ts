import { EDITOR } from "../disclaimer";
import type { DocSection, GeneratedDoc } from "../docs/types";
import { DocTracker, formatDateFr, numberSections, slugPart } from "./legal-notice";

/**
 * Générateur guidé de politique de confidentialité (RGPD, art. 12 à 14) —
 * logique pure, configuration vers sections.
 *
 * Chaque traitement proposé arrive avec une finalité, une base légale et une
 * durée de conservation préremplies, tirées des référentiels de la CNIL et
 * des textes cités. Ce sont des points de départ : l'utilisateur les modifie,
 * et c'est sa pratique réelle qui doit être décrite, pas la nôtre.
 */

export type BasisId = "a" | "b" | "c" | "bc" | "d" | "e" | "f";

export const BASIS_LABELS: Record<BasisId, string> = {
  a: "Consentement (art. 6, § 1, a)",
  b: "Exécution d'un contrat ou de mesures précontractuelles (art. 6, § 1, b)",
  c: "Respect d'une obligation légale (art. 6, § 1, c)",
  bc: "Exécution du contrat (art. 6, § 1, b) et obligation légale (art. 6, § 1, c)",
  d: "Sauvegarde des intérêts vitaux (art. 6, § 1, d)",
  e: "Exécution d'une mission d'intérêt public (art. 6, § 1, e)",
  f: "Intérêt légitime (art. 6, § 1, f)",
};

export const BASIS_IDS = Object.keys(BASIS_LABELS) as BasisId[];

export interface Treatment {
  id: string;
  enabled: boolean;
  label: string;
  purpose: string;
  basis: BasisId;
  /** Intérêt légitime poursuivi, à indiquer lorsque la base est l'art. 6, § 1, f (art. 13, § 1, d). */
  interest: string;
  data: string;
  retention: string;
}

export const TREATMENT_PRESETS: readonly Treatment[] = [
  {
    id: "securite",
    enabled: true,
    label: "Fonctionnement et sécurité du site",
    purpose: "Assurer le fonctionnement technique du site, sa sécurité et la prévention des abus.",
    basis: "f",
    interest: "Garantir la disponibilité et la sécurité du site.",
    data: "Adresse IP, date et heure de connexion, pages demandées, type de navigateur, journaux techniques.",
    retention: "6 mois à compter de leur enregistrement.",
  },
  {
    id: "contact",
    enabled: true,
    label: "Formulaire de contact",
    purpose: "Répondre aux demandes adressées par le formulaire de contact ou par courriel.",
    basis: "f",
    interest: "Répondre aux personnes qui nous sollicitent.",
    data: "Nom, prénom, adresse électronique, numéro de téléphone le cas échéant, contenu du message.",
    retention:
      "Le temps nécessaire au traitement de la demande ; 3 ans à compter du dernier contact lorsque la demande émane d'un prospect.",
  },
  {
    id: "devis",
    enabled: false,
    label: "Demande de devis",
    purpose: "Établir, transmettre et suivre les devis demandés.",
    basis: "b",
    interest: "",
    data: "Identité, coordonnées, société le cas échéant, description du besoin.",
    retention: "3 ans à compter de l'émission du devis ou du dernier contact, en l'absence de suite donnée.",
  },
  {
    id: "compte",
    enabled: false,
    label: "Compte client",
    purpose: "Créer et gérer le compte client, et permettre l'accès à l'espace personnel.",
    basis: "b",
    interest: "",
    data: "Identifiant, mot de passe chiffré, nom, prénom, adresse électronique, adresse postale, historique des commandes.",
    retention: "Pendant toute la durée d'existence du compte ; suppression après 2 ans d'inactivité.",
  },
  {
    id: "commande",
    enabled: false,
    label: "Commandes, livraison et facturation",
    purpose: "Gérer les commandes, la livraison, la facturation, le service après-vente et les garanties légales.",
    basis: "bc",
    interest: "",
    data: "Identité, adresses de livraison et de facturation, coordonnées, détail des commandes, factures.",
    retention:
      "Durée de la relation contractuelle ; pièces comptables conservées 10 ans (code de commerce, art. L. 123-22) ; contrats conclus par voie électronique d'un montant égal ou supérieur à 120 € conservés 10 ans (code de la consommation, art. L. 213-1).",
  },
  {
    id: "paiement",
    enabled: false,
    label: "Paiement en ligne",
    purpose: "Traiter les paiements et prévenir la fraude.",
    basis: "b",
    interest: "",
    data: "Données de transaction. Les données de carte bancaire sont traitées directement par le prestataire de paiement et ne sont pas conservées par l'éditeur.",
    retention:
      "Durée de la transaction ; puis 13 mois en archive à compter du débit, à des fins de preuve en cas de contestation (code monétaire et financier, art. L. 133-24), 15 mois pour les cartes à débit différé.",
  },
  {
    id: "newsletter",
    enabled: false,
    label: "Lettre d'information",
    purpose: "Envoyer la lettre d'information à laquelle la personne s'est abonnée.",
    basis: "a",
    interest: "",
    data: "Adresse électronique, date d'inscription, statistiques d'ouverture le cas échéant.",
    retention: "Jusqu'au désabonnement ; à défaut, 3 ans à compter du dernier contact actif.",
  },
  {
    id: "prospection",
    enabled: false,
    label: "Prospection commerciale",
    purpose:
      "Adresser des offres commerciales aux clients pour des produits ou services analogues, et aux professionnels en rapport avec leur activité.",
    basis: "f",
    interest: "Faire connaître nos offres et développer notre activité.",
    data: "Identité, coordonnées, historique de la relation commerciale.",
    retention: "3 ans à compter de la fin de la relation commerciale ou du dernier contact émanant du prospect.",
  },
  {
    id: "audience",
    enabled: false,
    label: "Mesure d'audience",
    purpose: "Mesurer la fréquentation du site et en améliorer l'ergonomie.",
    basis: "a",
    interest: "",
    data: "Identifiant du traceur, pages consultées, durée de visite, données relatives au terminal, adresse IP tronquée.",
    retention: "Traceurs : 13 mois au plus ; données collectées : 25 mois au plus.",
  },
  {
    id: "recrutement",
    enabled: false,
    label: "Recrutement",
    purpose: "Recevoir, examiner et gérer les candidatures.",
    basis: "b",
    interest: "",
    data: "Curriculum vitae, lettre de motivation, coordonnées, éléments du parcours professionnel.",
    retention:
      "Durée du processus de recrutement ; en l'absence de suite, 2 ans à compter du dernier contact, sauf opposition du candidat.",
  },
];

export type DpoMode = "dpo" | "referent" | "aucun";
export type GuaranteeId = "adequation" | "cct" | "bcr" | "derogation";

export const GUARANTEE_LABELS: Record<GuaranteeId, string> = {
  adequation:
    "Décision d'adéquation de la Commission européenne (art. 45), notamment, pour les États-Unis, le cadre de protection des données UE–États-Unis (Data Privacy Framework) lorsque le destinataire y est certifié",
  cct: "Clauses contractuelles types adoptées par la Commission européenne (art. 46, § 2, c ; décision d'exécution (UE) 2021/914)",
  bcr: "Règles d'entreprise contraignantes approuvées (art. 47)",
  derogation: "Dérogations pour des situations particulières (art. 49)",
};

export const GUARANTEE_IDS = Object.keys(GUARANTEE_LABELS) as GuaranteeId[];

export interface Recipient {
  key: number;
  name: string;
  role: string;
  country: string;
}

export interface PrivacyPolicyConfig {
  siteName: string;
  siteUrl: string;
  controllerName: string;
  controllerDetails: string;
  siren: string;
  address: string;
  contactEmail: string;
  dpoMode: DpoMode;
  dpoName: string;
  dpoContact: string;
  treatments: Treatment[];
  recipients: Recipient[];
  transfers: boolean;
  transferCountries: string;
  guarantees: GuaranteeId[];
  automatedDecision: boolean;
  cookiesUrl: string;
  cookiesLink: string;
  security: string;
  updatedAt: string;
}

export const DEFAULT_SECURITY =
  "chiffrement des échanges (HTTPS), contrôle et journalisation des accès, gestion des habilitations selon le besoin d'en connaître, mots de passe robustes, sauvegardes régulières et mises à jour de sécurité";

export const DEFAULT_PRIVACY_POLICY: PrivacyPolicyConfig = {
  siteName: "",
  siteUrl: "",
  controllerName: "",
  controllerDetails: "",
  siren: "",
  address: "",
  contactEmail: "",
  dpoMode: "aucun",
  dpoName: "",
  dpoContact: "",
  treatments: TREATMENT_PRESETS.map((p) => ({ ...p })),
  recipients: [],
  transfers: false,
  transferCountries: "",
  guarantees: ["cct"],
  automatedDecision: false,
  cookiesUrl: "",
  cookiesLink: "",
  security: DEFAULT_SECURITY,
  updatedAt: "",
};

function sentence(s: string): string {
  const v = s.trim().replace(/[.;\s]+$/, "");
  return v ? `${v}.` : v;
}

export function generatePrivacyPolicyDoc(c: PrivacyPolicyConfig): GeneratedDoc {
  const t = new DocTracker();
  const site = t.val(c.siteName || c.siteUrl, "nom ou adresse du site");
  const name = t.val(c.controllerName, "dénomination du responsable de traitement");
  const contact = t.val(c.contactEmail, "adresse de contact pour les questions relatives aux données");
  const active = c.treatments.filter((x) => x.enabled);
  const sections: DocSection[] = [];

  sections.push({
    id: "objet",
    heading: "Objet",
    clauseRef: "RGPD, art. 12 à 14",
    body: [
      `La présente politique décrit la manière dont ${name} collecte et traite les données personnelles des personnes qui utilisent le site ${site} ou entrent en relation avec lui, conformément au règlement (UE) 2016/679 du 27 avril 2016 (RGPD) et à la loi n° 78-17 du 6 janvier 1978 relative à l'informatique, aux fichiers et aux libertés.`,
    ],
  });

  // ── Responsable ──
  const details = c.controllerDetails.trim() ? `, ${c.controllerDetails.trim()}` : "";
  const siren = c.siren.trim() ? `, SIREN ${c.siren.trim()}` : "";
  sections.push({
    id: "responsable",
    heading: "Responsable du traitement",
    clauseRef: "RGPD, art. 13, § 1, a)",
    body: [
      `Le responsable du traitement est ${name}${details}${siren}, dont le siège ou l'établissement est situé ${t.val(c.address, "adresse du responsable de traitement")}.`,
      `Pour toute question relative à vos données, vous pouvez écrire à ${contact}.`,
    ],
  });

  // ── DPO ou référent ──
  let dpoBody: string[];
  if (c.dpoMode === "dpo") {
    dpoBody = [
      `${name} a désigné un délégué à la protection des données : ${t.val(c.dpoName, "nom ou dénomination du délégué à la protection des données")}, joignable à ${t.val(c.dpoContact, "coordonnées du délégué à la protection des données")}.`,
    ];
  } else if (c.dpoMode === "referent") {
    dpoBody = [
      `${name} n'est pas tenu de désigner un délégué à la protection des données. Un référent interne est chargé des questions relatives aux données personnelles : ${t.val(c.dpoName, "nom ou fonction du référent")}, joignable à ${t.val(c.dpoContact, "coordonnées du référent")}.`,
    ];
  } else {
    dpoBody = [
      `${name} n'est pas tenu de désigner un délégué à la protection des données et n'en a pas désigné. Les demandes sont à adresser à ${contact}.`,
    ];
  }
  sections.push({
    id: "dpo",
    heading: "Délégué à la protection des données",
    clauseRef: "RGPD, art. 13, § 1, b) et art. 37 à 39",
    body: dpoBody,
  });

  // ── Traitements ──
  const interests = active.filter((x) => x.basis === "f");
  sections.push({
    id: "traitements",
    heading: "Finalités, bases légales et durées de conservation",
    clauseRef: "RGPD, art. 5, § 1, e), art. 6 et art. 13, § 1, c) et d), § 2, a)",
    body:
      active.length === 0
        ? [t.mark("traitements mis en œuvre, avec leur finalité, leur base légale et leur durée de conservation")]
        : [
            "Chaque traitement poursuit une finalité déterminée et repose sur l'une des bases légales prévues à l'article 6 du RGPD :",
          ],
    table:
      active.length === 0
        ? undefined
        : {
            columns: ["Traitement", "Finalité", "Base légale", "Données traitées", "Durée de conservation"],
            rows: active.map((x) => [
              t.val(x.label, "intitulé du traitement"),
              t.val(sentence(x.purpose), `finalité du traitement « ${x.label} »`),
              BASIS_LABELS[x.basis],
              t.val(sentence(x.data), `données traitées pour « ${x.label} »`),
              t.val(sentence(x.retention), `durée de conservation pour « ${x.label} »`),
            ]),
          },
    bullets:
      interests.length > 0
        ? interests.map(
            (x) =>
              `Intérêt légitime poursuivi pour « ${x.label} » : ${t.val(sentence(x.interest), `intérêt légitime poursuivi pour « ${x.label} »`)}`,
          )
        : undefined,
  });

  sections.push({
    id: "obligatoire",
    heading: "Caractère obligatoire des informations",
    clauseRef: "RGPD, art. 13, § 2, e)",
    body: [
      "Les champs obligatoires des formulaires sont signalés comme tels. À défaut de les renseigner, la demande ne peut pas être traitée ou le contrat ne peut pas être conclu. Les autres informations sont facultatives.",
      "À l'issue des durées indiquées, les données sont supprimées ou anonymisées. Elles peuvent être conservées plus longtemps, en archive à accès restreint, lorsqu'une obligation légale l'impose ou pour la constatation, l'exercice ou la défense de droits en justice.",
    ],
  });

  // ── Destinataires ──
  const recipients = c.recipients.filter((r) => r.name.trim() || r.role.trim() || r.country.trim());
  sections.push({
    id: "destinataires",
    heading: "Destinataires des données",
    clauseRef: "RGPD, art. 13, § 1, e) et art. 28",
    body: [
      `Les données sont destinées aux personnes habilitées de ${name}, dans la limite de leurs attributions. Elles peuvent être communiquées aux prestataires qui interviennent pour son compte en qualité de sous-traitants, liés par un contrat conforme à l'article 28 du RGPD, ainsi qu'aux autorités légalement habilitées à en obtenir communication.`,
      ...(recipients.length === 0
        ? [`Prestataires : ${t.mark("liste des sous-traitants et destinataires (nom, rôle, pays)")}`]
        : ["Les principaux prestataires sont les suivants :"]),
      "Les données ne sont ni vendues ni louées.",
    ],
    table:
      recipients.length === 0
        ? undefined
        : {
            columns: ["Destinataire", "Rôle", "Pays de traitement"],
            rows: recipients.map((r) => [
              t.val(r.name, "nom du destinataire"),
              t.val(r.role, `rôle de ${r.name.trim() || "ce destinataire"}`),
              t.val(r.country, `pays de traitement de ${r.name.trim() || "ce destinataire"}`),
            ]),
          },
  });

  // ── Transferts ──
  sections.push({
    id: "transferts",
    heading: "Transferts hors de l'Union européenne",
    clauseRef: "RGPD, art. 13, § 1, f) et art. 44 à 49",
    body: c.transfers
      ? [
          `Certaines données sont transférées vers des destinataires établis hors de l'Espace économique européen, à savoir : ${t.val(c.transferCountries, "pays de destination et destinataires concernés")}.`,
          "Ces transferts sont encadrés par les garanties suivantes :",
        ]
      : [
          "Les données sont traitées au sein de l'Espace économique européen et ne font l'objet d'aucun transfert vers un pays tiers.",
        ],
    bullets: c.transfers
      ? c.guarantees.length > 0
        ? [
            ...c.guarantees.map((g) => GUARANTEE_LABELS[g]),
            `Une copie des garanties applicables peut être obtenue sur demande adressée à ${contact}.`,
          ]
        : [t.mark("garanties encadrant chaque transfert")]
      : undefined,
  });

  // ── Droits ──
  sections.push({
    id: "droits",
    heading: "Vos droits",
    clauseRef: "RGPD, art. 7, § 3, art. 12 et art. 15 à 22 · loi n° 78-17, art. 85",
    body: ["Vous disposez, dans les conditions prévues par le RGPD, des droits suivants :"],
    bullets: [
      "Droit d'accès à vos données et d'en obtenir copie (art. 15).",
      "Droit de rectification des données inexactes ou incomplètes (art. 16).",
      "Droit à l'effacement (art. 17).",
      "Droit à la limitation du traitement (art. 18).",
      "Droit à la portabilité des données que vous avez fournies, lorsque le traitement repose sur votre consentement ou sur un contrat et est effectué à l'aide de procédés automatisés (art. 20).",
      "Droit d'opposition, pour des raisons tenant à votre situation particulière, aux traitements fondés sur l'intérêt légitime, et droit d'opposition à tout moment à la prospection commerciale (art. 21).",
      "Droit de retirer votre consentement à tout moment, sans que soit remise en cause la licéité du traitement fondé sur le consentement effectué avant ce retrait (art. 7, § 3).",
      "Droit de définir des directives relatives à la conservation, à l'effacement et à la communication de vos données après votre décès (loi n° 78-17, art. 85).",
    ],
  });

  sections.push({
    id: "exercice",
    heading: "Exercice de vos droits",
    clauseRef: "RGPD, art. 12, § 3 et § 6",
    body: [
      `Vous pouvez exercer ces droits en écrivant à ${c.dpoMode !== "aucun" && c.dpoContact.trim() ? c.dpoContact.trim() : contact}. Une réponse vous est apportée dans un délai d'un mois à compter de la réception de la demande. Ce délai peut être prolongé de deux mois, compte tenu de la complexité et du nombre de demandes ; vous en êtes alors informé dans le premier mois.`,
      "Une pièce justificative d'identité ne peut vous être demandée qu'en cas de doute raisonnable sur votre identité.",
      ...(active.some((x) => x.id === "prospection" && x.enabled)
        ? [
            "Si vous ne souhaitez pas faire l'objet de prospection commerciale par voie téléphonique, vous pouvez gratuitement vous inscrire sur la liste d'opposition au démarchage téléphonique Bloctel (code de la consommation, art. L. 223-1).",
          ]
        : []),
    ],
  });

  sections.push({
    id: "decision",
    heading: "Décision individuelle automatisée",
    clauseRef: "RGPD, art. 13, § 2, f) et art. 22",
    body: c.automatedDecision
      ? [
          `Certaines décisions sont prises sur le seul fondement d'un traitement automatisé : ${t.mark("description de la décision automatisée, de la logique sous-jacente, de son importance et de ses conséquences")}.`,
          "Vous avez le droit d'obtenir une intervention humaine, d'exprimer votre point de vue et de contester la décision.",
        ]
      : ["Aucune décision produisant des effets juridiques ou vous affectant de manière significative n'est prise sur le seul fondement d'un traitement automatisé, y compris le profilage."],
  });

  sections.push({
    id: "reclamation",
    heading: "Réclamation auprès de la CNIL",
    clauseRef: "RGPD, art. 13, § 2, d) et art. 77",
    body: [
      "Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission nationale de l'informatique et des libertés (CNIL), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, ou en ligne sur www.cnil.fr.",
    ],
  });

  sections.push({
    id: "cookies",
    heading: "Cookies et autres traceurs",
    clauseRef: "Loi n° 78-17, art. 82",
    body: [
      `Les cookies et autres traceurs déposés ou lus lors de la navigation, leurs finalités et leur durée sont décrits dans la politique de gestion des cookies, accessible à l'adresse ${t.val(c.cookiesUrl, "adresse de la politique de gestion des cookies")}.`,
      `Vous pouvez modifier vos choix à tout moment depuis ${t.val(c.cookiesLink, "emplacement du lien de gestion des cookies, par exemple le pied de page")}.`,
    ],
  });

  sections.push({
    id: "securite",
    heading: "Sécurité",
    clauseRef: "RGPD, art. 32",
    body: [
      `${name} met en œuvre des mesures techniques et organisationnelles appropriées pour garantir un niveau de sécurité adapté au risque, notamment : ${t.val(sentence(c.security), "mesures de sécurité mises en œuvre")}`,
      "En cas de violation de données susceptible d'engendrer un risque élevé pour vos droits et libertés, vous en êtes informé dans les meilleurs délais, conformément à l'article 34 du RGPD.",
    ],
  });

  const date = c.updatedAt ? formatDateFr(c.updatedAt) : t.mark("date de mise à jour");
  sections.push({
    id: "modification",
    heading: "Modification de la présente politique",
    body: [
      `La présente politique peut être modifiée pour tenir compte des évolutions légales, réglementaires ou des traitements mis en œuvre. Elle a été mise à jour le ${date}.`,
    ],
  });

  return {
    templateId: "G-PC",
    slug: "politique-confidentialite",
    title: "Politique de confidentialité",
    subtitle: `${site} — dernière mise à jour : ${date}`,
    generatedAt: c.updatedAt,
    todos: t.list(),
    sections: numberSections(sections),
    footer: `Modèle généré avec ${EDITOR.product} (${EDITOR.productSite}), dans le navigateur, sans conservation des informations saisies. Les finalités, bases légales et durées proposées sont des points de départ : seule votre pratique réelle doit être décrite. Ce document est un modèle à faire valider par un professionnel du droit avant publication. Les marqueurs [[À COMPLÉTER]] et [[À VÉRIFIER]] doivent tous avoir disparu.`,
  };
}

export function privacyPolicyFileBase(c: PrivacyPolicyConfig): string {
  return `politique-confidentialite${slugPart(c.siteName || c.siteUrl)}`;
}
