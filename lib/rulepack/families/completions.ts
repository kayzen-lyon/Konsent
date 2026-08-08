import type { Rule } from "../types";

/**
 * Complétion des familles ouvertes.
 *
 * Le premier jet du rulepack avait livré les familles à fort rendement
 * (DEPOT, REFUS, BANNER, complètes) et laissé les autres partielles. Les
 * règles manquantes sont regroupées ici plutôt que réparties dans les fichiers
 * d'origine : l'ordre de lecture d'une famille compte moins que la traçabilité
 * de ce qui a été ajouté, et quand, dans un référentiel versionné.
 */

const REVIEWED = "2026-08-08";

const ART82 = "Article 82, loi n° 78-17 du 6 janvier 1978 modifiée";
const LD_2020_091 = "CNIL, lignes directrices, délibération n° 2020-091";
const REC_2020_092 = "CNIL, recommandation, délibération n° 2020-092";

/* ------------------------------------------------------------------ CMV2 */

export const CMV2_EXTRA_RULES: readonly Rule[] = [
  {
    id: "KZC-CMV2-004",
    family: "CMV2",
    severity: "MAJOR",
    weight: 8,
    phases: ["A"],
    engine: "headless",
    title: "Le délai d'attente du signal de consentement est absent ou trop court",
    references: [
      "Google, spécification Consent Mode v2 — paramètre `wait_for_update`",
      "RGPD, article 7(1)",
    ],
    omnibusStatus: "Sans objet — spécification d'éditeur, hors champ du projet COM(2025) 837.",
    messageExec:
      "Vos balises de mesure partent avant d'avoir reçu la réponse de votre bandeau. Le choix du visiteur arrive trop tard pour être pris en compte.",
    messageTech: "`wait_for_update` absent ou < 500 ms alors que la CMP répond en {ms} ms.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 390],
      steps: ["Porter `wait_for_update` à 500 ms au minimum, aligné sur le temps de réponse réel de la CMP."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-CMV2-005",
    family: "CMV2",
    severity: "MODERATE",
    weight: 4,
    phases: ["A", "B"],
    engine: "headless",
    title: "Des mesures anonymisées sont émises malgré l'absence de consentement",
    references: [ART82, "Google, spécification Consent Mode v2 — mode avancé"],
    omnibusStatus:
      "Incertain — l'exemption de mesure d'audience du projet d'article 88a §3 pourrait couvrir ces envois. Non applicable à ce jour.",
    messageExec:
      "Même sans accord, des signaux partent vers l'outil de mesure. Ils sont annoncés comme anonymes, mais ils partent quand même.",
    messageTech: "Requêtes `/g/collect` observées en phase A ou B avec `gcs=G1{0,0}`.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: [
        "Arbitrer entre mode avancé et mode simple, et documenter le choix.",
        "En mode avancé, vérifier qu'aucun identifiant n'est joint aux envois sans consentement.",
      ],
    },
    falsePositiveNotes:
      "Le mode avancé est un choix légitime et documenté. La règle signale, elle ne condamne pas : la sévérité est modérée à dessein.",
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-CMV2-006",
    family: "CMV2",
    severity: "MAJOR",
    weight: 12,
    phases: ["B", "C"],
    engine: "headless",
    title: "Le choix du visiteur n'est jamais répercuté sur les balises",
    references: ["Google, spécification Consent Mode v2 — `consent update`", "RGPD, article 7(3)"],
    omnibusStatus: "Sans objet.",
    messageExec:
      "Votre bandeau enregistre le choix du visiteur, mais ne le transmet pas aux outils de mesure et de publicité. Le choix reste sans effet.",
    messageTech: "Aucun `gtag('consent','update',…)` observé après action utilisateur.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["Brancher le rappel de la CMP sur l'émission de la mise à jour Consent Mode."],
    },
    lastReviewed: REVIEWED,
  },
];

/* --------------------------------------------------------------- CONSENT */

export const CONSENT_EXTRA_RULES: readonly Rule[] = [
  {
    id: "KZC-CONSENT-002",
    family: "CONSENT",
    severity: "MAJOR",
    weight: 10,
    phases: ["C"],
    engine: "headless",
    title: "Le consentement recueilli n'est ni horodaté ni rattaché à une version",
    references: ["RGPD, article 7(1)", LD_2020_091],
    omnibusStatus: "Maintenu — la charge de la preuve reste à l'éditeur.",
    messageExec:
      "Vous ne pouvez pas dire quand un visiteur a donné son accord, ni à quelle version de votre bandeau. En cas de contrôle, l'accord est indémontrable.",
    messageTech:
      "Aucun champ d'horodatage ni de version dans la preuve stockée ({storageKeys}).",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: [
        "Horodater chaque consentement en UTC et lui attacher la version du bandeau et de la liste des finalités.",
        "Conserver la preuve côté serveur, pas seulement dans le navigateur.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-CONSENT-003",
    family: "CONSENT",
    severity: "MODERATE",
    weight: 4,
    phases: ["C"],
    engine: "headless",
    title: "Le visiteur ne peut pas récupérer la preuve de son propre choix",
    references: ["RGPD, articles 15 et 20"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Un visiteur qui demande ce qu'il a accepté, et quand, ne dispose d'aucun moyen de l'obtenir par lui-même.",
    messageTech: "Aucun mécanisme d'export du consentement exposé dans l'interface.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 390],
      steps: ["Ajouter un export du consentement dans l'écran de gestion des préférences."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-CONSENT-005",
    family: "CONSENT",
    severity: "MODERATE",
    weight: 5,
    phases: ["C"],
    engine: "headless",
    title: "Le consentement est recueilli sur plusieurs terminaux sans en informer le visiteur",
    references: [
      "CNIL, recommandation de janvier 2026 relative au consentement multi-terminaux",
      "RGPD, article 13",
    ],
    omnibusStatus:
      "Convergent — le projet d'article 88b sur les signaux navigateur va dans le même sens.",
    messageExec:
      "Le choix fait sur un appareil est reporté sur les autres appareils du même visiteur, sans que celui-ci en soit informé.",
    messageTech:
      "Consentement rattaché à un identifiant de compte propagé hors du terminal d'origine.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: [
        "Informer explicitement de la portée multi-terminaux au moment du recueil.",
        "Offrir un choix distinct par terminal lorsque la propagation n'est pas souhaitée.",
      ],
    },
    lastReviewed: REVIEWED,
  },
];

/* ------------------------------------------------------------------- DOC */

export const DOC_EXTRA_RULES: readonly Rule[] = [
  {
    id: "KZC-DOC-007",
    family: "DOC",
    severity: "MAJOR",
    weight: 10,
    phases: ["A"],
    engine: "static",
    title: "Les finalités des traitements ne sont pas énoncées",
    references: ["RGPD, article 13(1)(c)"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Votre politique ne dit pas à quoi servent les données collectées. C'est la première information qu'un visiteur — et un contrôleur — cherche.",
    messageTech: "Aucun bloc de finalités identifié dans {url}.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 690],
      steps: ["Énoncer chaque finalité en propre, sans formule générique."],
    },
    falsePositiveNotes:
      "Une page rendue côté client peut ne livrer aucun texte au moteur statique. Dans ce cas la règle s'abstient plutôt que de conclure.",
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DOC-008",
    family: "DOC",
    severity: "MAJOR",
    weight: 8,
    phases: ["A"],
    engine: "static",
    title: "Les bases légales ne sont pas indiquées traitement par traitement",
    references: ["RGPD, articles 6 et 13(1)(c)"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Votre politique ne précise pas ce qui vous autorise à traiter chaque donnée : le consentement, le contrat, ou autre chose.",
    messageTech: "Aucune mention de base légale rattachée à un traitement dans {url}.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 690],
      steps: ["Associer une base légale à chaque finalité listée."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DOC-010",
    family: "DOC",
    severity: "MAJOR",
    weight: 8,
    phases: ["A"],
    engine: "static",
    title: "Les catégories de destinataires ne sont pas indiquées",
    references: ["RGPD, article 13(1)(e)"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Votre politique ne dit pas à qui les données sont transmises, alors que le scan identifie des destinataires tiers.",
    messageTech: "Aucune catégorie de destinataires dans {url}, {n} destinataires tiers observés.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 690],
      steps: ["Lister les catégories de destinataires, en les rapprochant du résultat du scan."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DOC-014",
    family: "DOC",
    severity: "MODERATE",
    weight: 5,
    phases: ["A"],
    engine: "static",
    title: "Les modalités d'exercice des droits ne sont pas précisées",
    references: ["RGPD, article 12(3)"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Les droits sont énumérés, mais on ne dit pas comment les exercer, ni auprès de qui, ni sous quel délai.",
    messageTech: "Droits mentionnés dans {url} sans canal ni délai associés.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 390],
      steps: ["Indiquer un canal de contact dédié et le délai de réponse d'un mois."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DOC-015",
    family: "DOC",
    severity: "MODERATE",
    weight: 4,
    phases: ["A"],
    engine: "static",
    title: "La politique n'est ni datée ni versionnée",
    references: ["RGPD, article 12(1)", "RGPD, article 5(2) — responsabilité"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Impossible de savoir de quand date votre politique. Vous ne pouvez donc pas démontrer quelle version s'appliquait à un visiteur donné.",
    messageTech: "Aucune date de mise à jour ni numéro de version détectés dans {url}.",
    remediation: {
      effort: "LOW",
      billable: false,
      steps: ["Afficher la date de dernière mise à jour et conserver l'historique des versions."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DOC-018",
    family: "DOC",
    severity: "MODERATE",
    weight: 4,
    phases: ["A"],
    engine: "static",
    title: "La politique n'existe qu'en français sur un site multilingue",
    references: ["RGPD, article 12(1) — information intelligible et aisément accessible"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Votre site s'adresse à des visiteurs dans plusieurs langues, mais l'information sur les données n'est disponible que dans une seule.",
    messageTech: "Alternates détectés : {langs}. Politique trouvée uniquement en {found}.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["Traduire la politique dans chaque langue proposée par le site."],
    },
    lastReviewed: REVIEWED,
  },
];

/* ---------------------------------------------------------------- EXEMPT */

export const EXEMPT_EXTRA_RULES: readonly Rule[] = [
  {
    id: "KZC-EXEMPT-004",
    family: "EXEMPT",
    severity: "MAJOR",
    weight: 8,
    phases: ["A", "C"],
    engine: "headless",
    title: "Les données de mesure sont conservées au-delà de vingt-cinq mois",
    references: [
      "CNIL, recommandation relative à la mesure d'audience exemptée (25 mois)",
      ART82,
    ],
    omnibusStatus:
      "Incertain — le projet d'article 88a §3 c) redéfinirait les conditions de l'exemption.",
    messageExec:
      "Votre outil de mesure garde les données plus longtemps que ce que l'exemption autorise. L'exemption tombe, et le consentement redevient obligatoire.",
    messageTech: "Rétention déclarée {months} mois sur {tool}.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 390],
      steps: ["Ramener la conservation à 25 mois au maximum dans la configuration de l'outil."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-EXEMPT-006",
    family: "EXEMPT",
    severity: "INFO",
    weight: 0,
    phases: ["A"],
    engine: "static",
    title: "Configuration potentiellement éligible à l'exemption élargie du projet Digital Omnibus",
    references: ["Proposition COM(2025) 837, projet d'article 88a §3 c) — NON ADOPTÉ"],
    omnibusStatus:
      "Prospectif — ne rien changer aujourd'hui. L'avis conjoint CEPD/EDPS 2/2026 du 11 février 2026 est critique sur ce point.",
    messageExec:
      "Si le projet européen en discussion était adopté en l'état, votre mesure d'audience pourrait être dispensée de consentement. Le texte n'est pas adopté : aucune décision à prendre aujourd'hui.",
    messageTech: "Mesure first-party sans recoupement inter-sites détecté.",
    remediation: {
      effort: "LOW",
      billable: false,
      steps: ["Aucune action. Suivre l'évolution du texte via le module de veille."],
    },
    lastReviewed: REVIEWED,
  },
];

/* -------------------------------------------------------------------- FP */

export const FP_EXTRA_RULES: readonly Rule[] = [
  {
    id: "KZC-FP-003",
    family: "FP",
    severity: "MAJOR",
    weight: 10,
    phases: ["A"],
    engine: "headless",
    title: "Empreinte audio du terminal relevée avant consentement",
    references: [ART82, LD_2020_091],
    omnibusStatus: "Maintenu — le projet d'article 88a couvre la lecture d'informations du terminal.",
    messageExec:
      "Un script mesure la façon dont le terminal de vos visiteurs traite le son. C'est une technique d'identification qui ne dépend d'aucun cookie et survit à leur effacement.",
    messageTech: "`AudioContext` instancié puis `getChannelData`/`getFloatFrequencyData` en phase A par {origin}.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["Identifier le script responsable et conditionner son chargement au consentement."],
    },
    falsePositiveNotes:
      "Un lecteur audio légitime instancie aussi un `AudioContext`. La règle exige la lecture des données de sortie sans lecture de média.",
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-FP-004",
    family: "FP",
    severity: "MAJOR",
    weight: 8,
    phases: ["A"],
    engine: "headless",
    title: "Énumération des polices installées avant consentement",
    references: [ART82],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Un script mesure quelles polices sont installées sur l'ordinateur de vos visiteurs. La liste des polices est presque aussi identifiante qu'un numéro de série.",
    messageTech: "{n} mesures successives de largeur de texte sur polices candidates, en phase A.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["Conditionner le script au consentement, ou le remplacer."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-FP-005",
    family: "FP",
    severity: "MAJOR",
    weight: 8,
    phases: ["A"],
    engine: "headless",
    title: "Collecte d'indices détaillés sur le terminal avant consentement",
    references: [ART82],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Un script demande au navigateur des détails précis sur la machine : modèle, version exacte, architecture. Ces détails ne servent pas à afficher la page.",
    messageTech: "`navigator.userAgentData.getHighEntropyValues({hints})` appelé en phase A.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["Restreindre par `Permissions-Policy`, et conditionner le script au consentement."],
    },
    lastReviewed: REVIEWED,
  },
];

/* ------------------------------------------------------------------- SEC */

export const SEC_EXTRA_RULES: readonly Rule[] = [
  {
    id: "KZC-SEC-006",
    family: "SEC",
    severity: "MINOR",
    weight: 2,
    phases: ["A"],
    engine: "static",
    title: "Une version de CMS ou d'extension est exposée publiquement",
    references: ["RGPD, article 32 — sécurité du traitement"],
    omnibusStatus: "Sans objet.",
    messageExec:
      "Votre site annonce publiquement quelle version de son moteur il utilise. C'est la première chose que cherche un attaquant automatisé.",
    messageTech: "Version exposée via {source} : {value}.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 390],
      steps: ["Retirer la balise `generator` et les en-têtes de version.", "Maintenir le socle à jour."],
    },
    falsePositiveNotes:
      "Masquer la version ne corrige aucune faille. Le constat est mineur à dessein : c'est un signal d'hygiène, pas une vulnérabilité.",
    lastReviewed: REVIEWED,
  },
];

/* --------------------------------------------------------------- SPECIAL */

export const SPECIAL_EXTRA_RULES: readonly Rule[] = [
  {
    id: "KZC-SPECIAL-001",
    family: "SPECIAL",
    severity: "CRITICAL",
    weight: 25,
    phases: ["A"],
    engine: "static",
    title: "Traceurs publicitaires sur un site susceptible de s'adresser à des mineurs",
    references: [
      "RGPD, article 8 et considérant 38",
      "CNIL, recommandation du 9 juin 2021 relative aux droits des mineurs",
    ],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Votre site paraît s'adresser en partie à un public mineur, et des traceurs publicitaires y sont actifs. C'est le cas de figure que les autorités traitent en priorité.",
    messageTech: "Indices lexicaux et sectoriels d'audience mineure : {signals}.",
    remediation: {
      effort: "HIGH",
      billable: true,
      priceHintEur: [890, 1900],
      steps: [
        "Retirer le ciblage publicitaire sur les parcours destinés aux mineurs.",
        "Documenter la vérification d'âge si le service en exige une.",
      ],
    },
    falsePositiveNotes:
      "La détection d'audience mineure est lexicale et donc faillible. Le constat s'affiche comme une hypothèse à confirmer par l'éditeur, jamais comme un fait établi.",
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-SPECIAL-003",
    family: "SPECIAL",
    severity: "CRITICAL",
    weight: 25,
    phases: ["A", "C"],
    engine: "headless",
    title: "Enregistrement de session actif sur un formulaire de données sensibles",
    references: [ART82, "RGPD, article 9", "RGPD, article 32"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Un outil filme ce que vos visiteurs tapent, sur une page qui leur demande des informations sensibles. Ces frappes partent chez un tiers.",
    messageTech: "Outil d'enregistrement {tool} actif sur {url}, champs sensibles détectés : {fields}.",
    remediation: {
      effort: "HIGH",
      billable: true,
      priceHintEur: [890, 1900],
      steps: [
        "Exclure les pages sensibles de l'enregistrement.",
        "Activer le masquage des champs par défaut, et le vérifier.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-SPECIAL-004",
    family: "SPECIAL",
    severity: "MAJOR",
    weight: 15,
    phases: ["A", "C"],
    engine: "headless",
    title: "Des champs de formulaire sont lus par un tiers avant leur envoi",
    references: [ART82, "RGPD, article 5(1)(a)"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Ce que vos visiteurs saisissent est transmis à un tiers avant même qu'ils aient cliqué sur « envoyer ». Y compris s'ils renoncent.",
    messageTech: "Écouteurs `input`/`change` posés par {origin} sur {fields}, émission observée à T+{ms} ms.",
    remediation: {
      effort: "HIGH",
      billable: true,
      priceHintEur: [890, 1900],
      steps: [
        "Identifier le script et désactiver la capture de saisie.",
        "Vérifier les listes d'exclusion de champs dans l'outil de mesure.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-SPECIAL-006",
    family: "SPECIAL",
    severity: "MAJOR",
    weight: 15,
    phases: ["A"],
    engine: "static",
    title: "Traceurs tiers sur un site révélant une donnée sensible par sa seule fréquentation",
    references: ["RGPD, article 9", ART82],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Sur un site de ce type, le simple fait de visiter une page révèle une information sensible sur la personne. La transmettre à un tiers publicitaire relève d'un régime plus strict.",
    messageTech: "Secteur inféré : {sector}. Destinataires publicitaires tiers : {vendors}.",
    remediation: {
      effort: "HIGH",
      billable: true,
      priceHintEur: [890, 1900],
      steps: [
        "Retirer les traceurs publicitaires tiers des parcours concernés.",
        "Documenter la base légale au titre de l'article 9 si un traitement est maintenu.",
      ],
    },
    falsePositiveNotes:
      "L'inférence sectorielle est indicative. Le constat doit être confirmé par l'éditeur avant toute exploitation.",
    lastReviewed: REVIEWED,
  },
];

/* --------------------------------------------------------------- STORAGE */

export const STORAGE_EXTRA_RULES: readonly Rule[] = [
  {
    id: "KZC-STORAGE-004",
    family: "STORAGE",
    severity: "MAJOR",
    weight: 10,
    phases: ["A"],
    engine: "headless",
    title: "Le cache du navigateur est détourné pour conserver un identifiant",
    references: [ART82],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Un identifiant est rangé dans le cache du navigateur plutôt que dans un cookie. Effacer les cookies ne suffit alors plus à repartir de zéro.",
    messageTech: "Entrée CacheStorage `{key}` à forte entropie, écrite par {origin} en phase A.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["Conditionner l'écriture au consentement, au même titre qu'un cookie."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-STORAGE-005",
    family: "STORAGE",
    severity: "MODERATE",
    weight: 5,
    phases: ["A"],
    engine: "headless",
    title: "Un identifiant de suivi est placé en sessionStorage avant consentement",
    references: [ART82],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Un identifiant de suivi est écrit dès l'arrivée. Il ne survit pas à la fermeture de l'onglet, mais il suit le visiteur pendant toute sa visite.",
    messageTech: "Clé sessionStorage `{key}` à forte entropie écrite en phase A.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 390],
      steps: ["Différer l'écriture jusqu'au consentement."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-STORAGE-008",
    family: "STORAGE",
    severity: "MAJOR",
    weight: 12,
    phases: ["A", "C"],
    engine: "headless",
    title: "Un relais de collecte côté serveur transmet à un tiers sans être déclaré",
    references: [ART82, "RGPD, articles 13 et 28"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Les données passent par un domaine qui vous appartient, puis repartent vers un tiers. Le montage est invisible pour le visiteur, et le tiers n'est pas déclaré.",
    messageTech: "Point de collecte {endpoint} sur domaine first-party, redirection ou relais vers {destination}.",
    remediation: {
      effort: "HIGH",
      billable: true,
      priceHintEur: [890, 1900],
      steps: [
        "Déclarer le destinataire final dans la politique cookies et le registre.",
        "Conditionner le relais au consentement, comme un traceur tiers direct.",
      ],
    },
    falsePositiveNotes:
      "Un relais côté serveur est licite. Le constat porte sur l'absence de déclaration, pas sur la technique.",
    lastReviewed: REVIEWED,
  },
];

/* -------------------------------------------------------------- TRANSFER */

export const TRANSFER_EXTRA_RULES: readonly Rule[] = [
  {
    id: "KZC-TRANSFER-004",
    family: "TRANSFER",
    severity: "MAJOR",
    weight: 12,
    phases: ["A", "C"],
    engine: "static",
    title: "La certification américaine du destinataire est expirée ou retirée",
    references: [
      "Décision d'adéquation (UE) 2023/1795 — EU-US Data Privacy Framework",
      "RGPD, article 45",
    ],
    omnibusStatus: "Sans objet.",
    messageExec:
      "Le destinataire américain de vos données n'est plus couvert par l'accord qui autorisait le transfert. Le transfert continue, la garantie non.",
    messageTech: "Entité {entity}, statut DPF `{status}`, vérifié le {checkedAt}.",
    remediation: {
      effort: "HIGH",
      billable: true,
      priceHintEur: [890, 1900],
      steps: [
        "Vérifier le statut sur la liste officielle du Data Privacy Framework.",
        "À défaut de certification, mettre en place des clauses contractuelles types et une analyse d'impact des transferts.",
      ],
    },
    falsePositiveNotes:
      "Notre copie de la liste porte sa date de vérification. Au-delà de 30 jours, le constat s'affiche comme à confirmer.",
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-TRANSFER-008",
    family: "TRANSFER",
    severity: "MAJOR",
    weight: 8,
    phases: ["A"],
    engine: "static",
    title: "Aucune information sur les garanties encadrant les transferts",
    references: ["RGPD, articles 13(1)(f) et 46"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Des données partent hors de l'Union, et votre politique ne dit pas quelles garanties les encadrent ni comment en obtenir copie.",
    messageTech: "{n} destinataires hors EEE observés, aucune mention de CCT ou de BCR dans {url}.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["Mentionner l'instrument de transfert et le moyen d'en obtenir copie."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-TRANSFER-009",
    family: "TRANSFER",
    severity: "MODERATE",
    weight: 5,
    phases: ["A"],
    engine: "static",
    title: "L'opérateur du destinataire est hors EEE malgré une adresse européenne",
    references: ["RGPD, articles 44 à 49", "CJUE, 16 juillet 2020, C-311/18 (Schrems II)"],
    omnibusStatus: "Sans objet.",
    messageExec:
      "Le serveur répond depuis l'Europe, mais l'opérateur qui le gère relève d'un droit étranger. La localisation du serveur ne suffit pas à trancher.",
    messageTech: "IP {ip} localisée {country}, ASN {asn} rattaché à {operator} ({operatorCountry}).",
    remediation: {
      effort: "MEDIUM",
      billable: false,
      steps: ["Documenter l'analyse : localisation, opérateur, droit applicable, garanties."],
    },
    falsePositiveNotes:
      "Un opérateur étranger n'implique pas un transfert. Le constat est un signal d'analyse, d'où sa sévérité modérée.",
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-TRANSFER-010",
    family: "TRANSFER",
    severity: "MODERATE",
    weight: 4,
    phases: ["A"],
    engine: "static",
    title: "Diffusion par un réseau mondial sans engagement de localisation",
    references: ["RGPD, articles 44 et 46"],
    omnibusStatus: "Sans objet.",
    messageExec:
      "Vos ressources passent par un réseau réparti sur toute la planète. Sans engagement contractuel de localisation, vous ne savez pas où elles transitent.",
    messageTech: "Réseau anycast {provider} détecté sur {n} ressources, aucune option régionale observée.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 690],
      steps: ["Activer l'option de localisation européenne si le fournisseur en propose une."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-TRANSFER-011",
    family: "TRANSFER",
    severity: "MAJOR",
    weight: 15,
    phases: ["A", "C"],
    engine: "headless",
    title: "Des données potentiellement sensibles peuvent quitter l'Union",
    references: ["RGPD, articles 9 et 44 à 49"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Sur des pages qui traitent d'informations sensibles, des destinataires hors Union sont contactés. Le régime applicable est alors nettement plus strict.",
    messageTech: "Page {url} classée sensible, destinataires hors EEE : {vendors}.",
    remediation: {
      effort: "HIGH",
      billable: true,
      priceHintEur: [890, 1900],
      steps: [
        "Retirer les tiers hors Union des parcours sensibles.",
        "Conduire une analyse d'impact des transferts si un traitement est maintenu.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-TRANSFER-012",
    family: "TRANSFER",
    severity: "INFO",
    weight: 0,
    phases: ["A"],
    engine: "static",
    title: "Un sous-traitant ultérieur non déclaré apparaît dans la chaîne",
    references: ["RGPD, article 28(2) et (4)"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Un prestataire de votre prestataire apparaît dans la chaîne. Il devrait figurer dans votre documentation de sous-traitance.",
    messageTech: "Chaîne observée : {chain}.",
    remediation: {
      effort: "LOW",
      billable: false,
      steps: ["Compléter la liste des sous-traitants ultérieurs dans le contrat et le registre."],
    },
    lastReviewed: REVIEWED,
  },
];

/* ---------------------------------------------------------------- VENDOR */

export const VENDOR_EXTRA_RULES: readonly Rule[] = [
  {
    id: "KZC-VENDOR-002",
    family: "VENDOR",
    severity: "MAJOR",
    weight: 12,
    phases: ["A", "C"],
    engine: "headless",
    title: "Écart entre les partenaires annoncés par le bandeau et ceux réellement contactés",
    references: ["RGPD, articles 5(1)(a) et 13(1)(e)", LD_2020_091],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Votre bandeau présente une liste de partenaires, mais votre site en contacte d'autres. Le choix proposé ne correspond pas à ce qui se passe.",
    messageTech: "Déclarés : {declared}. Contactés hors liste : {extra}.",
    remediation: {
      effort: "HIGH",
      billable: true,
      priceHintEur: [890, 1900],
      steps: [
        "Rapprocher la configuration de la CMP du résultat du scan.",
        "Retirer les partenaires non déclarés ou les ajouter à la liste présentée.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-VENDOR-003",
    family: "VENDOR",
    severity: "MAJOR",
    weight: 10,
    phases: ["A", "C"],
    engine: "headless",
    title: "Une chaîne de redirection publicitaire fait intervenir des tiers non déclarés",
    references: ["RGPD, articles 13(1)(e) et 28", ART82],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Un appel publicitaire en déclenche un autre, qui en déclenche un autre. Au bout de la chaîne, des sociétés que vous n'avez jamais choisies reçoivent les données de vos visiteurs.",
    messageTech: "Chaîne de {n} redirections depuis {origin} : {chain}.",
    remediation: {
      effort: "HIGH",
      billable: true,
      priceHintEur: [890, 1900],
      steps: [
        "Exiger de la régie la liste complète des partenaires activés.",
        "Déclarer la chaîne ou la restreindre contractuellement.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-VENDOR-005",
    family: "VENDOR",
    severity: "MAJOR",
    weight: 10,
    phases: ["A", "C"],
    engine: "headless",
    title: "Des plateformes publicitaires échangent leurs identifiants entre elles",
    references: [ART82, "RGPD, article 5(1)(b) — limitation des finalités"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Deux plateformes se transmettent mutuellement l'identifiant de votre visiteur pour reconnaître la même personne d'un site à l'autre. C'est le cœur du suivi inter-sites.",
    messageTech: "Appariement observé : {a} ⇄ {b}, identifiant transmis en paramètre {param}.",
    remediation: {
      effort: "HIGH",
      billable: true,
      priceHintEur: [890, 1900],
      steps: [
        "Désactiver l'appariement d'identifiants dans les consoles publicitaires.",
        "Conditionner strictement ces échanges au consentement.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-VENDOR-006",
    family: "VENDOR",
    severity: "MODERATE",
    weight: 3,
    phases: ["A", "C"],
    engine: "static",
    title: "Un destinataire est inconnu de notre base",
    references: ["RGPD, article 13(1)(e)"],
    omnibusStatus: "Sans objet.",
    messageExec:
      "Un destinataire a été observé sans que nous puissions dire qui l'exploite ni sous quelle juridiction. Nous préférons le signaler plutôt que de deviner.",
    messageTech: "Domaine {domain} absent de la base des destinataires. Enrichissement manuel requis.",
    remediation: {
      effort: "LOW",
      billable: false,
      steps: [
        "Identifier l'éditeur du domaine et sa juridiction.",
        "Signaler le domaine pour enrichissement de la base.",
      ],
    },
    falsePositiveNotes:
      "Ce constat est un aveu d'incertitude assumé (§5.4), pas un manquement de l'éditeur. Son poids est faible et il ne plafonne jamais le score.",
    lastReviewed: REVIEWED,
  },
];
