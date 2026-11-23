/** Lexiques de détection. Séparés du code pour être relus et amendés seuls. */

export const PRIVACY_LEXICON = [
  "politique de confidentialite",
  "politique de protection des donnees",
  "protection des donnees personnelles",
  "donnees personnelles",
  "vie privee",
  "privacy policy",
  "privacy",
  "datenschutz",
];

export const LEGAL_LEXICON = [
  "mentions legales",
  "mention legale",
  "informations legales",
  "legal notice",
  "impressum",
];

export const COOKIES_LEXICON = [
  "politique cookies",
  "politique de cookies",
  "gestion des cookies",
  "politique en matiere de cookies",
  "cookie policy",
  "gerer mes cookies",
  "preferences cookies",
  "parametrer les cookies",
];

export const TERMS_LEXICON = [
  "conditions generales",
  "cgu",
  "cgv",
  "conditions d'utilisation",
  "terms of service",
];

/** Signaux normatifs recherchés dans le corps d'une politique. */
export const POLICY_SIGNALS: readonly { key: string; label: string; terms: readonly string[] }[] = [
  {
    key: "controller",
    label: "Identité du responsable de traitement",
    terms: ["responsable de traitement", "responsable du traitement", "editeur du site", "siret", "siren", "rcs"],
  },
  {
    key: "dpo",
    label: "Contact délégué à la protection des données",
    terms: ["delegue a la protection des donnees", "dpo", "data protection officer", "referent rgpd"],
  },
  {
    key: "purposes",
    label: "Finalités des traitements",
    terms: [
      "finalite",
      "finalites",
      "aux fins de",
      "pour quelles finalites",
      "utilisees pour",
      "utilisons vos donnees",
      "nous utilisons vos",
      "pourquoi nous collectons",
      "purposes",
      "purpose of",
    ],
  },
  {
    key: "legal_basis",
    label: "Bases légales",
    terms: ["base legale", "bases legales", "interet legitime", "consentement", "execution du contrat"],
  },
  {
    key: "retention",
    label: "Durées de conservation",
    terms: ["duree de conservation", "durees de conservation", "conservees pendant", "conservation des donnees"],
  },
  {
    key: "recipients",
    label: "Catégories de destinataires",
    terms: [
      "destinataire",
      "destinataires",
      "sous-traitant",
      "sous-traitants",
      "prestataires",
      "partenaires",
      "communiquees a",
      "transmises a",
      "recipients",
      "third parties",
      "processors",
    ],
  },
  {
    key: "transfers",
    label: "Transferts hors Union européenne",
    terms: [
      "hors union europeenne",
      "hors ue",
      "transfert de donnees",
      "transferts de donnees",
      "pays tiers",
      "clauses contractuelles types",
      "data privacy framework",
      "hors espace economique europeen",
    ],
  },
  {
    key: "rights",
    label: "Droits des personnes",
    terms: [
      "droit d'acces",
      "droit de rectification",
      "droit a l'effacement",
      "droit d'opposition",
      "droit a la portabilite",
      "limitation du traitement",
    ],
  },
  {
    key: "cnil",
    label: "Droit de réclamation auprès de la CNIL",
    terms: ["cnil", "autorite de controle", "reclamation aupres de"],
  },
  {
    key: "host",
    label: "Identification de l'hébergeur",
    terms: ["hebergeur", "heberge par", "hebergement"],
  },
  {
    key: "duration_precise",
    label: "Durée chiffrée",
    terms: ["mois", "ans", "annees", "jours"],
  },
  // Plus strict que `legal_basis` : « consentement » apparaît dans toute
  // politique cookies, il ne prouve pas que les bases légales soient
  // annoncées. On exige la notion elle-même (CNIL, fiche 15 du guide RGPD
  // du développeur ; RGPD art. 13(1)(c)).
  {
    key: "legal_basis_explicit",
    label: "Bases légales nommées comme telles",
    terms: [
      "base legale",
      "bases legales",
      "base juridique",
      "bases juridiques",
      "fondement juridique",
      "fondements juridiques",
      "fondement legal",
      "fondement du traitement",
      "sur le fondement de",
      "sur la base de votre",
      "sur la base de l'interet",
      "sur la base de notre",
      "article 6",
      "art. 6",
      "liceite du traitement",
      "legal basis",
      "lawful basis",
      "legal bases",
    ],
  },
  // Exercice des droits : la procédure ET un canal (RGPD art. 12 et 13(2)(b)).
  {
    key: "rights_exercise",
    label: "Procédure d'exercice des droits",
    terms: [
      "exercer vos droits",
      "exercer ces droits",
      "exercer ses droits",
      "exercice de vos droits",
      "exercice des droits",
      "exercice de ces droits",
      "exercer votre droit",
      "exercer l'un de ces droits",
      "exercer l'un de vos droits",
      "faire valoir vos droits",
      "faire valoir ces droits",
      "adressez votre demande",
      "adresser votre demande",
      "exercise your rights",
      "exercise these rights",
      "exercise any of",
    ],
  },
  {
    key: "contact_channel",
    label: "Canal de contact",
    terms: [
      "@",
      "formulaire",
      "par courrier",
      "adresse postale",
      "par e-mail",
      "par email",
      "par courriel",
      "par mail",
      "contact form",
      "by email",
      "by post",
    ],
  },
  // Date ou version de la politique (CNIL, fiche 12 : informer d'une
  // modification suppose de pouvoir la dater).
  {
    key: "dated",
    label: "Date de mise à jour",
    terms: [
      "mise a jour le",
      "mis a jour le",
      "derniere mise a jour",
      "date de mise a jour",
      "derniere modification",
      "modifiee le",
      "en vigueur le",
      "en vigueur au",
      "en vigueur a compter",
      "date d'effet",
      "version du",
      "version en date du",
      "mise a jour :",
      "actualisee le",
      "actualise le",
      "revisee le",
      "last updated",
      "last modified",
      "effective date",
      "updated on",
    ],
  },
];

/**
 * Indices lexicaux de thématique sensible.
 *
 * Détection volontairement grossière : elle sert à SIGNALER un point de
 * vigilance, jamais à qualifier. Le constat correspondant porte une note
 * de faux positif explicite (KZC-SPECIAL-002).
 */
export const SENSITIVE_TOPICS: readonly { key: string; label: string; terms: readonly string[] }[] = [
  {
    key: "health",
    label: "Santé",
    terms: [
      "prise de rendez-vous medical",
      "consultation medicale",
      "ordonnance",
      "pathologie",
      "symptomes",
      "traitement medical",
      "cabinet medical",
      "pharmacie",
      "mutuelle sante",
      "teleconsultation",
      "patients",
      "diagnostic",
    ],
  },
  {
    key: "minors",
    label: "Audience mineure",
    terms: ["ecole primaire", "college", "creche", "enfants de", "jeux pour enfants", "eleves", "parascolaire"],
  },
  {
    key: "beliefs",
    label: "Opinions ou convictions",
    terms: ["syndicat", "parti politique", "paroisse", "culte", "confession religieuse"],
  },
  {
    key: "dating",
    label: "Rencontres",
    terms: ["site de rencontre", "rencontres celibataires", "trouver l'amour"],
  },
];

/** Sélecteurs et identifiants courants de conteneurs de bandeau. */
export const CMP_SELECTOR_HINTS: readonly string[] = [
  "cookie-banner",
  "cookie-consent",
  "cookie-notice",
  "cookiebanner",
  "cookieconsent",
  "cookie_banner",
  "cookie-law",
  "cookiebar",
  "cookie-bar",
  "gdpr-banner",
  "consent-banner",
  "consent-modal",
  "cmp-banner",
  "onetrust-banner-sdk",
  "cookiescript",
  "cc-window",
  "axeptio_overlay",
  "didomi-notice",
  "tarteaucitronAlertBig",
  "cmplz-cookiebanner",
  "cky-consent",
  "moove_gdpr_cookie_info_bar",
  "wt-cli-cookie-bar",
  "consent_blackbar",
];

/** Signatures d'API JavaScript exposées par les plateformes de consentement. */
export const CMP_API_SIGNATURES: readonly { marker: string; name: string; slug?: string }[] = [
  { marker: "__tcfapi", name: "Plateforme compatible IAB TCF v2.2" },
  { marker: "__gpp", name: "Plateforme compatible Global Privacy Platform" },
  { marker: "Cookiebot", name: "Cookiebot", slug: "cookiebot" },
  { marker: "axeptioSDK", name: "Axeptio", slug: "axeptio" },
  { marker: "axeptioSettings", name: "Axeptio", slug: "axeptio" },
  { marker: "OptanonWrapper", name: "OneTrust", slug: "onetrust" },
  { marker: "OneTrust", name: "OneTrust", slug: "onetrust" },
  { marker: "Didomi", name: "Didomi", slug: "didomi" },
  { marker: "tarteaucitron", name: "tarteaucitron.js", slug: "tarteaucitron" },
  { marker: "UC_UI", name: "Usercentrics", slug: "usercentrics" },
  { marker: "cmplz_", name: "Complianz", slug: "complianz" },
  { marker: "cookieyes", name: "CookieYes", slug: "cookieyes" },
  { marker: "klaro", name: "Klaro" },
  { marker: "Osano", name: "Osano" },
  { marker: "CookieConsent", name: "Plateforme de consentement générique" },
  { marker: "cookieconsent", name: "Plateforme de consentement générique" },
  { marker: "sirdata", name: "Sirdata CMP", slug: "sirdata" },
];
