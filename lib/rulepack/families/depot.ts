import type { Rule } from "../types";

const REVIEWED = "2026-07-15";

/**
 * Famille DEPOT — dépôt ou lecture avant recueil du consentement.
 * Fondement principal : article 82 de la loi n° 78-17 du 6 janvier 1978 modifiée.
 */
export const DEPOT_RULES: readonly Rule[] = [
  {
    id: "KZC-DEPOT-001",
    family: "DEPOT",
    severity: "CRITICAL",
    weight: 25,
    phases: ["A"],
    engine: "headless",
    title: "Traceur publicitaire déposé avant recueil du consentement",
    references: [
      "Article 82, loi n° 78-17 du 6 janvier 1978 modifiée",
      "CNIL, lignes directrices, délibération n° 2020-091, pt. 22",
      "RGPD, articles 4(11) et 7",
    ],
    omnibusStatus:
      "Maintenu — l'article 88a §1 du projet COM(2025) 837 conserve l'exigence de consentement préalable pour le suivi inter-sites. Texte non adopté à ce jour.",
    messageExec:
      "Un traceur publicitaire s'est déposé sur le terminal de vos visiteurs avant qu'ils aient pu donner ou refuser leur accord.",
    messageTech:
      "Cookie {name} sur {domain} observé en phase A à T+{ms} ms, initiateur : {initiator}.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: [
        "Conditionner le chargement des balises publicitaires à un consentement explicite.",
        "Configurer Google Consent Mode v2 avec un état par défaut « denied » avant tout appel à gtag.",
        "Vérifier que le tag manager ne déclenche aucune balise marketing sans déclencheur de consentement.",
      ],
    },
    falsePositiveNotes:
      "Vérifier que le cookie n'est pas déposé par une extension de navigateur ou un proxy de test.",
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DEPOT-002",
    family: "DEPOT",
    severity: "CRITICAL",
    weight: 22,
    phases: ["A"],
    engine: "headless",
    title: "Cookie de mesure d'audience non exempté déposé avant consentement",
    references: [
      "Article 82, loi n° 78-17 du 6 janvier 1978 modifiée",
      "CNIL, recommandation, délibération n° 2020-092",
    ],
    omnibusStatus:
      "Susceptible d'évoluer — l'article 88a §3 c) du projet COM(2025) 837 envisage une exemption élargie pour la mesure d'audience first-party. Non applicable à ce jour ; avis conjoint CEPD/EDPS 2/2026 critique.",
    messageExec:
      "Un outil de statistiques dépose un traceur avant tout accord, dans une configuration qui ne remplit pas les conditions de l'exemption prévue par la CNIL.",
    messageTech:
      "Cookie de mesure {name} observé en phase A ; conditions d'exemption non réunies (recoupement, durée ou transmission à un tiers).",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [290, 690],
      steps: [
        "Soit configurer l'outil pour remplir les conditions cumulatives de l'exemption CNIL.",
        "Soit conditionner son chargement au consentement.",
        "Envisager une solution de mesure exemptable (Matomo auto-hébergé, Plausible, Piano Analytics).",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DEPOT-003",
    family: "DEPOT",
    severity: "CRITICAL",
    weight: 22,
    phases: ["A"],
    engine: "headless",
    title: "Cookie de réseau social déposé avant consentement",
    references: ["Article 82, loi n° 78-17 du 6 janvier 1978 modifiée"],
    omnibusStatus: "Maintenu sous l'article 88a §1 du projet COM(2025) 837.",
    messageExec:
      "Un réseau social dépose un traceur sur le terminal de vos visiteurs dès l'arrivée sur la page, y compris pour ceux qui n'ont pas de compte chez lui.",
    messageTech: "Cookie de plateforme sociale {name} observé en phase A.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 490],
      steps: [
        "Remplacer les widgets sociaux par des liens statiques.",
        "Charger les SDK sociaux uniquement après consentement.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DEPOT-004",
    family: "DEPOT",
    severity: "MAJOR",
    weight: 14,
    phases: ["A"],
    engine: "static",
    title: "Requête sortante vers un domaine publicitaire avant consentement",
    references: [
      "Article 82, loi n° 78-17 du 6 janvier 1978 modifiée (lecture d'informations : adresse IP, en-têtes)",
    ],
    omnibusStatus:
      "Maintenu — la lecture d'informations stockées dans l'équipement terminal reste couverte par le projet d'article 88a.",
    messageExec:
      "Votre page contacte une régie publicitaire dès son chargement. Même sans cookie, cette régie reçoit l'adresse IP de votre visiteur et sait qu'il consulte votre site.",
    messageTech:
      "Requête sortante vers {domain} détectée dans le document initial, avant toute interaction de l'utilisateur.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [290, 690],
      steps: [
        "Différer le chargement du script jusqu'au consentement.",
        "Utiliser un chargement conditionnel côté serveur plutôt qu'une balise inline.",
      ],
    },
    falsePositiveNotes:
      "Une balise présente dans le HTML peut être neutralisée à l'exécution par un script de blocage préalable. Le moteur headless lève ce doute ; l'analyse statique le signale comme indice fort.",
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DEPOT-005",
    family: "DEPOT",
    severity: "CRITICAL",
    weight: 20,
    phases: ["A"],
    engine: "static",
    title: "Script tiers de tracking chargé avant consentement",
    references: [
      "Article 82, loi n° 78-17 du 6 janvier 1978 modifiée",
      "CNIL, lignes directrices, délibération n° 2020-091, pt. 22",
    ],
    omnibusStatus: "Maintenu sous l'article 88a §1 du projet COM(2025) 837.",
    messageExec:
      "Un script de suivi appartenant à une entreprise tierce est chargé dès l'ouverture de votre page, avant toute action du visiteur.",
    messageTech:
      "Balise <script src=\"{url}\"> présente dans le document servi, sans attribut de blocage ni type différé par un CMP.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: [
        "Passer le script en type=\"text/plain\" avec un attribut de catégorie géré par le CMP.",
        "Ou l'injecter dynamiquement après recueil du consentement.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DEPOT-006",
    family: "DEPOT",
    severity: "MAJOR",
    weight: 15,
    phases: ["A"],
    engine: "static",
    title: "Pixel de conversion déclenché avant consentement",
    references: ["Article 82, loi n° 78-17 du 6 janvier 1978 modifiée"],
    omnibusStatus: "Maintenu sous l'article 88a §1 du projet COM(2025) 837.",
    messageExec:
      "Un pixel de mesure de conversion publicitaire se déclenche dès le chargement de la page.",
    messageTech: "Pixel {vendor} détecté dans le document initial ({url}).",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 490],
      steps: ["Conditionner le déclenchement du pixel au consentement publicitaire."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DEPOT-007",
    family: "DEPOT",
    severity: "CRITICAL",
    weight: 24,
    phases: ["A"],
    engine: "headless",
    title: "Traceur déposé au défilement, sans clic (« poursuite de navigation »)",
    references: ["CNIL, lignes directrices, délibération n° 2020-091, pt. 25"],
    omnibusStatus:
      "Maintenu — le projet d'article 88a §2 impose une action positive univoque de l'utilisateur.",
    messageExec:
      "Le simple fait de faire défiler la page déclenche le dépôt de traceurs, comme si le visiteur avait accepté. Le défilement n'est pas un consentement.",
    messageTech:
      "Après simulation d'un défilement passif, {n} traceurs supplémentaires observés sans clic sur le bandeau.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: [
        "Supprimer toute logique assimilant le défilement, le clic sur la page ou l'inactivité à un consentement.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DEPOT-008",
    family: "DEPOT",
    severity: "MAJOR",
    weight: 14,
    phases: ["A"],
    engine: "static",
    title: "Iframe tierce déposant ses propres traceurs avant consentement",
    references: ["Article 82, loi n° 78-17 du 6 janvier 1978 modifiée"],
    omnibusStatus: "Maintenu sous l'article 88a du projet COM(2025) 837.",
    messageExec:
      "Une vidéo ou une carte intégrée à votre page dépose ses propres traceurs, indépendamment de votre bandeau.",
    messageTech: "Iframe vers {domain} présente dans le document initial.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 390],
      steps: [
        "Remplacer l'iframe par une facade cliquable (image + bouton) qui ne charge le service qu'après action.",
        "Pour YouTube, utiliser youtube-nocookie.com — utile mais insuffisant seul.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DEPOT-009",
    family: "DEPOT",
    severity: "MAJOR",
    weight: 12,
    phases: ["A"],
    engine: "static",
    title: "Police ou CDN tiers chargé avant consentement (transmission d'adresse IP)",
    references: [
      "Article 82, loi n° 78-17 du 6 janvier 1978 modifiée",
      "LG München I, 3 O 17493/20, 20 janvier 2022 (Google Fonts)",
    ],
    omnibusStatus:
      "Non directement visé par le projet COM(2025) 837 ; l'analyse relève du RGPD (transfert et base légale).",
    messageExec:
      "Vos pages chargent des polices ou des fichiers hébergés par un tiers. Ce tiers reçoit l'adresse IP de chacun de vos visiteurs, sans qu'ils l'aient accepté.",
    messageTech: "Ressource externe chargée depuis {domain} dans le document initial.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 390],
      steps: [
        "Auto-héberger les polices (télécharger les fichiers woff2 et les servir depuis votre domaine).",
        "Auto-héberger les bibliothèques JavaScript plutôt que de les charger depuis un CDN public.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DEPOT-010",
    family: "DEPOT",
    severity: "MAJOR",
    weight: 12,
    phases: ["A"],
    engine: "static",
    title: "Service anti-robots chargé hors périmètre strictement nécessaire",
    references: ["Article 82, loi n° 78-17 du 6 janvier 1978 modifiée"],
    omnibusStatus: "Analyse inchangée sous le projet COM(2025) 837.",
    messageExec:
      "Un service anti-robots tiers est chargé sur une page qui ne comporte aucun formulaire. Sur une telle page, la protection n'est pas nécessaire au service demandé par le visiteur.",
    messageTech:
      "Script anti-robots ({vendor}) détecté sur une page sans formulaire de soumission.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 390],
      steps: [
        "Ne charger le service que sur les pages comportant réellement un formulaire.",
        "Envisager une alternative respectueuse (hCaptcha auto-hébergé, honeypot, Friendly Captcha).",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DEPOT-011",
    family: "DEPOT",
    severity: "CRITICAL",
    weight: 25,
    phases: ["A"],
    engine: "static",
    title: "Enregistrement de session actif avant consentement",
    references: [
      "Article 82, loi n° 78-17 du 6 janvier 1978 modifiée",
      "RGPD, article 9 (risque de captation de données sensibles)",
    ],
    omnibusStatus: "Maintenu — aucune exemption envisagée pour l'enregistrement de session.",
    messageExec:
      "Un outil enregistre les mouvements de souris, les clics et parfois la saisie de vos visiteurs, dès l'ouverture de la page et sans leur accord.",
    messageTech: "Script d'enregistrement de session ({vendor}) détecté en phase A.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: [
        "Conditionner strictement l'outil au consentement.",
        "Activer le masquage des champs de formulaire côté outil.",
        "Exclure les pages traitant de données sensibles.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DEPOT-012",
    family: "DEPOT",
    severity: "MAJOR",
    weight: 12,
    phases: ["A"],
    engine: "static",
    title: "Chat ou support tiers chargé avant consentement",
    references: ["Article 82, loi n° 78-17 du 6 janvier 1978 modifiée"],
    omnibusStatus: "Analyse inchangée sous le projet COM(2025) 837.",
    messageExec:
      "Votre outil de chat se charge dès l'arrivée du visiteur et dépose ses propres traceurs, avant tout échange.",
    messageTech: "Widget de messagerie {vendor} chargé en phase A.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 390],
      steps: [
        "Charger le widget au clic sur un bouton « Discuter avec nous » plutôt qu'au chargement de la page.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DEPOT-013",
    family: "DEPOT",
    severity: "MODERATE",
    weight: 5,
    phases: ["A"],
    engine: "static",
    title: "Préconnexion ou pré-résolution DNS vers un domaine publicitaire",
    references: ["Article 82, loi n° 78-17 du 6 janvier 1978 modifiée (signal faible)"],
    omnibusStatus: "Non spécifiquement visé.",
    messageExec:
      "Votre page prépare une connexion vers une régie publicitaire avant même que le visiteur ait fait quoi que ce soit. C'est un signal, pas encore un dépôt.",
    messageTech: "<link rel=\"preconnect|dns-prefetch\" href=\"{domain}\"> détecté.",
    remediation: {
      effort: "LOW",
      billable: false,
      steps: ["Supprimer les balises preconnect/dns-prefetch pointant vers des domaines soumis à consentement."],
    },
    falsePositiveNotes:
      "Une préconnexion n'établit pas nécessairement de transfert de données applicatives. Constat de faible sévérité, à ne pas surinterpréter.",
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-DEPOT-014",
    family: "DEPOT",
    severity: "CRITICAL",
    weight: 20,
    phases: ["A"],
    engine: "static",
    title: "Gestionnaire de balises déclenchant des balises marketing sans condition de consentement",
    references: [
      "Article 82, loi n° 78-17 du 6 janvier 1978 modifiée",
      "RGPD, article 5(2) (responsabilité)",
    ],
    omnibusStatus: "Maintenu sous l'article 88a §1 du projet COM(2025) 837.",
    messageExec:
      "Votre gestionnaire de balises déclenche des outils marketing sans vérifier au préalable si le visiteur a donné son accord.",
    messageTech:
      "Conteneur GTM chargé en phase A avec des balises marketing observées et sans état de consentement par défaut.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: [
        "Déclarer un état de consentement par défaut « denied » avant le chargement du conteneur.",
        "Conditionner chaque balise marketing à un déclencheur de consentement.",
      ],
    },
    lastReviewed: REVIEWED,
  },
];
