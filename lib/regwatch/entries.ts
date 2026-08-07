/**
 * M12 — Reg Watch.
 *
 * Un dirigeant qui a payé pour être conforme veut savoir qu'il le restera.
 * Un DPO qui doit justifier son budget a besoin d'un livrable régulier.
 *
 * Chaque entrée relie une évolution réglementaire aux règles du référentiel
 * qu'elle impacte. Le champ `status` distingue nettement ce qui est en
 * vigueur de ce qui n'est qu'un projet — la confusion entre les deux est
 * précisément ce dont le marché profite.
 */

export type WatchStatus =
  | "IN_FORCE" // texte applicable aujourd'hui
  | "PROPOSED" // proposition déposée, non adoptée
  | "CONTESTED" // proposition faisant l'objet d'un avis critique
  | "WITHDRAWN" // texte retiré
  | "CASE_LAW"; // décision juridictionnelle

export interface WatchEntry {
  id: string;
  title: string;
  status: WatchStatus;
  /** Date de l'acte : adoption, dépôt, décision. */
  date: string;
  source: string;
  sourceUrl: string;
  /** Ce que le texte dit, en une phrase factuelle. */
  summary: string;
  /** Ce que cela change concrètement pour un éditeur de site. */
  impact: string;
  /** Identifiants de règles du référentiel concernées. */
  rules: readonly string[];
  /** Recommandation d'action, volontairement prudente. */
  action: string;
  /** Échéance annoncée, si le texte en prévoit une. */
  horizon?: string;
}

export const STATUS_LABELS: Record<WatchStatus, string> = {
  IN_FORCE: "En vigueur",
  PROPOSED: "Projet non adopté",
  CONTESTED: "Projet contesté",
  WITHDRAWN: "Retiré",
  CASE_LAW: "Jurisprudence",
};

export const WATCH_ENTRIES: readonly WatchEntry[] = [
  {
    id: "art-82",
    title: "Article 82 de la loi n° 78-17 — consentement préalable aux traceurs",
    status: "IN_FORCE",
    date: "2018-06-20",
    source: "Légifrance",
    sourceUrl: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000037822826",
    summary:
      "Transposition de la directive 2002/58/CE. Le dépôt d'informations dans l'équipement terminal d'un utilisateur, ou l'accès à des informations déjà stockées, suppose son consentement préalable, sauf exceptions limitées.",
    impact:
      "C'est le fondement de la quasi-totalité des sanctions cookies prononcées en France. Il s'applique quelle que soit la technique employée : cookie, pixel, stockage local ou empreinte du terminal.",
    rules: ["KZC-DEPOT-001", "KZC-DEPOT-005", "KZC-REFUS-001", "KZC-STORAGE-001"],
    action: "Base juridique stable. Aucune anticipation particulière requise.",
  },
  {
    id: "eprivacy-retrait",
    title: "Retrait de la proposition de règlement ePrivacy",
    status: "WITHDRAWN",
    date: "2025-02-11",
    source: "Commission européenne",
    sourceUrl: "https://eur-lex.europa.eu/",
    summary:
      "Après huit ans de blocage au Conseil, la Commission a retiré sa proposition de règlement ePrivacy, qui devait remplacer la directive de 2002.",
    impact:
      "Le cadre applicable reste la directive 2002/58/CE transposée à l'article 82. Les annonces d'une refonte imminente du droit des cookies sont sans objet à ce titre.",
    rules: [],
    action:
      "Aucune. Se méfier des argumentaires commerciaux fondés sur un règlement ePrivacy « à venir ».",
  },
  {
    id: "omnibus-88a",
    title: "Projet d'article 88a — structure du consentement (Digital Omnibus)",
    status: "CONTESTED",
    date: "2025-11-19",
    source: "Commission européenne, COM(2025) 837",
    sourceUrl: "https://eur-lex.europa.eu/",
    summary:
      "La proposition rapatrierait les règles relatives aux traceurs dans le RGPD, encadrerait la structure du consentement, et envisagerait une exemption élargie pour la mesure d'audience first-party ainsi qu'une interdiction de re-solliciter pendant environ six mois après un refus.",
    impact:
      "Si le texte était adopté en l'état, la durée de mémorisation du refus deviendrait une obligation et non plus une recommandation. Le périmètre de l'exemption de mesure d'audience pourrait s'élargir.",
    rules: ["KZC-REFUS-005", "KZC-REFUS-010", "KZC-EXEMPT-001", "KZC-BANNER-002", "KZC-BANNER-003"],
    action:
      "Porter dès maintenant la durée de mémorisation du refus à six mois : c'est déjà recommandé, sans risque, et cela anticipe le texte. Ne rien changer d'autre : le projet n'est pas adopté.",
    horizon: "Environ 6 mois après une éventuelle entrée en vigueur",
  },
  {
    id: "omnibus-88b",
    title: "Projet d'article 88b — signaux de consentement transmis par le navigateur",
    status: "CONTESTED",
    date: "2025-11-19",
    source: "Commission européenne, COM(2025) 837",
    sourceUrl: "https://eur-lex.europa.eu/",
    summary:
      "La proposition rendrait juridiquement opposables les signaux de consentement émis automatiquement par le navigateur de l'utilisateur.",
    impact:
      "Les éditeurs devraient lire et respecter un signal transmis par le navigateur, sans interaction avec le bandeau. Cela rapprocherait le droit européen du mécanisme Global Privacy Control.",
    rules: ["KZC-CONSENT-006", "KZC-CONSENT-007"],
    action:
      "Veille. Une prise en charge anticipée du signal Global Privacy Control est un investissement raisonnable et sans effet négatif.",
    horizon: "Environ 24 mois après une éventuelle entrée en vigueur",
  },
  {
    id: "avis-cepd-2-2026",
    title: "Avis conjoint CEPD et CEPD-EDPS 2/2026 sur le Digital Omnibus",
    status: "CONTESTED",
    date: "2026-02-11",
    source: "Comité européen de la protection des données",
    sourceUrl: "https://www.edpb.europa.eu/",
    summary:
      "Les deux autorités ont rendu un avis conjoint critique sur plusieurs aspects de la proposition COM(2025) 837.",
    impact:
      "L'adoption du texte en l'état est incertaine. Fonder une stratégie de conformité sur ses dispositions serait prématuré.",
    rules: ["KZC-EXEMPT-006", "KZC-CONSENT-007"],
    action: "Ne rien changer sur la foi du projet. Suivre le parcours législatif.",
  },
  {
    id: "ld-2020-091",
    title: "Lignes directrices CNIL relatives aux cookies et autres traceurs",
    status: "IN_FORCE",
    date: "2020-09-17",
    source: "CNIL, délibération n° 2020-091",
    sourceUrl: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000042388179",
    summary:
      "Interprétation par la CNIL des obligations issues de l'article 82 : consentement libre, spécifique, éclairé et univoque, refus aussi simple que l'acceptation, information préalable sur les finalités et les destinataires.",
    impact:
      "C'est le référentiel de contrôle effectivement appliqué en France. La poursuite de navigation ne vaut pas consentement.",
    rules: ["KZC-DEPOT-007", "KZC-BANNER-002", "KZC-BANNER-010", "KZC-BANNER-012"],
    action: "Référence de contrôle. À traiter comme le standard applicable.",
  },
  {
    id: "reco-2020-092",
    title: "Recommandation CNIL sur les modalités pratiques de recueil du consentement",
    status: "IN_FORCE",
    date: "2020-09-17",
    source: "CNIL, délibération n° 2020-092",
    sourceUrl: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000042388197",
    summary:
      "Modalités concrètes : symétrie visuelle des boutons, durée de conservation des choix, mémorisation du refus, granularité par finalité.",
    impact:
      "Fournit les critères sur lesquels reposent la plupart des constats relatifs à l'ergonomie du bandeau, y compris l'asymétrie de traitement entre accepter et refuser.",
    rules: [
      "KZC-BANNER-003",
      "KZC-BANNER-004",
      "KZC-BANNER-005",
      "KZC-BANNER-006",
      "KZC-REFUS-004",
      "KZC-REFUS-005",
    ],
    action: "Appliquer intégralement. C'est la grille de lecture du régulateur.",
  },
  {
    id: "planet49",
    title: "CJUE, C-673/17, Planet49 — cases pré-cochées",
    status: "CASE_LAW",
    date: "2019-10-01",
    source: "Cour de justice de l'Union européenne",
    sourceUrl: "https://curia.europa.eu/juris/liste.jsf?num=C-673/17",
    summary:
      "Une case pré-cochée ne constitue pas un consentement valable au sens du RGPD, l'utilisateur devant manifester une volonté active.",
    impact:
      "Toute finalité non essentielle cochée par défaut dans un panneau de réglages est un manquement caractérisé.",
    rules: ["KZC-BANNER-007"],
    action: "Vérifier qu'aucune finalité n'est activée par défaut.",
  },
  {
    id: "schrems-ii",
    title: "CJUE, C-311/18, Schrems II — transferts vers les pays tiers",
    status: "CASE_LAW",
    date: "2020-07-16",
    source: "Cour de justice de l'Union européenne",
    sourceUrl: "https://curia.europa.eu/juris/liste.jsf?num=C-311/18",
    summary:
      "Invalidation du Privacy Shield et exigence d'une évaluation du niveau de protection effectif du pays destinataire, au-delà de la seule signature de clauses contractuelles types.",
    impact:
      "Une analyse d'impact des transferts est attendue pour chaque destinataire hors adéquation. La seule existence de clauses contractuelles ne suffit pas.",
    rules: ["KZC-TRANSFER-002", "KZC-TRANSFER-005", "KZC-TRANSFER-007"],
    action:
      "Documenter une analyse d'impact des transferts pour chaque destinataire hors décision d'adéquation.",
  },
  {
    id: "dpf-2023",
    title: "Décision d'adéquation EU-US Data Privacy Framework",
    status: "IN_FORCE",
    date: "2023-07-10",
    source: "Décision d'exécution (UE) 2023/1795",
    sourceUrl: "https://eur-lex.europa.eu/",
    summary:
      "La Commission a reconnu un niveau de protection adéquat pour les transferts vers les organisations américaines certifiées au titre du Data Privacy Framework.",
    impact:
      "Les transferts vers un destinataire américain certifié sont facilités. La certification doit être vérifiée entité par entité, et son maintien contrôlé dans le temps.",
    rules: ["KZC-TRANSFER-003", "KZC-TRANSFER-004"],
    action:
      "Vérifier la certification de chaque destinataire américain sur la liste officielle, et consigner la date de vérification.",
  },
  {
    id: "avis-cepd-08-2024",
    title: "Avis CEPD 08/2024 — modèles « consentir ou payer »",
    status: "IN_FORCE",
    date: "2024-04-17",
    source: "Comité européen de la protection des données",
    sourceUrl: "https://www.edpb.europa.eu/",
    summary:
      "Le comité considère que, dans la plupart des cas, les grandes plateformes ne peuvent pas se contenter d'un choix binaire entre consentir au suivi publicitaire et payer.",
    impact:
      "Une alternative réelle et équitable doit être proposée, et sa proportionnalité documentée.",
    rules: ["KZC-BANNER-016", "KZC-BANNER-017"],
    action:
      "Si un tel modèle est en place, documenter l'alternative proposée et la justification du tarif retenu.",
  },
  {
    id: "consent-mode-v2",
    title: "Google Consent Mode v2 — signaux ad_user_data et ad_personalization",
    status: "IN_FORCE",
    date: "2024-03-06",
    source: "Exigences contractuelles Google",
    sourceUrl: "https://support.google.com/",
    summary:
      "Depuis mars 2024, deux signaux supplémentaires doivent être transmis pour continuer à bénéficier des fonctionnalités publicitaires et de mesure de Google dans l'EEE.",
    impact:
      "Il s'agit d'une exigence contractuelle privée, distincte du droit applicable. Son non-respect dégrade la mesure sans constituer, en soi, un manquement au RGPD.",
    rules: ["KZC-CMV2-001", "KZC-CMV2-002", "KZC-CMV2-003"],
    action:
      "Déclarer les quatre signaux en « denied » par défaut, puis les mettre à jour selon le choix exprimé.",
  },
];

export function entriesForRule(ruleId: string): readonly WatchEntry[] {
  return WATCH_ENTRIES.filter((e) => e.rules.includes(ruleId));
}
