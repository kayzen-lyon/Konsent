/**
 * Simulateur de procédure CNIL — logique pure, aucune dépendance au DOM,
 * aucun stockage.
 *
 * Deux parties :
 *  1. la frise des étapes réelles de la procédure répressive devant la CNIL,
 *     avec leurs fondements (loi n° 78-17 du 6 janvier 1978, décret
 *     n° 2019-536 du 29 mai 2019, RGPD, code de justice administrative) ;
 *  2. une heuristique pédagogique qui, à partir de quelques réponses, désigne
 *     le parcours le plus vraisemblable et explique les critères de
 *     l'article 83, § 2, du RGPD.
 *
 * L'heuristique n'est PAS un modèle prédictif : la CNIL décide au cas par cas,
 * et rien ne l'oblige à suivre un ordre. Les délais affichés sont indicatifs,
 * sauf ceux qui sont expressément fixés par un texte et signalés comme tels.
 *
 * Garde-fou repris du simulateur d'exposition : un plafond légal n'est jamais
 * affiché seul, il est toujours accompagné du plafond de la procédure
 * simplifiée et de la mention « plafond théorique, pas une prévision ».
 */

export type StepId =
  | "saisine"
  | "controle"
  | "pv"
  | "suites-legeres"
  | "mise-en-demeure"
  | "simplifiee"
  | "formation-restreinte"
  | "astreinte"
  | "publicite"
  | "recours";

export interface ProcedureStep {
  id: StepId;
  title: string;
  /** Qui agit. */
  actor: string;
  summary: string;
  /** Délai indicatif ; `legal: true` lorsqu'il est fixé par un texte. */
  delay: { text: string; legal: boolean };
  /** Ce que l'organisme peut, ou doit, faire à cette étape. */
  youCan: readonly string[];
  sources: readonly string[];
}

export const STEPS: readonly ProcedureStep[] = [
  {
    id: "saisine",
    title: "Déclenchement",
    actor: "Personne concernée, association, CNIL elle-même",
    summary:
      "La CNIL est saisie par une plainte, ou agit d'office : programme annuel de contrôles, actualité, signalement, notification de violation de données. Pour un traitement transfrontalier, le mécanisme de guichet unique peut confier le dossier à une autre autorité chef de file.",
    delay: { text: "Instruction d'une plainte : de quelques semaines à plusieurs mois.", legal: false },
    youCan: [
      "Répondre précisément et dans le délai indiqué à toute demande d'explication adressée à la suite d'une plainte.",
      "Traiter la demande de la personne si elle n'a pas encore reçu de réponse : c'est souvent ce qui clôt une plainte.",
      "Rassembler dès maintenant le registre, les contrats de sous-traitance et la documentation de conformité.",
    ],
    sources: [
      "RGPD, art. 57, § 1, f) et 77 (réclamation)",
      "RGPD, art. 56 et 60 (guichet unique)",
      "Loi n° 78-17, art. 8, I, 2°, d) et 19",
    ],
  },
  {
    id: "controle",
    title: "Contrôle",
    actor: "Agents habilités de la CNIL",
    summary:
      "Quatre modalités : contrôle en ligne (constatations depuis un service en ligne, y compris sous une identité d'emprunt), sur place, sur pièces (questionnaire), sur audition. Le contrôle en ligne est la voie habituelle pour les cookies et l'information des personnes.",
    delay: {
      text: "Contrôle sur place : une journée en général. Contrôle en ligne : sans prévenir. Questionnaire : délai fixé dans la demande, souvent de l'ordre de quelques semaines.",
      legal: false,
    },
    youCan: [
      "Contrôle sur place : vous pouvez vous opposer à la visite ; elle ne peut alors avoir lieu qu'avec l'autorisation du juge des libertés et de la détention.",
      "Désigner un interlocuteur, être assisté du conseil de votre choix, demander une copie des documents emportés.",
      "Ne pas faire obstacle : l'entrave à l'action de la CNIL est un délit.",
      "Commencer à corriger sans attendre : une mise en conformité rapide est prise en compte (art. 83, § 2, c).",
    ],
    sources: [
      "Loi n° 78-17, art. 19 (pouvoirs de contrôle, droit d'opposition, contrôle en ligne)",
      "Loi n° 78-17, art. 51 (délit d'entrave)",
      "Décret n° 2019-536 du 29 mai 2019",
    ],
  },
  {
    id: "pv",
    title: "Procès-verbal et échanges",
    actor: "Délégation de contrôle",
    summary:
      "Les constatations sont consignées dans un procès-verbal, notifié à l'organisme. Des pièces complémentaires peuvent être demandées. Les services instruisent ensuite le dossier et proposent une suite à la présidence.",
    delay: { text: "Notification du procès-verbal : à l'issue du contrôle ou dans les semaines qui suivent.", legal: false },
    youCan: [
      "Relire le procès-verbal et faire valoir vos observations sur les constats.",
      "Transmettre les éléments demandés, complets et datés, et documenter chaque correction apportée.",
    ],
    sources: ["Loi n° 78-17, art. 19", "Décret n° 2019-536 du 29 mai 2019"],
  },
  {
    id: "suites-legeres",
    title: "Clôture ou rappel des obligations",
    actor: "Présidence de la CNIL",
    summary:
      "Si les manquements sont mineurs ou déjà corrigés, le dossier peut être clos, éventuellement avec un courrier rappelant les obligations. La présidence peut aussi adresser un avertissement lorsqu'un traitement envisagé est susceptible de méconnaître les textes, ou un rappel à l'ordre.",
    delay: { text: "Variable.", legal: false },
    youCan: [
      "Conserver la trace des corrections : un manquement qui réapparaît sera apprécié à la lumière de ce rappel.",
    ],
    sources: ["Loi n° 78-17, art. 20, I et II", "RGPD, art. 58, § 2, a) et b)"],
  },
  {
    id: "mise-en-demeure",
    title: "Mise en demeure",
    actor: "Présidence de la CNIL",
    summary:
      "L'organisme est mis en demeure de se conformer dans un délai fixé. Ce n'est pas une sanction. Si la mise en conformité est démontrée dans le délai, la procédure est close ; à défaut, la formation restreinte peut être saisie. La mise en demeure peut être rendue publique.",
    delay: {
      text: "Délai fixé par la présidence, souvent de quelques semaines à quelques mois ; il peut être très court en cas d'extrême urgence.",
      legal: false,
    },
    youCan: [
      "Corriger chaque point listé et en apporter la preuve écrite avant l'échéance.",
      "Demander une prorogation motivée si le délai est matériellement intenable.",
      "Un manquement qui persiste après mise en demeure aggrave nettement la suite (art. 83, § 2, i et k).",
    ],
    sources: ["Loi n° 78-17, art. 20, II", "RGPD, art. 58, § 2, d)"],
  },
  {
    id: "simplifiee",
    title: "Procédure de sanction simplifiée",
    actor: "Président de la formation restreinte, ou un membre désigné, statuant seul",
    summary:
      "Pour les affaires peu complexes, au vu notamment de la jurisprudence établie. Pas d'audience publique sauf demande. Mesures possibles : rappel à l'ordre, injonction sous astreinte, amende administrative.",
    delay: {
      text: "Observations écrites dans le délai indiqué par la notification ; décision en quelques mois.",
      legal: false,
    },
    youCan: [
      "Présenter des observations écrites ; demander à être entendu.",
      "Faire valoir les corrections apportées et les éléments de contexte : ce sont les critères de l'art. 83, § 2.",
      "Plafonds fixés par la loi : amende de 20 000 € au plus ; astreinte de 100 € par jour de retard au plus.",
      "Les décisions de la procédure simplifiée ne sont pas rendues publiques.",
    ],
    sources: ["Loi n° 78-17, art. 22-1 (issu de la loi n° 2022-52 du 24 janvier 2022)"],
  },
  {
    id: "formation-restreinte",
    title: "Formation restreinte (procédure ordinaire)",
    actor: "Formation restreinte de la CNIL, sur rapport d'un rapporteur",
    summary:
      "Un rapporteur désigné propose des mesures dans un rapport notifié à l'organisme. Celui-ci répond par écrit, puis est entendu en séance. La formation restreinte peut prononcer : rappel à l'ordre, injonction sous astreinte, limitation ou interdiction du traitement, suspension des flux, retrait d'une certification, amende administrative.",
    delay: {
      text: "Observations écrites sur le rapport : un mois en principe, délai indiqué dans la notification. De la notification du rapport à la décision : plusieurs mois.",
      legal: false,
    },
    youCan: [
      "Consulter le dossier, présenter des observations écrites, être assisté ou représenté par un avocat.",
      "Être entendu en séance ; demander le huis clos dans les cas prévus.",
      "Plafonds : jusqu'à 10 M€ ou 2 % du chiffre d'affaires annuel mondial (art. 83, § 4), ou 20 M€ ou 4 % (art. 83, § 5 et 6), le montant le plus élevé étant retenu. Ce sont des maxima, pas des tarifs.",
    ],
    sources: [
      "Loi n° 78-17, art. 20, III, et 22",
      "RGPD, art. 58, § 2, et 83",
      "Décret n° 2019-536 du 29 mai 2019",
    ],
  },
  {
    id: "astreinte",
    title: "Astreinte et liquidation",
    actor: "Formation restreinte (ou son président en procédure simplifiée)",
    summary:
      "Une injonction peut être assortie d'une astreinte par jour de retard. Si la mise en conformité n'est pas démontrée à l'échéance, l'astreinte est liquidée.",
    delay: { text: "Court à compter de l'échéance fixée par la décision.", legal: false },
    youCan: [
      "Justifier de la mise en conformité dans le délai, pièces à l'appui.",
      "Plafonds : 100 000 € par jour en procédure ordinaire, 100 € par jour en procédure simplifiée.",
    ],
    sources: ["Loi n° 78-17, art. 20, III, et 22-1"],
  },
  {
    id: "publicite",
    title: "Publicité de la décision",
    actor: "Formation restreinte",
    summary:
      "Les mesures de la formation restreinte peuvent être rendues publiques, nominativement, sur le site de la CNIL et au Journal officiel. Une mise en demeure peut aussi être publiée. C'est souvent la conséquence la plus coûteuse pour l'image.",
    delay: { text: "Le plus souvent au moment de la décision.", legal: false },
    youCan: [
      "Présenter des observations sur l'opportunité de la publicité pendant la procédure.",
      "Anticiper la communication auprès des clients et des salariés.",
    ],
    sources: ["Loi n° 78-17, art. 20, II, et 22"],
  },
  {
    id: "recours",
    title: "Recours devant le Conseil d'État",
    actor: "Organisme sanctionné",
    summary:
      "Les décisions de sanction de la CNIL se contestent directement devant le Conseil d'État, en premier et dernier ressort, par un recours de plein contentieux. Le recours n'est pas suspensif ; un référé-suspension peut être demandé.",
    delay: { text: "Deux mois à compter de la notification de la décision.", legal: true },
    youCan: [
      "Saisir le Conseil d'État dans les deux mois, avec un avocat aux Conseils.",
      "Demander en urgence la suspension de la décision (référé-suspension).",
    ],
    sources: [
      "Code de justice administrative, art. R. 311-1, 4° (compétence du Conseil d'État)",
      "Code de justice administrative, art. R. 421-1 (délai de deux mois) et L. 521-1 (référé-suspension)",
    ],
  },
];

export function getStep(id: StepId): ProcedureStep {
  const s = STEPS.find((x) => x.id === id);
  if (!s) throw new Error(`Étape inconnue : ${id}`);
  return s;
}

// ─────────────────────────── Questions d'entrée ────────────────────────────

export type BreachType = "cookies" | "information" | "base-legale" | "securite" | "registre" | "transferts";
export type Size = "tpe" | "pme" | "grande";
export type Reach = "faible" | "moyenne" | "large";
export type Cooperation = "totale" | "partielle" | "absente";
export type History = "aucun" | "rappel" | "mise-en-demeure-ignoree";

export interface SimulationInput {
  breach: BreachType;
  size: Size;
  reach: Reach;
  cooperation: Cooperation;
  history: History;
  sensitive: boolean;
  corrected: boolean;
}

export const DEFAULT_INPUT: SimulationInput = {
  breach: "cookies",
  size: "pme",
  reach: "moyenne",
  cooperation: "totale",
  history: "aucun",
  sensitive: false,
  corrected: false,
};

export const BREACH_OPTIONS: readonly { id: BreachType; label: string; tier: "4" | "5"; ref: string }[] = [
  {
    id: "cookies",
    label: "Cookies et traceurs (dépôt avant consentement, refus difficile)",
    tier: "5",
    ref: "Loi n° 78-17, art. 82",
  },
  {
    id: "information",
    label: "Information des personnes ou exercice des droits",
    tier: "5",
    ref: "RGPD, art. 12 à 22",
  },
  {
    id: "base-legale",
    label: "Base légale, consentement, prospection, durées excessives",
    tier: "5",
    ref: "RGPD, art. 5, 6 et 7",
  },
  {
    id: "securite",
    label: "Sécurité des données ou violation non notifiée",
    tier: "4",
    ref: "RGPD, art. 32 à 34",
  },
  {
    id: "registre",
    label: "Documentation : registre, contrats de sous-traitance",
    tier: "4",
    ref: "RGPD, art. 28 et 30",
  },
  {
    id: "transferts",
    label: "Transferts hors de l'Union sans garantie",
    tier: "5",
    ref: "RGPD, art. 44 à 49",
  },
];

export const SIZE_OPTIONS: readonly { id: Size; label: string }[] = [
  { id: "tpe", label: "Très petite entreprise ou association (moins de 10 personnes)" },
  { id: "pme", label: "PME (moins de 250 personnes)" },
  { id: "grande", label: "Grande entreprise ou groupe" },
];

export const REACH_OPTIONS: readonly { id: Reach; label: string }[] = [
  { id: "faible", label: "Moins de 1 000 personnes concernées" },
  { id: "moyenne", label: "De 1 000 à 100 000 personnes" },
  { id: "large", label: "Plus de 100 000 personnes" },
];

export const COOPERATION_OPTIONS: readonly { id: Cooperation; label: string }[] = [
  { id: "totale", label: "Coopération pleine : réponses complètes et dans les délais" },
  { id: "partielle", label: "Coopération partielle : réponses tardives ou incomplètes" },
  { id: "absente", label: "Absence de réponse ou obstruction" },
];

export const HISTORY_OPTIONS: readonly { id: History; label: string }[] = [
  { id: "aucun", label: "Aucun antécédent connu" },
  { id: "rappel", label: "Rappel à l'ordre ou sanction antérieure" },
  { id: "mise-en-demeure-ignoree", label: "Mise en demeure restée sans effet" },
];

// ─────────────────────────── Scénario ──────────────────────────────────────

export type Outcome = "suites-legeres" | "mise-en-demeure" | "simplifiee" | "formation-restreinte";

export type Effect = "aggravant" | "atténuant" | "neutre";

export interface CriterionAssessment {
  letter: string;
  title: string;
  /** Ce que dit le texte, en une phrase. */
  meaning: string;
  effect: Effect;
  /** Pourquoi, au vu des réponses. */
  why: string;
}

export interface SimulationResult {
  outcome: Outcome;
  outcomeTitle: string;
  outcomeExplanation: string;
  /** Étapes du parcours le plus vraisemblable, dans l'ordre. */
  path: readonly StepId[];
  criteria: readonly CriterionAssessment[];
  ceiling: { tier: "4" | "5"; text: string };
  score: number;
}

const OUTCOME_TITLES: Record<Outcome, string> = {
  "suites-legeres": "Clôture ou rappel des obligations",
  "mise-en-demeure": "Mise en demeure",
  simplifiee: "Procédure de sanction simplifiée",
  "formation-restreinte": "Formation restreinte (procédure ordinaire)",
};

const BREACH_WEIGHT: Record<BreachType, number> = {
  cookies: 2,
  information: 2,
  "base-legale": 2,
  securite: 3,
  registre: 1,
  transferts: 3,
};

export function simulate(input: SimulationInput): SimulationResult {
  const tier: "4" | "5" = BREACH_OPTIONS.find((b) => b.id === input.breach)?.tier ?? "5";
  let score = BREACH_WEIGHT[input.breach];
  score += { tpe: 0, pme: 1, grande: 3 }[input.size];
  score += { faible: 0, moyenne: 1, large: 3 }[input.reach];
  score += input.sensitive ? 3 : 0;
  score += { aucun: 0, rappel: 3, "mise-en-demeure-ignoree": 5 }[input.history];
  score += { totale: -1, partielle: 1, absente: 4 }[input.cooperation];
  score += input.corrected ? -2 : 0;

  // Une affaire est « complexe » au sens de l'art. 22-1 quand elle n'est pas
  // tranchée par une jurisprudence établie : grande échelle, données
  // sensibles, grand groupe. Elle sort alors de la procédure simplifiée.
  const complex = input.sensitive || (input.size === "grande" && input.reach === "large");

  let outcome: Outcome;
  if (input.history === "mise-en-demeure-ignoree" || score >= 10) {
    outcome = complex || score >= 12 ? "formation-restreinte" : "simplifiee";
  } else if (score >= 7) {
    outcome = complex ? "formation-restreinte" : "simplifiee";
  } else if (score >= 3) {
    outcome = "mise-en-demeure";
  } else {
    outcome = "suites-legeres";
  }

  const base: StepId[] = ["saisine", "controle", "pv"];
  const path: StepId[] =
    outcome === "suites-legeres"
      ? [...base, "suites-legeres"]
      : outcome === "mise-en-demeure"
        ? [...base, "mise-en-demeure"]
        : outcome === "simplifiee"
          ? [...base, ...(input.history === "mise-en-demeure-ignoree" ? (["mise-en-demeure"] as StepId[]) : []), "simplifiee", "astreinte", "recours"]
          : [...base, ...(input.history === "mise-en-demeure-ignoree" ? (["mise-en-demeure"] as StepId[]) : []), "formation-restreinte", "astreinte", "publicite", "recours"];

  const explanations: Record<Outcome, string> = {
    "suites-legeres":
      "Au vu de vos réponses, le manquement paraît limité et la situation maîtrisée. Le dossier pourrait être clos, le cas échéant avec un rappel des obligations. Rien ne garantit cette issue : la CNIL peut toujours mettre en demeure ou engager une procédure de sanction.",
    "mise-en-demeure":
      "La mise en demeure est la suite la plus fréquente d'un contrôle qui révèle des manquements. Ce n'est pas une sanction : une mise en conformité démontrée dans le délai clôt en principe la procédure.",
    simplifiee:
      "Les éléments déclarés orientent vers une sanction, dans une affaire qui paraît relever d'une jurisprudence établie : la procédure simplifiée est alors la voie probable. Amende plafonnée à 20 000 €, décision non publiée.",
    "formation-restreinte":
      "La combinaison de facteurs aggravants (ampleur, données sensibles, antécédents, défaut de coopération ou taille de l'organisme) oriente vers la procédure ordinaire devant la formation restreinte, la seule où l'amende peut atteindre les plafonds de l'article 83 et où la décision peut être publiée.",
  };

  const criteria: CriterionAssessment[] = [
    {
      letter: "a",
      title: "Nature, gravité et durée du manquement",
      meaning:
        "Compte tenu de la nature, de la portée ou de la finalité du traitement, du nombre de personnes concernées et du niveau de dommage subi.",
      effect: input.reach === "large" || input.breach === "securite" || input.breach === "transferts" ? "aggravant" : input.reach === "faible" ? "atténuant" : "neutre",
      why:
        input.reach === "large"
          ? "Plus de 100 000 personnes concernées : la portée est un facteur d'aggravation constant dans les décisions."
          : input.reach === "faible"
            ? "Un nombre limité de personnes concernées."
            : "Une portée intermédiaire ; la durée du manquement compte aussi.",
    },
    {
      letter: "b",
      title: "Caractère délibéré ou négligent",
      meaning: "Une violation délibérée pèse plus lourd qu'une négligence.",
      effect: input.history === "mise-en-demeure-ignoree" ? "aggravant" : "neutre",
      why:
        input.history === "mise-en-demeure-ignoree"
          ? "Persister après une mise en demeure rend difficile de plaider la négligence."
          : "Non renseigné par le simulateur : il dépend des faits.",
    },
    {
      letter: "c",
      title: "Mesures prises pour atténuer le dommage",
      meaning: "Toute mesure prise par l'organisme pour atténuer le dommage subi par les personnes.",
      effect: input.corrected ? "atténuant" : "neutre",
      why: input.corrected
        ? "Manquement déjà corrigé : c'est l'un des leviers les plus efficaces, à condition de le documenter."
        : "Aucune correction déclarée à ce stade.",
    },
    {
      letter: "d",
      title: "Degré de responsabilité",
      meaning: "Compte tenu des mesures techniques et organisationnelles mises en œuvre (art. 25 et 32).",
      effect: input.breach === "securite" ? "aggravant" : "neutre",
      why:
        input.breach === "securite"
          ? "Un manquement à la sécurité interroge directement les mesures de l'article 32."
          : "Dépend des mesures en place, que le simulateur ne connaît pas.",
    },
    {
      letter: "e",
      title: "Violations pertinentes commises précédemment",
      meaning: "Les antécédents de l'organisme.",
      effect: input.history === "aucun" ? "neutre" : "aggravant",
      why: input.history === "aucun" ? "Aucun antécédent déclaré." : "Antécédent déclaré : facteur d'aggravation.",
    },
    {
      letter: "f",
      title: "Degré de coopération avec l'autorité",
      meaning: "En vue de remédier à la violation et d'en atténuer les effets.",
      effect: input.cooperation === "totale" ? "atténuant" : "aggravant",
      why:
        input.cooperation === "totale"
          ? "Une coopération pleine est prise en compte, sans effacer le manquement."
          : input.cooperation === "partielle"
            ? "Des réponses tardives ou incomplètes pèsent défavorablement."
            : "L'absence de réponse aggrave la suite ; l'obstruction est en outre un délit (loi n° 78-17, art. 51).",
    },
    {
      letter: "g",
      title: "Catégories de données concernées",
      meaning: "Notamment les données sensibles (art. 9) et les données d'infraction (art. 10).",
      effect: input.sensitive ? "aggravant" : "neutre",
      why: input.sensitive ? "Données sensibles en jeu : facteur d'aggravation majeur." : "Pas de données sensibles déclarées.",
    },
    {
      letter: "h",
      title: "Manière dont l'autorité a eu connaissance",
      meaning: "Notamment si, et dans quelle mesure, l'organisme a notifié la violation.",
      effect: "neutre",
      why: "Non renseigné : une notification spontanée d'une violation (art. 33) joue plutôt en faveur de l'organisme.",
    },
    {
      letter: "i",
      title: "Respect de mesures déjà ordonnées",
      meaning: "Lorsque des mesures de l'art. 58, § 2, ont déjà été ordonnées pour le même objet.",
      effect: input.history === "mise-en-demeure-ignoree" ? "aggravant" : "neutre",
      why:
        input.history === "mise-en-demeure-ignoree"
          ? "Une mise en demeure non suivie d'effet est l'un des chemins les plus directs vers la sanction."
          : "Aucune mesure antérieure déclarée pour ce manquement.",
    },
    {
      letter: "j",
      title: "Codes de conduite et certifications",
      meaning: "L'application d'un code de conduite approuvé (art. 40) ou d'une certification (art. 42).",
      effect: "neutre",
      why: "Non renseigné par le simulateur.",
    },
    {
      letter: "k",
      title: "Autres circonstances",
      meaning: "Toute autre circonstance aggravante ou atténuante, comme les avantages financiers obtenus ou les pertes évitées du fait du manquement.",
      effect: input.size === "grande" ? "aggravant" : input.size === "tpe" ? "atténuant" : "neutre",
      why:
        input.size === "grande"
          ? "La taille et la capacité financière entrent dans l'appréciation du caractère dissuasif et proportionné de l'amende (art. 83, § 1)."
          : input.size === "tpe"
            ? "La faible taille de la structure est prise en compte pour la proportionnalité (art. 83, § 1)."
            : "Taille intermédiaire.",
    },
  ];

  const ceiling =
    tier === "4"
      ? "Plafond théorique en formation restreinte : 10 M€ ou 2 % du chiffre d'affaires annuel mondial, le montant le plus élevé étant retenu (RGPD, art. 83, § 4)."
      : "Plafond théorique en formation restreinte : 20 M€ ou 4 % du chiffre d'affaires annuel mondial, le montant le plus élevé étant retenu (RGPD, art. 83, § 5 ; loi n° 78-17, art. 20, III).";

  return {
    outcome,
    outcomeTitle: OUTCOME_TITLES[outcome],
    outcomeExplanation: explanations[outcome],
    path,
    criteria,
    ceiling: { tier, text: ceiling },
    score,
  };
}

/** Plafond de l'amende en procédure simplifiée (loi n° 78-17, art. 22-1). */
export const SIMPLIFIED_FINE_MAX = 20_000;
