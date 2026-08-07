import type { Rule } from "../types";

const REVIEWED = "2026-07-15";

/** Famille STORAGE — stockage alternatif au cookie. */
export const STORAGE_RULES: readonly Rule[] = [
  {
    id: "KZC-STORAGE-001",
    family: "STORAGE",
    severity: "CRITICAL",
    weight: 20,
    phases: ["A"],
    engine: "headless",
    title: "Identifiant persistant écrit en localStorage avant consentement",
    references: ["Article 82, loi n° 78-17 du 6 janvier 1978 modifiée"],
    omnibusStatus:
      "Maintenu — le projet d'article 88a vise tout stockage dans l'équipement terminal, quelle que soit la technique.",
    messageExec:
      "Un identifiant unique est écrit dans le navigateur de vos visiteurs sans passer par un cookie. La règle est pourtant la même.",
    messageTech: "Clé localStorage {key} contenant une valeur à forte entropie, écrite en phase A.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["Conditionner l'écriture au consentement, au même titre qu'un cookie."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-STORAGE-002",
    family: "STORAGE",
    severity: "MAJOR",
    weight: 12,
    phases: ["A"],
    engine: "headless",
    title: "Base IndexedDB créée par un tiers avant consentement",
    references: ["Article 82, loi n° 78-17 du 6 janvier 1978 modifiée"],
    omnibusStatus: "Maintenu.",
    messageExec: "Un tiers crée une base de données locale chez vos visiteurs dès l'arrivée.",
    messageTech: "Base IndexedDB {name} créée par {origin} en phase A.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["Différer l'initialisation du SDK tiers jusqu'au consentement."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-STORAGE-003",
    family: "STORAGE",
    severity: "MAJOR",
    weight: 12,
    phases: ["A"],
    engine: "headless",
    title: "Service Worker enregistré avant consentement",
    references: ["Article 82, loi n° 78-17 du 6 janvier 1978 modifiée"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Un composant persistant s'installe dans le navigateur de vos visiteurs avant tout accord.",
    messageTech: "Service Worker enregistré sur {scope} en phase A.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["N'enregistrer que les Service Workers strictement nécessaires au service demandé."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-STORAGE-006",
    family: "STORAGE",
    severity: "MAJOR",
    weight: 10,
    phases: ["A", "C"],
    engine: "headless",
    title: "Cookie first-party posé par un script tiers avec une durée supérieure à 13 mois",
    references: [
      "CNIL, lignes directrices, délibération n° 2020-091",
      "CNIL, recommandation, délibération n° 2020-092 (13 mois)",
    ],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Un cookie posé sur votre propre domaine, mais par un outil tiers, dépasse la durée de vie recommandée.",
    messageTech: "Cookie {name} sur {domain} avec expiration à {days} jours.",
    remediation: {
      effort: "LOW",
      billable: false,
      steps: ["Ramener la durée de vie à 13 mois au maximum."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-STORAGE-007",
    family: "STORAGE",
    severity: "CRITICAL",
    weight: 22,
    phases: ["A"],
    engine: "static",
    title: "Masquage par CNAME : un sous-domaine à vous pointe vers un traceur tiers",
    references: [
      "Article 82, loi n° 78-17 du 6 janvier 1978 modifiée",
      "CNIL, lignes directrices, délibération n° 2020-091",
    ],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Un sous-domaine qui semble vous appartenir renvoie en réalité vers une société de suivi. Ce montage contourne les protections des navigateurs et prolonge la durée de vie des identifiants.",
    messageTech: "Chaîne CNAME : {subdomain} → {target} (entité {entity}).",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: [
        "Documenter ce montage dans la politique cookies et le registre.",
        "Le soumettre au consentement au même titre qu'un traceur tiers classique.",
      ],
    },
    falsePositiveNotes:
      "Un CNAME vers un CDN ou un hébergeur n'est pas un masquage. Seules les cibles rattachées à une entité de suivi déclenchent ce constat.",
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-STORAGE-009",
    family: "STORAGE",
    severity: "MODERATE",
    weight: 5,
    phases: ["A", "C"],
    engine: "headless",
    title: "Cookie porteur d'identifiant sans attribut SameSite ou Secure",
    references: ["RGPD, article 32"],
    omnibusStatus: "Hors périmètre du projet COM(2025) 837.",
    messageExec:
      "Un cookie contenant un identifiant circule sans les protections minimales attendues.",
    messageTech: "Cookie {name} — SameSite : {samesite}, Secure : {secure}.",
    remediation: {
      effort: "LOW",
      billable: false,
      steps: ["Positionner Secure et SameSite=Lax ou Strict."],
    },
    lastReviewed: REVIEWED,
  },
];

/** Famille FP — techniques d'empreinte du terminal. */
export const FP_RULES: readonly Rule[] = [
  {
    id: "KZC-FP-001",
    family: "FP",
    severity: "CRITICAL",
    weight: 18,
    phases: ["A"],
    engine: "headless",
    title: "Empreinte par canvas avant consentement",
    references: [
      "Article 82, loi n° 78-17 du 6 janvier 1978 modifiée",
      "CNIL, lignes directrices, délibération n° 2020-091 (techniques assimilées)",
    ],
    omnibusStatus: "Maintenu — les techniques d'empreinte relèvent du projet d'article 88a.",
    messageExec:
      "Un script calcule une empreinte du terminal de vos visiteurs pour les reconnaître, sans cookie et sans leur accord.",
    messageTech: "Appel à canvas.toDataURL/getImageData après tracé, observé en phase A par {script}.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["Identifier le script responsable et le soumettre au consentement."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-FP-002",
    family: "FP",
    severity: "CRITICAL",
    weight: 16,
    phases: ["A"],
    engine: "headless",
    title: "Empreinte par WebGL avant consentement",
    references: ["Article 82, loi n° 78-17 du 6 janvier 1978 modifiée"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Le modèle exact de la carte graphique de vos visiteurs est relevé pour les identifier.",
    messageTech: "Lecture de UNMASKED_RENDERER_WEBGL en phase A.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["Soumettre le script au consentement."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-FP-006",
    family: "FP",
    severity: "MAJOR",
    weight: 12,
    phases: ["A"],
    engine: "headless",
    title: "RTCPeerConnection utilisée pour révéler l'adresse IP locale",
    references: ["Article 82, loi n° 78-17 du 6 janvier 1978 modifiée"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Un script tente de découvrir l'adresse réseau interne de vos visiteurs, une information qu'aucun site n'a besoin de connaître.",
    messageTech: "RTCPeerConnection instanciée sans usage de communication temps réel.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["Supprimer le script ou le soumettre au consentement."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-FP-007",
    family: "FP",
    severity: "MODERATE",
    weight: 8,
    phases: ["A"],
    engine: "headless",
    title: "Agrégation de six signaux d'entropie ou plus par un même script",
    references: ["Article 82, loi n° 78-17 du 6 janvier 1978 modifiée"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Un script combine assez de caractéristiques du terminal pour reconnaître un visiteur de façon quasi unique.",
    messageTech: "{n} signaux d'entropie distincts collectés par {script} en phase A.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["Identifier la finalité réelle et soumettre la collecte au consentement."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-FP-008",
    family: "FP",
    severity: "CRITICAL",
    weight: 22,
    phases: ["B"],
    engine: "headless",
    title: "Empreinte maintenue après refus",
    references: ["Article 82, loi n° 78-17 modifiée", "RGPD, article 7(3)"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Le refus de votre visiteur n'arrête pas la prise d'empreinte : il continue d'être identifiable.",
    messageTech: "Signaux d'empreinte toujours collectés en phase B.",
    remediation: {
      effort: "HIGH",
      billable: true,
      priceHintEur: [890, 1900],
      steps: ["Couper effectivement toute collecte d'empreinte en cas de refus."],
    },
    lastReviewed: REVIEWED,
  },
];

/** Famille EXEMPT — mesure d'audience exemptée de consentement. */
export const EXEMPT_RULES: readonly Rule[] = [
  {
    id: "KZC-EXEMPT-001",
    family: "EXEMPT",
    severity: "INFO",
    weight: 0,
    phases: ["A"],
    engine: "static",
    title: "Configuration compatible avec l'exemption de mesure d'audience",
    references: ["CNIL, recommandation relative à la mesure d'audience exemptée de consentement"],
    omnibusStatus:
      "Périmètre susceptible d'être élargi par le projet d'article 88a §3 c). Non applicable à ce jour.",
    messageExec:
      "Votre outil de statistiques semble configuré de façon compatible avec l'exemption prévue par la CNIL. C'est un bon point.",
    messageTech: "Outil {vendor} détecté, éligible à l'exemption sous conditions cumulatives.",
    remediation: {
      effort: "LOW",
      billable: false,
      steps: [
        "Vérifier les conditions cumulatives : finalité strictement statistique, absence de recoupement, pas de transmission à un tiers, durées limitées.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-EXEMPT-002",
    family: "EXEMPT",
    severity: "MAJOR",
    weight: 12,
    phases: ["A"],
    engine: "static",
    title: "Outil revendiqué exempté mais transmettant les données à un tiers",
    references: ["CNIL, recommandation mesure d'audience — condition d'absence de transmission"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Votre outil de statistiques transmet les données à une société tierce, ce qui fait tomber l'exemption.",
    messageTech: "Outil {vendor} en mode hébergé chez l'éditeur ({entity}, {jurisdiction}).",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: [
        "Basculer vers une instance auto-hébergée.",
        "Ou soumettre l'outil au consentement.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-EXEMPT-003",
    family: "EXEMPT",
    severity: "MAJOR",
    weight: 8,
    phases: ["A", "C"],
    engine: "headless",
    title: "Durée de vie du cookie de mesure supérieure à 13 mois",
    references: ["CNIL, recommandation mesure d'audience (13 mois)"],
    omnibusStatus: "Maintenu.",
    messageExec: "Le cookie de mesure dépasse la durée de vie admise pour rester exempté.",
    messageTech: "Cookie {name} — expiration à {days} jours.",
    remediation: {
      effort: "LOW",
      billable: false,
      steps: ["Ramener la durée à 13 mois au maximum."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-EXEMPT-005",
    family: "EXEMPT",
    severity: "MODERATE",
    weight: 6,
    phases: ["A"],
    engine: "static",
    title: "Adresse IP non tronquée dans l'outil de mesure",
    references: ["CNIL, recommandation mesure d'audience — condition de minimisation"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "L'adresse IP complète de vos visiteurs est transmise à l'outil de mesure, alors que l'exemption suppose sa troncature.",
    messageTech: "Aucun paramètre d'anonymisation d'IP détecté pour {vendor}.",
    remediation: {
      effort: "LOW",
      billable: false,
      steps: ["Activer la troncature de l'adresse IP dans la configuration de l'outil."],
    },
    lastReviewed: REVIEWED,
  },
];

/** Famille CONSENT — mécanique et preuve du consentement. */
export const CONSENT_RULES: readonly Rule[] = [
  {
    id: "KZC-CONSENT-001",
    family: "CONSENT",
    severity: "MAJOR",
    weight: 12,
    phases: ["C"],
    engine: "headless",
    title: "Aucune preuve de consentement conservée côté serveur",
    references: ["RGPD, article 7(1)"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Vous ne conservez aucune trace des consentements recueillis. En cas de contrôle, vous ne pourrez pas démontrer qu'ils ont été obtenus.",
    messageTech: "Aucune requête d'enregistrement de consentement observée après acceptation.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["Enregistrer chaque choix : horodatage, version du bandeau, finalités, portée."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-CONSENT-004",
    family: "CONSENT",
    severity: "MAJOR",
    weight: 8,
    phases: ["C"],
    engine: "headless",
    title: "Durée de validité du consentement supérieure à 13 mois sans re-sollicitation",
    references: ["CNIL, recommandation, délibération n° 2020-092"],
    omnibusStatus: "Maintenu.",
    messageExec: "Le consentement obtenu n'est jamais renouvelé.",
    messageTech: "Cookie de choix {name} avec expiration à {days} jours.",
    remediation: {
      effort: "LOW",
      billable: false,
      steps: ["Renouveler la sollicitation au plus tard tous les 13 mois."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-CONSENT-006",
    family: "CONSENT",
    severity: "MAJOR",
    weight: 10,
    phases: ["A"],
    engine: "headless",
    title: "Signal Global Privacy Control ignoré",
    references: ["RGPD, article 21", "Spécification Global Privacy Control"],
    omnibusStatus:
      "Préfigure l'article 88b du projet COM(2025) 837, qui rendrait les signaux navigateur juridiquement opposables (délai annoncé : 24 mois après entrée en vigueur).",
    messageExec:
      "Un visiteur ayant activé le signal d'opposition de son navigateur est traité comme s'il n'avait rien demandé.",
    messageTech: "navigator.globalPrivacyControl = true ; aucun changement de comportement observé.",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: ["Interpréter le signal GPC comme un refus par défaut."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-CONSENT-007",
    family: "CONSENT",
    severity: "INFO",
    weight: 0,
    phases: ["A"],
    engine: "headless",
    title: "Absence de prise en charge des signaux navigateur",
    references: ["Anticipation : projet d'article 88b, COM(2025) 837"],
    omnibusStatus:
      "Non applicable à ce jour. Deviendrait obligatoire environ 24 mois après l'entrée en vigueur du texte, s'il est adopté.",
    messageExec:
      "Point de veille : les navigateurs pourraient bientôt transmettre le choix de l'utilisateur automatiquement. Rien à corriger aujourd'hui.",
    messageTech: "Aucun mécanisme de lecture de signal navigateur détecté.",
    remediation: {
      effort: "LOW",
      billable: false,
      steps: ["Aucune action requise à ce stade. Suivre l'évolution du texte."],
    },
    lastReviewed: REVIEWED,
  },
];

/** Famille VENDOR — destinataires et chaîne de sous-traitance. */
export const VENDOR_RULES: readonly Rule[] = [
  {
    id: "KZC-VENDOR-001",
    family: "VENDOR",
    severity: "MAJOR",
    weight: 8,
    phases: ["A", "C"],
    engine: "static",
    title: "Destinataire tiers non listé dans la politique cookies",
    references: ["RGPD, article 13(1)(e)"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Des entreprises reçoivent des données de vos visiteurs sans figurer dans votre documentation publique.",
    messageTech: "Destinataires observés et non déclarés : {vendors}.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 490],
      steps: ["Mettre la politique à jour à partir de l'inventaire réel du scan."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-VENDOR-004",
    family: "VENDOR",
    severity: "CRITICAL",
    weight: 20,
    phases: ["A"],
    engine: "static",
    title: "Enchère publicitaire en temps réel déclenchée avant consentement",
    references: [
      "Article 82, loi n° 78-17 modifiée",
      "RGPD, articles 6 et 7",
    ],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Dès l'ouverture de votre page, et avant tout accord, les données de votre visiteur sont diffusées à un grand nombre d'acteurs publicitaires pour une mise aux enchères.",
    messageTech: "Requête vers une plateforme d'enchères ({domain}) observée en phase A.",
    remediation: {
      effort: "HIGH",
      billable: true,
      priceHintEur: [890, 2900],
      steps: [
        "Bloquer intégralement la chaîne publicitaire avant consentement.",
        "Vérifier la configuration du wrapper d'enchères.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-VENDOR-007",
    family: "VENDOR",
    severity: "MAJOR",
    weight: 10,
    phases: ["A", "C"],
    engine: "static",
    title: "Nombre de destinataires distincts élevé sans information proportionnée",
    references: [
      "RGPD, articles 5(1)(c) et 13",
      "CNIL, lignes directrices, délibération n° 2020-091, pt. 29",
    ],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Un nombre important d'entreprises distinctes reçoit des données depuis vos pages. Plus la liste est longue, plus l'information due à vos visiteurs doit être précise.",
    messageTech: "{n} entités distinctes contactées (seuil d'alerte : 30).",
    remediation: {
      effort: "MEDIUM",
      billable: true,
      priceHintEur: [390, 890],
      steps: [
        "Réduire le nombre de partenaires au strict nécessaire.",
        "Publier la liste complète et la tenir à jour.",
      ],
    },
    lastReviewed: REVIEWED,
  },
];

/** Famille CMV2 — Google Consent Mode v2. */
export const CMV2_RULES: readonly Rule[] = [
  {
    id: "KZC-CMV2-001",
    family: "CMV2",
    severity: "CRITICAL",
    weight: 18,
    phases: ["A"],
    engine: "static",
    title: "Aucun état de consentement par défaut avant le chargement de gtag",
    references: ["RGPD, article 7", "Article 82, loi n° 78-17 modifiée"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Vos outils Google démarrent sans savoir si votre visiteur a accepté. Ils partent donc du principe que oui.",
    messageTech:
      "Aucun appel gtag('consent', 'default', …) détecté avant le chargement du script Google.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 490],
      steps: [
        "Déclarer un état par défaut « denied » pour ad_storage, analytics_storage, ad_user_data et ad_personalization avant tout appel à gtag.",
      ],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-CMV2-002",
    family: "CMV2",
    severity: "CRITICAL",
    weight: 18,
    phases: ["A"],
    engine: "static",
    title: "ad_storage ou analytics_storage en « granted » par défaut",
    references: ["RGPD, article 4(11)", "Article 82, loi n° 78-17 modifiée"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "Votre configuration déclare par avance que le visiteur accepte le suivi publicitaire. C'est l'inverse de ce qu'exige un consentement.",
    messageTech: "gtag('consent','default') avec {key}: 'granted'.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 390],
      steps: ["Passer tous les signaux à « denied » par défaut."],
    },
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-CMV2-003",
    family: "CMV2",
    severity: "MAJOR",
    weight: 10,
    phases: ["A"],
    engine: "static",
    title: "ad_user_data et ad_personalization non gérés",
    references: ["RGPD, article 7 ; exigences Google Consent Mode v2 (depuis mars 2024)"],
    omnibusStatus: "Cadre contractuel privé, non visé par COM(2025) 837.",
    messageExec:
      "Deux signaux de consentement désormais obligatoires côté Google ne sont pas transmis par votre site.",
    messageTech: "Clés ad_user_data / ad_personalization absentes de l'appel consent default.",
    remediation: {
      effort: "LOW",
      billable: false,
      steps: ["Ajouter les deux clés à l'état par défaut et aux mises à jour."],
    },
    lastReviewed: REVIEWED,
  },
];

/** Famille SPECIAL — circonstances aggravantes. */
export const SPECIAL_RULES: readonly Rule[] = [
  {
    id: "KZC-SPECIAL-002",
    family: "SPECIAL",
    severity: "CRITICAL",
    weight: 25,
    phases: ["A"],
    engine: "static",
    title: "Site à thématique de santé avec traceurs publicitaires avant consentement",
    references: [
      "RGPD, article 9 (catégories particulières de données)",
      "Article 82, loi n° 78-17 modifiée",
    ],
    omnibusStatus: "Maintenu — aucune exemption envisagée pour les données sensibles.",
    messageExec:
      "Votre site traite de sujets de santé et charge des traceurs publicitaires. La seule consultation d'une page peut révéler une information sur l'état de santé d'une personne : le régulateur regarde ces situations avec une sévérité particulière.",
    messageTech:
      "Indices lexicaux de thématique santé détectés, conjugués à {n} traceurs publicitaires en phase A.",
    remediation: {
      effort: "HIGH",
      billable: true,
      priceHintEur: [890, 2900],
      steps: [
        "Supprimer tout traceur publicitaire des parcours liés à la santé.",
        "Vérifier qu'aucune URL sensible ne fuite en référent vers un tiers.",
        "Documenter une analyse d'impact (AIPD).",
      ],
    },
    falsePositiveNotes:
      "La détection thématique est lexicale et donc imparfaite : un site de presse généraliste évoquant la santé n'est pas un site de santé. Constat à confirmer manuellement.",
    lastReviewed: REVIEWED,
  },
  {
    id: "KZC-SPECIAL-005",
    family: "SPECIAL",
    severity: "MAJOR",
    weight: 12,
    phases: ["A"],
    engine: "static",
    title: "Données d'URL potentiellement sensibles transmissibles à un tiers",
    references: ["RGPD, articles 5(1)(c) et 9", "RGPD, article 32"],
    omnibusStatus: "Maintenu.",
    messageExec:
      "L'adresse des pages consultées est transmise aux services tiers que vous chargez. Si cette adresse est parlante, elle révèle à elle seule ce que consultait votre visiteur.",
    messageTech:
      "Referrer-Policy permissive combinée à {n} destinataires tiers ; segments d'URL potentiellement signifiants.",
    remediation: {
      effort: "LOW",
      billable: true,
      priceHintEur: [190, 390],
      steps: [
        "Adopter une Referrer-Policy stricte.",
        "Éviter les identifiants ou libellés signifiants dans les URL.",
      ],
    },
    lastReviewed: REVIEWED,
  },
];
