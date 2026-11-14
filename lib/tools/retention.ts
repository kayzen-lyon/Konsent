/**
 * Durées de conservation de référence, avec leur source.
 *
 * Prudence de rédaction, assumée :
 *  - on distingue ce qui est une OBLIGATION ou un PLAFOND fixé par un texte,
 *    de ce qui est une RECOMMANDATION ou un référentiel de la CNIL (non
 *    contraignant, mais qui sert de grille de lecture lors d'un contrôle) ;
 *  - la durée indiquée est un maximum de référence pour la base active ou
 *    l'archivage indiqué, jamais une durée à atteindre ;
 *  - le principe reste l'article 5.1.e du RGPD : pas plus longtemps que
 *    nécessaire au regard de la finalité. Un texte sectoriel peut imposer
 *    une autre durée.
 */

export type RetentionNature =
  | "plafond légal"
  | "obligation légale de conservation"
  | "condition d'exemption (CNIL)"
  | "référentiel CNIL"
  | "recommandation CNIL"
  | "pratique de référence";

export interface RetentionRule {
  id: string;
  group: string;
  label: string;
  amount: number;
  unit: "jours" | "mois" | "ans";
  /** Événement à partir duquel le délai court. */
  start: string;
  nature: RetentionNature;
  summary: string;
  note?: string;
  sources: readonly string[];
}

const LD_2020_091 =
  "CNIL, délibération n° 2020-091 du 17 septembre 2020 portant adoption de lignes directrices relatives à l'application de l'article 82 de la loi du 6 janvier 1978 aux opérations de lecture et écriture dans le terminal d'un utilisateur (cookies et autres traceurs)";
const REC_2020_092 =
  "CNIL, délibération n° 2020-092 du 17 septembre 2020 portant adoption d'une recommandation proposant des modalités pratiques de mise en conformité en cas de recours aux « cookies et autres traceurs »";
const REF_COMMERCIAL =
  "CNIL, délibération n° 2021-131 du 23 septembre 2021 portant adoption d'un référentiel relatif aux traitements de données à caractère personnel mis en œuvre aux fins de gestion des activités commerciales";

export const RETENTION_RULES: readonly RetentionRule[] = [
  // ── Traceurs ──
  {
    id: "cookie-audience-exempte",
    group: "Cookies et traceurs",
    label: "Cookie de mesure d'audience exempté de consentement",
    amount: 13,
    unit: "mois",
    start: "premier dépôt du traceur (sans prorogation automatique à chaque nouvelle visite)",
    nature: "condition d'exemption (CNIL)",
    summary:
      "La durée de vie du traceur ne doit pas dépasser 13 mois pour que l'outil de mesure d'audience puisse être dispensé de consentement.",
    note: "Ce n'est qu'une des conditions de l'exemption : finalité strictement limitée à la mesure d'audience, données non recoupées, pas de transfert à des fins propres du prestataire, etc.",
    sources: [LD_2020_091, "CNIL, « Cookies : solutions pour les outils de mesure d'audience »"],
  },
  {
    id: "donnees-audience",
    group: "Cookies et traceurs",
    label: "Données collectées par un outil de mesure d'audience exempté",
    amount: 25,
    unit: "mois",
    start: "collecte de l'information",
    nature: "condition d'exemption (CNIL)",
    summary:
      "Les informations collectées au moyen du traceur exempté sont conservées 25 mois au plus.",
    sources: [LD_2020_091, "CNIL, « Cookies : solutions pour les outils de mesure d'audience »"],
  },
  {
    id: "cookie-consentement",
    group: "Cookies et traceurs",
    label: "Cookie publicitaire, de réseau social ou autre traceur soumis au consentement",
    amount: 13,
    unit: "mois",
    start: "dépôt du traceur",
    nature: "pratique de référence",
    summary:
      "Aucun texte ne fixe de plafond chiffré : la durée de vie doit être proportionnée à la finalité. Les 13 mois exigés pour la mesure d'audience exemptée servent de repère ; au-delà, la durée doit pouvoir être justifiée.",
    note: "Le consentement lui-même doit être redemandé à intervalle raisonnable (voir « Choix de consentement »).",
    sources: [LD_2020_091, REC_2020_092, "Loi n° 78-17 du 6 janvier 1978, article 82"],
  },
  {
    id: "choix-consentement",
    group: "Cookies et traceurs",
    label: "Choix de consentement (acceptation ou refus) mémorisé",
    amount: 6,
    unit: "mois",
    start: "expression du choix par l'utilisateur",
    nature: "recommandation CNIL",
    summary:
      "La CNIL considère comme une bonne pratique de conserver le choix, refus compris, pendant 6 mois, puis de le redemander.",
    note: "Le refus doit être mémorisé aussi longtemps que l'acceptation, pour ne pas solliciter à nouveau l'utilisateur à chaque page.",
    sources: [REC_2020_092],
  },

  // ── Clients et prospects ──
  {
    id: "prospect-b2c",
    group: "Clients et prospects",
    label: "Prospect (personne non cliente)",
    amount: 3,
    unit: "ans",
    start: "collecte des données ou dernier contact émanant du prospect (clic, réponse, demande)",
    nature: "référentiel CNIL",
    summary:
      "Les données d'un prospect inactif sont conservées 3 ans au plus. Avant l'échéance, vous pouvez le recontacter pour savoir s'il souhaite continuer à recevoir vos sollicitations ; à défaut de réponse positive, supprimez ou anonymisez.",
    note: "Un simple envoi de courriel par vous ne constitue pas un « contact émanant du prospect » : seul un acte de sa part fait repartir le délai.",
    sources: [REF_COMMERCIAL],
  },
  {
    id: "client-prospection",
    group: "Clients et prospects",
    label: "Client, à des fins de prospection après la fin de la relation",
    amount: 3,
    unit: "ans",
    start: "fin de la relation commerciale (dernier achat, fin du contrat, dernier contact du client)",
    nature: "référentiel CNIL",
    summary:
      "Pendant la relation, les données sont conservées le temps nécessaire à son exécution. Elles peuvent ensuite servir à la prospection pendant 3 ans au plus.",
    note: "Les pièces comptables et les preuves de contrat suivent leurs propres durées légales, en archivage intermédiaire à accès restreint.",
    sources: [REF_COMMERCIAL],
  },
  {
    id: "liste-opposition",
    group: "Clients et prospects",
    label: "Liste d'opposition à la prospection",
    amount: 3,
    unit: "ans",
    start: "exercice du droit d'opposition",
    nature: "référentiel CNIL",
    summary:
      "Les informations permettant de respecter une opposition sont conservées au minimum 3 ans. C'est une durée minimale, pas un plafond.",
    sources: [REF_COMMERCIAL, "RGPD, article 21"],
  },
  {
    id: "contrat-electronique",
    group: "Clients et prospects",
    label: "Contrat conclu en ligne avec un consommateur (120 € ou plus)",
    amount: 10,
    unit: "ans",
    start: "conclusion du contrat, ou livraison / exécution si elle n'est pas immédiate",
    nature: "obligation légale de conservation",
    summary: "Le professionnel conserve l'écrit constatant le contrat pendant 10 ans.",
    sources: ["Code de la consommation, articles L. 213-1 et D. 213-2"],
  },
  {
    id: "pieces-comptables",
    group: "Clients et prospects",
    label: "Pièces comptables (factures, justificatifs)",
    amount: 10,
    unit: "ans",
    start: "clôture de l'exercice comptable",
    nature: "obligation légale de conservation",
    summary: "Les documents comptables et pièces justificatives sont conservés 10 ans.",
    sources: ["Code de commerce, article L. 123-22"],
  },
  {
    id: "carte-bancaire",
    group: "Clients et prospects",
    label: "Données de carte bancaire, pour contestation d'un paiement",
    amount: 13,
    unit: "mois",
    start: "date du débit (15 mois pour une carte à débit différé)",
    nature: "recommandation CNIL",
    summary:
      "Après la transaction, les données de carte peuvent être conservées en archivage intermédiaire 13 mois, le temps des contestations. Le cryptogramme visuel ne doit jamais être conservé.",
    note: "Leur conservation au-delà de la transaction, pour faciliter de futurs achats, suppose le consentement de la personne.",
    sources: [
      "Code monétaire et financier, article L. 133-24",
      "CNIL, délibération n° 2018-303 du 6 septembre 2018 portant adoption d'une recommandation concernant le traitement des données relatives à la carte de paiement",
    ],
  },

  // ── Ressources humaines ──
  {
    id: "candidat",
    group: "Ressources humaines",
    label: "Candidat non retenu",
    amount: 2,
    unit: "ans",
    start: "dernier contact avec le candidat",
    nature: "référentiel CNIL",
    summary:
      "Le dossier d'un candidat non retenu peut être conservé 2 ans au plus, pour lui proposer un autre poste, à condition de l'en informer et qu'il ne s'y oppose pas. À défaut, il est supprimé à la fin du recrutement.",
    sources: [
      "CNIL, référentiel relatif aux traitements de données personnelles mis en œuvre à des fins de recrutement (2023)",
    ],
  },
  {
    id: "bulletin-paie",
    group: "Ressources humaines",
    label: "Double des bulletins de paie",
    amount: 5,
    unit: "ans",
    start: "remise du bulletin",
    nature: "obligation légale de conservation",
    summary: "L'employeur conserve un double des bulletins de paie pendant 5 ans.",
    sources: ["Code du travail, article L. 3243-4"],
  },

  // ── Sécurité ──
  {
    id: "videosurveillance",
    group: "Sécurité",
    label: "Images de vidéoprotection ou de vidéosurveillance",
    amount: 1,
    unit: "mois",
    start: "enregistrement des images",
    nature: "plafond légal",
    summary:
      "Les images ne sont pas conservées plus d'un mois, sauf procédure en cours (elles sont alors extraites et conservées pour la procédure). Quelques jours suffisent en général à constater un incident.",
    note: "Le plafond légal vise les lieux ouverts au public ; pour les locaux de travail non ouverts au public, la CNIL recommande la même limite d'un mois.",
    sources: [
      "Code de la sécurité intérieure, article L. 252-5",
      "CNIL, fiches « La vidéoprotection dans les lieux ouverts au public » et « La vidéosurveillance – vidéoprotection au travail »",
    ],
  },
  {
    id: "logs-lcen",
    group: "Sécurité",
    label: "Données de connexion d'un hébergeur ou fournisseur d'accès (LCEN)",
    amount: 1,
    unit: "ans",
    start: "chaque connexion ou création du contenu",
    nature: "obligation légale de conservation",
    summary:
      "Les hébergeurs et fournisseurs d'accès conservent 1 an les données techniques (adresse IP, identifiants de connexion) permettant d'identifier l'auteur d'un contenu mis en ligne.",
    note: "Obligation propre aux hébergeurs et fournisseurs d'accès, pas à tout éditeur de site. Le même décret fixe 5 ans pour l'identité civile (à compter de la fin du contrat) et 1 an pour les autres informations fournies à l'inscription et les données de paiement.",
    sources: [
      "Décret n° 2021-1362 du 20 octobre 2021 relatif à la conservation des données permettant d'identifier toute personne ayant contribué à la création d'un contenu mis en ligne",
      "Loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), article 6",
    ],
  },
  {
    id: "journaux-securite",
    group: "Sécurité",
    label: "Journaux d'accès et d'actions sur un système d'information",
    amount: 1,
    unit: "ans",
    start: "enregistrement de l'événement",
    nature: "recommandation CNIL",
    summary:
      "La CNIL recommande de conserver les traces de journalisation entre 6 mois et 1 an, sauf obligation légale ou risque particulier justifiant une autre durée. L'échéance affichée est la borne haute.",
    sources: [
      "CNIL, délibération n° 2021-122 du 14 octobre 2021 portant adoption d'une recommandation relative à la journalisation",
    ],
  },
];

export function getRetentionRule(id: string): RetentionRule | undefined {
  return RETENTION_RULES.find((r) => r.id === id);
}

export function durationLabel(rule: Pick<RetentionRule, "amount" | "unit">): string {
  if (rule.unit === "ans") return `${rule.amount} an${rule.amount > 1 ? "s" : ""}`;
  return `${rule.amount} ${rule.unit}`;
}

/**
 * Date d'échéance : même quantième, N mois ou années plus tard ; ramené au
 * dernier jour du mois si ce quantième n'existe pas (31 janvier + 1 mois =
 * 28 ou 29 février). Calcul en UTC pour échapper aux changements d'heure.
 */
export function addDuration(start: Date, amount: number, unit: RetentionRule["unit"]): Date {
  if (unit === "jours") {
    return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + amount));
  }
  const months = unit === "ans" ? amount * 12 : amount;
  const y = start.getUTCFullYear();
  const m = start.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(start.getUTCDate(), lastDay)));
}

/** Analyse une date AAAA-MM-JJ saisie dans un champ `type="date"`. */
export function parseIsoDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) || d.getUTCDate() !== Number(m[3]) ? null : d;
}

export function formatDateFr(d: Date): string {
  const s = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return d.getUTCDate() === 1 ? s.replace(/^1 /, "1er ") : s;
}
