/**
 * Pages par secteur d'activité.
 *
 * Chaque secteur a ses traceurs typiques et ses textes propres : un site de
 * santé ne se lit pas comme une boutique en ligne, une collectivité n'a pas
 * les mêmes obligations qu'un titre de presse. Ces fiches signalent ce qui
 * change ; elles ne qualifient aucune situation particulière.
 *
 * Règles de rédaction :
 *  - chaque obligation porte sa référence exacte, vérifiable à la source ;
 *  - aucune promesse de conformité, aucun chiffre de sanction non sourcé ;
 *  - les traceurs et règles cités sont des identifiants de la base et du
 *    référentiel — la page n'affiche que ceux qui existent réellement.
 */

export interface SectorObligation {
  title: string;
  body: string;
  references: readonly string[];
}

export interface Sector {
  slug: string;
  name: string;
  /** Titre de la page (balise <title>). */
  title: string;
  metaDescription: string;
  /** Accroche affichée sous le titre. */
  lead: string;
  /** Enjeux cookies et RGPD propres au secteur. */
  stakes: readonly string[];
  obligations: readonly SectorObligation[];
  /** Slugs de `lib/trackers/db.ts`. */
  trackers: readonly string[];
  /** Identifiants du référentiel. */
  rules: readonly string[];
  faq: readonly { q: string; a: string }[];
}

const ART_82 = "Article 82 de la loi n° 78-17 du 6 janvier 1978 modifiée";
const CNIL_2020 =
  "CNIL, lignes directrices (délibération n° 2020-091) et recommandation (délibération n° 2020-092) du 17 septembre 2020 relatives aux cookies et autres traceurs";

export const SECTORS: readonly Sector[] = [
  {
    slug: "e-commerce",
    name: "E-commerce",
    title: "Cookies et RGPD pour un site e-commerce",
    metaDescription:
      "Pixels publicitaires, reciblage, paiement, conservation des commandes : ce qui change pour une boutique en ligne en matière de cookies et de RGPD, avec les références.",
    lead: "Une boutique en ligne concentre à elle seule la plupart des traceurs du marché : pixels de conversion, reciblage, avis clients, paiement, mesure d'audience, enregistrement de session. C'est aussi là que le premier chargement de page est le plus chargé.",
    stakes: [
      "Les pixels de conversion et de reciblage (réseaux sociaux, régies, comparateurs) sont souvent installés par une extension de la plateforme ou par un gestionnaire de balises, et se déclenchent dès l'ouverture de la page, avant toute réponse au bandeau.",
      "Le tunnel de commande est la zone la plus sensible : un outil d'enregistrement de session ou un script tiers peut y lire des champs de formulaire (adresse, téléphone) avant leur envoi.",
      "Le prestataire de paiement dépose ses propres traceurs. Ceux qui servent uniquement à sécuriser la transaction peuvent relever du strictement nécessaire ; ceux qui servent à autre chose, non. L'analyse se fait finalité par finalité.",
      "Les données de commande se conservent longtemps pour des raisons comptables et de preuve, mais pas indéfiniment pour la prospection : les deux durées sont distinctes et doivent figurer dans la politique de confidentialité.",
    ],
    obligations: [
      {
        title: "Consentement préalable aux traceurs publicitaires",
        body: "Les traceurs de mesure publicitaire, de reciblage et de partage avec les réseaux sociaux ne sont pas strictement nécessaires au service demandé par l'acheteur : leur dépôt suppose un consentement préalable, et le refus doit être aussi simple que l'acceptation.",
        references: [ART_82, CNIL_2020],
      },
      {
        title: "Données de carte de paiement",
        body: "Le cryptogramme visuel ne doit pas être conservé après la transaction. La conservation du numéro de carte pour faciliter les achats suivants suppose le consentement de la personne. Confier le paiement à un prestataire spécialisé limite fortement l'exposition.",
        references: [
          "CNIL, délibération n° 2018-303 du 6 septembre 2018 portant recommandation sur le traitement des données de carte de paiement",
          "Article 32 du RGPD (sécurité du traitement)",
        ],
      },
      {
        title: "Conservation des données de commande",
        body: "Les pièces comptables se conservent dix ans ; un contrat conclu par voie électronique d'un montant égal ou supérieur au seuil réglementaire doit être conservé et accessible au client. Les données utilisées pour la prospection, elles, ne se conservent pas au-delà de trois ans à compter de la fin de la relation commerciale ou du dernier contact émanant de la personne, selon le référentiel de la CNIL.",
        references: [
          "Article L.123-22 du Code de commerce",
          "Articles L.213-1 et D.213-1 et suivants du Code de la consommation",
          "CNIL, délibération n° 2021-131 du 23 septembre 2021 (référentiel « gestion des activités commerciales »)",
          "Article 5.1.e du RGPD (limitation de la conservation)",
        ],
      },
      {
        title: "Prospection par courrier électronique",
        body: "La prospection par e-mail suppose le consentement préalable du destinataire, sauf s'il est déjà client et que les produits proposés sont analogues — à condition qu'il ait pu s'y opposer simplement lors de la collecte et dans chaque message.",
        references: ["Article L.34-5 du Code des postes et des communications électroniques"],
      },
    ],
    trackers: [
      "meta-pixel",
      "google-ads",
      "google-analytics-4",
      "google-tag-manager",
      "tiktok-pixel",
      "criteo",
      "pinterest-tag",
      "klaviyo",
      "trustpilot",
      "hotjar",
      "stripe",
      "paypal",
      "shopify",
    ],
    rules: [
      "KZC-DEPOT-001",
      "KZC-DEPOT-006",
      "KZC-DEPOT-014",
      "KZC-REFUS-001",
      "KZC-CMV2-001",
      "KZC-CMV2-003",
      "KZC-SPECIAL-004",
      "KZC-DEPOT-011",
      "KZC-VENDOR-005",
      "KZC-BANNER-002",
      "KZC-DOC-009",
      "KZC-TRANSFER-002",
    ],
    faq: [
      {
        q: "Le pixel Meta ou Google Ads peut-il se charger avant le bandeau si je ne fais pas de reciblage ?",
        a: "Non en principe. Un pixel de conversion lit ou dépose un identifiant dans le navigateur à des fins publicitaires, ce qui n'est pas strictement nécessaire à l'achat. Son chargement doit attendre le consentement, quelle que soit l'utilisation faite ensuite des données.",
      },
      {
        q: "Les cookies du prestataire de paiement nécessitent-ils un consentement ?",
        a: "Cela dépend de leur finalité. Un traceur limité à la sécurisation de la transaction ou à la lutte contre la fraude peut relever du strictement nécessaire ; un traceur servant à la mesure ou à la publicité, non. La documentation du prestataire et l'observation réelle de ce qui est déposé permettent de trancher.",
      },
      {
        q: "Puis-je conserver les données de mes clients indéfiniment ?",
        a: "Non. Les durées dépendent de la finalité : obligations comptables, preuve du contrat, gestion de la relation client, prospection. Chaque finalité a sa durée, qui doit être indiquée dans la politique de confidentialité.",
      },
      {
        q: "Une extension « RGPD » de ma plateforme e-commerce suffit-elle ?",
        a: "Pas nécessairement. Une extension affiche un bandeau, mais ne garantit pas que les autres extensions attendent le consentement avant de charger leurs scripts. C'est précisément ce que l'audit observe : ce qui se charge réellement, avant et après le choix du visiteur.",
      },
    ],
  },
  {
    slug: "sante",
    name: "Santé",
    title: "Cookies et RGPD pour un site de santé",
    metaDescription:
      "Données de santé (article 9 du RGPD), hébergement HDS, traceurs sur les pages de pathologie ou de prise de rendez-vous : ce qui change pour un site du secteur de la santé.",
    lead: "Sur un site de santé, la simple visite d'une page peut révéler une information sensible. Un traceur publicitaire qui transmet l'adresse de cette page à un tiers ne transmet pas une donnée anodine.",
    stakes: [
      "L'adresse d'une page consultée (une pathologie, un spécialiste, un traitement) peut, transmise à un tiers avec un identifiant, révéler indirectement une information relative à la santé du visiteur.",
      "Les formulaires de prise de rendez-vous, de questionnaire ou de contact médical sont des zones où aucun script tiers d'enregistrement de session ne devrait lire les champs.",
      "L'hébergement des données de santé collectées dans le cadre d'une prise en charge obéit à un régime spécifique de certification, distinct de la seule question des cookies.",
      "Les widgets courants (vidéo, carte d'accès, chat, anti-robots) déposent leurs propres traceurs : sur un site de santé, leur chargement mérite d'être conditionné avec une attention particulière.",
    ],
    obligations: [
      {
        title: "Données concernant la santé : une catégorie particulière",
        body: "Le traitement des données concernant la santé est interdit par principe, sauf exceptions limitativement énumérées (consentement explicite, nécessité aux fins de la médecine préventive ou des soins sous la responsabilité d'un professionnel soumis au secret, etc.). La Cour de justice juge que des données susceptibles de révéler indirectement une telle information relèvent aussi de ce régime.",
        references: [
          "Article 9 du RGPD",
          "Article 4.15 du RGPD (définition des données concernant la santé)",
          "CJUE, 1er août 2022, OT, C-184/20",
          "CJUE, 4 juillet 2023, Meta Platforms e.a., C-252/21",
        ],
      },
      {
        title: "Hébergement certifié des données de santé (HDS)",
        body: "Toute personne qui héberge, pour le compte d'un tiers, des données de santé à caractère personnel recueillies à l'occasion d'activités de prévention, de diagnostic, de soins ou de suivi social et médico-social doit être certifiée. L'obligation vise l'hébergeur ; il revient au responsable du site de vérifier si elle s'applique à ses données.",
        references: ["Article L.1111-8 du Code de la santé publique"],
      },
      {
        title: "Secret professionnel",
        body: "Les informations concernant une personne prise en charge par un professionnel ou un établissement de santé sont couvertes par le secret. Un outil tiers qui en recevrait une partie, même techniquement, pose une question qui dépasse le seul droit des cookies.",
        references: ["Article L.1110-4 du Code de la santé publique"],
      },
      {
        title: "Analyse d'impact et délégué à la protection des données",
        body: "Un traitement à grande échelle de données de santé impose une analyse d'impact et, lorsqu'il constitue l'activité de base de l'organisme, la désignation d'un délégué à la protection des données. Le RGPD précise qu'un professionnel de santé exerçant à titre individuel n'est pas, en principe, dans cette situation.",
        references: [
          "Article 35.3.b du RGPD",
          "Article 37.1.c du RGPD",
          "Considérant 91 du RGPD",
        ],
      },
    ],
    trackers: [
      "meta-pixel",
      "google-analytics-4",
      "google-tag-manager",
      "google-ads",
      "hotjar",
      "microsoft-clarity",
      "youtube",
      "google-maps",
      "recaptcha",
      "crisp",
      "matomo",
    ],
    rules: [
      "KZC-SPECIAL-002",
      "KZC-SPECIAL-006",
      "KZC-SPECIAL-005",
      "KZC-SPECIAL-003",
      "KZC-SPECIAL-004",
      "KZC-TRANSFER-011",
      "KZC-DEPOT-001",
      "KZC-DEPOT-011",
      "KZC-DEPOT-008",
      "KZC-EXEMPT-002",
    ],
    faq: [
      {
        q: "Un site d'information santé, sans espace patient, est-il concerné par l'article 9 du RGPD ?",
        a: "Il peut l'être. Même sans dossier médical, la fréquentation d'une page consacrée à une pathologie, associée à un identifiant transmis à un tiers, peut révéler indirectement une information relative à la santé. L'analyse dépend du contenu des pages et de ce que les traceurs transmettent réellement.",
      },
      {
        q: "Mon site doit-il être hébergé chez un hébergeur certifié HDS ?",
        a: "Pas automatiquement. La certification vise l'hébergement, pour le compte d'un tiers, de données de santé recueillies lors d'activités de prévention, de diagnostic, de soins ou de suivi social et médico-social. Un site vitrine sans recueil de telles données n'est en principe pas concerné ; un service de téléconsultation ou un dossier patient en ligne l'est. Le cas d'espèce doit être vérifié.",
      },
      {
        q: "Puis-je utiliser un outil de mesure d'audience sur un site de santé ?",
        a: "Oui, à condition qu'il soit soumis au consentement, ou configuré pour relever de l'exemption de mesure d'audience prévue par la CNIL : finalité strictement limitée à la mesure, aucune transmission à un tiers pour son propre compte, aucun recoupement. Sur un site de santé, une solution qui ne transmet pas l'adresse complète des pages à un tiers est préférable.",
      },
      {
        q: "Les pages de prise de rendez-vous en ligne demandent-elles une vigilance particulière ?",
        a: "Oui. Ce sont les pages où un visiteur saisit des informations potentiellement sensibles. Aucun script tiers de publicité ou d'enregistrement de session ne devrait y être chargé, et les formulaires doivent être transmis de manière chiffrée.",
      },
    ],
  },
  {
    slug: "collectivites-territoriales",
    name: "Collectivités territoriales",
    title: "Cookies, RGPD et RGAA pour une collectivité territoriale",
    metaDescription:
      "DPO obligatoire (article 37.1.a du RGPD), accessibilité RGAA, mission d'intérêt public, traceurs des vidéos et cartes : ce qui change pour le site d'une commune, d'un département ou d'une région.",
    lead: "Le site d'une collectivité est un service public numérique. Les règles sur les traceurs s'y appliquent comme ailleurs, et s'y ajoutent des obligations propres aux organismes publics : délégué à la protection des données, accessibilité, sécurité des téléservices.",
    stakes: [
      "Les retransmissions de conseils municipaux, les vidéos et les cartes d'accès intégrées depuis des plateformes tierces déposent des traceurs avant tout clic si elles ne sont pas placées derrière un bouton d'activation.",
      "Les formulaires de démarches en ligne utilisent souvent un service anti-robots tiers, chargé sur l'ensemble du site alors qu'il n'est utile que sur les pages comportant un formulaire.",
      "La mesure d'audience est utile au pilotage du service public : une solution configurée pour relever de l'exemption de la CNIL évite d'imposer un bandeau pour ce seul usage.",
      "Le bandeau de consentement est lui-même un contenu soumis à l'accessibilité : il doit être utilisable au clavier et lisible par un lecteur d'écran.",
    ],
    obligations: [
      {
        title: "Délégué à la protection des données obligatoire",
        body: "Toute autorité publique ou tout organisme public doit désigner un délégué à la protection des données. Plusieurs collectivités peuvent désigner un délégué commun, compte tenu de leur structure et de leur taille. Ses coordonnées doivent être publiées et communiquées à la CNIL.",
        references: ["Article 37.1.a du RGPD", "Article 37.3 du RGPD", "Article 37.7 du RGPD"],
      },
      {
        title: "Accessibilité numérique (RGAA)",
        body: "Les services de communication au public en ligne des collectivités territoriales doivent être accessibles aux personnes handicapées. Ils publient une déclaration d'accessibilité, un schéma pluriannuel de mise en accessibilité et une mention visible de l'état de conformité au référentiel général d'amélioration de l'accessibilité.",
        references: [
          "Article 47 de la loi n° 2005-102 du 11 février 2005",
          "Décret n° 2019-768 du 24 juillet 2019",
        ],
      },
      {
        title: "Base légale : la mission d'intérêt public",
        body: "Les traitements nécessaires à l'exécution d'une mission d'intérêt public reposent sur cette base légale. L'intérêt légitime ne peut pas être invoqué par une autorité publique pour les traitements effectués dans l'exécution de ses missions. Pour les traceurs non exemptés, c'est toujours le consentement qui s'applique.",
        references: ["Article 6.1.e du RGPD", "Article 6.1, dernier alinéa, du RGPD", ART_82],
      },
      {
        title: "Sécurité des téléservices",
        body: "Les systèmes d'information des autorités administratives qui proposent des démarches en ligne sont soumis au référentiel général de sécurité, qui s'ajoute à l'obligation de sécurité du RGPD.",
        references: [
          "Ordonnance n° 2005-1516 du 8 décembre 2005, articles 9 et suivants",
          "Article 32 du RGPD",
        ],
      },
    ],
    trackers: [
      "google-analytics-4",
      "matomo",
      "piano-analytics",
      "youtube",
      "vimeo",
      "google-maps",
      "recaptcha",
      "hcaptcha",
      "google-fonts",
      "meta-pixel",
    ],
    rules: [
      "KZC-DOC-006",
      "KZC-EXEMPT-001",
      "KZC-EXEMPT-002",
      "KZC-DEPOT-008",
      "KZC-DEPOT-009",
      "KZC-DEPOT-010",
      "KZC-BANNER-020",
      "KZC-BANNER-021",
      "KZC-TRANSFER-003",
      "KZC-DOC-013",
      "KZC-SEC-001",
      "KZC-SEC-004",
    ],
    faq: [
      {
        q: "Une petite commune doit-elle vraiment désigner un délégué à la protection des données ?",
        a: "Oui. L'obligation vise toute autorité ou tout organisme public, quelle que soit sa taille. Elle peut être remplie par un délégué mutualisé, par exemple via un centre de gestion ou une structure intercommunale.",
      },
      {
        q: "Une collectivité peut-elle utiliser Google Analytics ?",
        a: "La question porte sur deux points : le consentement, puisque l'outil n'est pas en principe exempté dans sa configuration standard, et le transfert vers les États-Unis, à apprécier au regard du Data Privacy Framework et de la certification du destinataire. Une solution de mesure configurée pour l'exemption de la CNIL et hébergée dans l'Union simplifie les deux.",
      },
      {
        q: "Les vidéos des conseils municipaux hébergées sur une plateforme tierce posent-elles problème ?",
        a: "L'intégration directe d'un lecteur tiers dépose généralement des traceurs dès l'affichage de la page. Une image d'aperçu avec un bouton « Lire la vidéo », qui ne charge le lecteur qu'après le clic, règle la question sans priver les administrés du contenu.",
      },
      {
        q: "Le bandeau cookies est-il concerné par l'accessibilité ?",
        a: "Oui. C'est un composant de l'interface comme un autre : il doit pouvoir être utilisé au clavier, être restitué par un lecteur d'écran et présenter des contrastes suffisants. Un bandeau inaccessible empêche certains administrés d'exprimer leur choix.",
      },
    ],
  },
  {
    slug: "medias-presse",
    name: "Médias et éditeurs de presse",
    title: "Cookies et RGPD pour les médias et éditeurs de presse",
    metaDescription:
      "Murs de cookies (Conseil d'État, 19 juin 2020), « payer ou consentir », publicité programmatique et TCF : ce qui change pour un éditeur de presse en ligne.",
    lead: "Un site de presse finance souvent son contenu par la publicité programmatique : des dizaines de partenaires sollicités à chaque page vue. C'est le secteur où le consentement a le plus de valeur économique, et où il est le plus scruté.",
    stakes: [
      "Les enchères publicitaires en temps réel sollicitent de nombreux partenaires dès le chargement de la page ; aucune ne devrait partir avant le consentement.",
      "Le recours au cadre de transparence et de consentement de l'industrie publicitaire (TCF) ne suffit pas en soi : la chaîne transmise doit refléter fidèlement le choix réel du lecteur, refus compris.",
      "Le mur de cookies et l'offre « payer ou consentir » ne sont pas interdits par principe, mais leur licéité s'apprécie au cas par cas, notamment au regard de l'existence d'une alternative réelle et équitable.",
      "Les modules de recommandation de contenus, les lecteurs vidéo et les boutons de partage ajoutent des destinataires qui doivent figurer dans l'information donnée au lecteur.",
    ],
    obligations: [
      {
        title: "Murs de cookies : une appréciation au cas par cas",
        body: "Le Conseil d'État a jugé que la CNIL ne pouvait pas, dans de simples lignes directrices, interdire de manière générale et absolue les murs de cookies. La CNIL en apprécie depuis la licéité au cas par cas, et a publié des premiers critères d'évaluation, dont l'existence d'une alternative réelle et équitable et le caractère raisonnable de la contrepartie demandée.",
        references: [
          "Conseil d'État, 19 juin 2020, n° 434684",
          CNIL_2020,
          "CNIL, « Cookie walls : la CNIL publie des premiers critères d'évaluation », 16 mai 2022",
        ],
      },
      {
        title: "« Payer ou consentir »",
        body: "Le Comité européen de la protection des données a rendu un avis sur les modèles « consentir ou payer » mis en œuvre par les grandes plateformes, insistant sur la liberté du consentement et l'intérêt d'une option gratuite sans publicité comportementale. L'avis vise les grandes plateformes, mais son raisonnement éclaire la pratique des éditeurs.",
        references: ["CEPD, avis 08/2024 du 17 avril 2024"],
      },
      {
        title: "Chaîne de consentement publicitaire (TCF)",
        body: "La Cour de justice a jugé que la chaîne de consentement (TC String), associée à un identifiant tel que l'adresse IP, constitue une donnée à caractère personnel. Sa fidélité au choix réel du lecteur engage donc l'éditeur qui la produit.",
        references: ["CJUE, 7 mars 2024, IAB Europe, C-604/22", ART_82],
      },
      {
        title: "Le régime journalistique ne couvre pas les traceurs",
        body: "Les dérogations prévues pour les traitements à des fins journalistiques visent l'activité éditoriale. Elles ne dispensent pas, en principe, du consentement préalable au dépôt de traceurs publicitaires sur le terminal du lecteur.",
        references: ["Article 85 du RGPD", "Article 80 de la loi n° 78-17 du 6 janvier 1978 modifiée", ART_82],
      },
    ],
    trackers: [
      "prebid",
      "google-ads",
      "smart-adserver",
      "criteo",
      "amazon-ads",
      "taboola",
      "outbrain",
      "sirdata",
      "piano-analytics",
      "didomi",
      "youtube",
      "x-ads",
    ],
    rules: [
      "KZC-BANNER-016",
      "KZC-BANNER-017",
      "KZC-VENDOR-004",
      "KZC-TCF-001",
      "KZC-TCF-005",
      "KZC-TCF-006",
      "KZC-TCF-008",
      "KZC-REFUS-006",
      "KZC-VENDOR-002",
      "KZC-VENDOR-007",
      "KZC-DEPOT-004",
      "KZC-DEPOT-013",
    ],
    faq: [
      {
        q: "Un site de presse peut-il conditionner l'accès à ses articles à l'acceptation des cookies ?",
        a: "Ce n'est pas interdit par principe depuis la décision du Conseil d'État du 19 juin 2020, mais la licéité d'un mur de cookies s'apprécie au cas par cas. La CNIL examine notamment l'existence d'une alternative réelle et équitable à l'acceptation, comme un accès payant à un prix raisonnable.",
      },
      {
        q: "Utiliser une plateforme de consentement compatible TCF suffit-il ?",
        a: "Non. La compatibilité décrit un format, pas un comportement. Il faut vérifier que la chaîne transmise après un refus ne contient pas de finalités actives, et que les partenaires sollicités sont bien ceux qui figurent dans le consentement.",
      },
      {
        q: "L'intérêt légitime peut-il fonder la publicité personnalisée ?",
        a: "Pour le dépôt et la lecture de traceurs publicitaires, c'est le consentement qui s'applique en France, en vertu de l'article 82 de la loi Informatique et Libertés. L'intérêt légitime affiché dans certaines interfaces ne dispense pas de ce consentement.",
      },
      {
        q: "Les enchères publicitaires peuvent-elles partir avant le choix du lecteur ?",
        a: "Non en principe. Une enchère en temps réel transmet des informations sur le lecteur et la page à de nombreux partenaires : elle doit attendre le consentement, et ne pas partir du tout après un refus.",
      },
    ],
  },
];

export function getSector(slug: string): Sector | undefined {
  return SECTORS.find((s) => s.slug === slug);
}
