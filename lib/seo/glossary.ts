/**
 * Glossaire.
 *
 * Le vocabulaire du domaine est un mur : « CMP », « TCF », « CNAME
 * cloaking », « intérêt légitime ». Un dirigeant qui ne comprend pas les
 * mots ne peut pas arbitrer, et se retrouve à signer ce qu'on lui présente.
 *
 * Chaque entrée est rédigée pour être lue par quelqu'un qui découvre, et
 * porte sa référence quand elle existe.
 */

export interface Term {
  slug: string;
  term: string;
  /** Synonymes et sigles, pour la recherche interne et le référencement. */
  aliases?: readonly string[];
  short: string;
  /** Un cas concret, court, qui montre le terme à l'œuvre. */
  example: string;
  body: readonly string[];
  reference?: string;
  related?: readonly string[];
}

export const GLOSSARY: readonly Term[] = [
  {
    slug: "traceur",
    term: "Traceur",
    aliases: ["tracker"],
    short:
      "Tout dispositif permettant de stocker une information dans le terminal d'un visiteur ou d'y accéder.",
    example:
      "Une image invisible d'un pixel publicitaire, ou un identifiant écrit dans le stockage local au premier chargement : deux traceurs au sens de l'article 82, même sans aucun cookie.",
    body: [
      "La loi ne parle pas de « cookies » mais d'accès et d'inscription d'informations dans l'équipement terminal. La formulation est délibérément large : elle couvre le cookie classique, mais aussi le stockage local, les pixels, les identifiants de terminal et les techniques d'empreinte.",
      "Conséquence pratique : remplacer un cookie par du stockage local ne fait pas sortir du champ de la règle. C'est une erreur fréquente, et coûteuse.",
    ],
    reference: "Article 82 de la loi n° 78-17 du 6 janvier 1978 modifiée",
    related: ["cookie", "empreinte-du-terminal", "stockage-local"],
  },
  {
    slug: "cookie",
    term: "Cookie",
    short:
      "Petit fichier texte déposé par un site dans le navigateur du visiteur, renvoyé à chaque requête suivante.",
    example:
      "Le cookie _ga de Google Analytics contient un identifiant aléatoire et un horodatage ; il est conservé deux ans par défaut.",
    body: [
      "Un cookie associe une valeur à un nom, pour un domaine et une durée donnés. Il permet à un site de reconnaître un navigateur d'une page à l'autre — ce qui est indispensable pour un panier d'achat, et tout aussi efficace pour suivre quelqu'un à travers le web.",
      "Le régime juridique ne dépend pas de la technique mais de la finalité : un cookie strictement nécessaire au service demandé est exempté de consentement, un cookie publicitaire ne l'est jamais.",
    ],
    related: ["traceur", "cookie-tiers", "duree-de-vie"],
  },
  {
    slug: "cookie-tiers",
    term: "Cookie tiers",
    aliases: ["third-party cookie"],
    short:
      "Cookie déposé par un domaine différent de celui que le visiteur consulte.",
    example:
      "Sur votresite.fr, le cookie IDE déposé par doubleclick.net est un cookie tiers ; un cookie déposé par votresite.fr lui-même est dit « interne ».",
    body: [
      "Quand vous visitez un site et qu'un cookie est déposé par une régie publicitaire, ce cookie est « tiers ». Comme la même régie est présente sur des milliers de sites, elle reconstitue le parcours du visiteur d'un site à l'autre.",
      "Les navigateurs restreignent progressivement ces cookies, ce qui a poussé l'industrie vers des contournements : masquage par CNAME, marquage côté serveur, empreinte du terminal. La règle juridique, elle, ne change pas.",
    ],
    related: ["masquage-par-cname", "marquage-cote-serveur", "traceur"],
  },
  {
    slug: "consentement",
    term: "Consentement",
    short:
      "Manifestation de volonté libre, spécifique, éclairée et univoque par laquelle une personne accepte un traitement.",
    example:
      "Le visiteur active « Mesure d'audience » et laisse « Publicité » désactivé : seul le traceur de mesure d'audience peut être déposé, et il doit pouvoir revenir sur ce choix à tout moment.",
    body: [
      "Les quatre adjectifs sont cumulatifs et chacun a des conséquences concrètes. « Libre » : refuser doit être aussi simple qu'accepter. « Spécifique » : un accord global pour toutes les finalités ne vaut pas. « Éclairé » : les finalités et les destinataires doivent être connus avant le choix. « Univoque » : le silence, une case pré-cochée ou la poursuite de la navigation ne valent pas accord.",
      "Le consentement doit aussi pouvoir être retiré aussi facilement qu'il a été donné. C'est l'obligation la plus souvent oubliée : beaucoup de sites permettent d'accepter en un clic et rendent le retrait introuvable.",
    ],
    reference: "RGPD, articles 4(11) et 7",
    related: ["refus", "cmp", "dark-pattern"],
  },
  {
    slug: "refus",
    term: "Refus",
    short: "Expression par le visiteur de son opposition au dépôt de traceurs non nécessaires.",
    example:
      "Le visiteur clique sur « Tout refuser » : aucun traceur non nécessaire n'est déposé, et le bandeau ne lui est pas présenté de nouveau à la page suivante.",
    body: [
      "Le refus doit être aussi accessible que l'acceptation : au même niveau, en un nombre de clics identique, avec un traitement visuel équivalent. Un bouton « Tout accepter » plein face à un lien « paramétrer » discret est un procédé identifié par le régulateur.",
      "Le refus doit être mémorisé. S'il est oublié à la page suivante, le visiteur est en pratique découragé de refuser — ce qui vide la règle de son sens.",
    ],
    reference: "CNIL, recommandation, délibération n° 2020-092",
    related: ["consentement", "dark-pattern", "cmp"],
  },
  {
    slug: "cmp",
    term: "Plateforme de gestion du consentement (CMP)",
    aliases: ["consent management platform", "bandeau cookies", "bannière cookies"],
    short:
      "Outil qui affiche le bandeau, recueille le choix du visiteur et le transmet aux autres services.",
    example:
      "Axeptio, Didomi, OneTrust ou Cookiebot sont des CMP : elles affichent le bandeau, enregistrent le choix du visiteur et le transmettent aux balises du site.",
    body: [
      "Une CMP fait trois choses : présenter l'information, enregistrer le choix, diffuser ce choix aux scripts du site et aux partenaires publicitaires.",
      "Ce qu'elle ne fait pas : vérifier que le reste du site respecte ce choix. Si une balise se déclenche avant l'affichage du bandeau, ou continue après un refus, la CMP ne le sait pas et ne vous alerte pas. Installer une CMP n'est donc pas une garantie de conformité — c'est une condition nécessaire, pas suffisante.",
    ],
    related: ["consentement", "tcf", "signal-de-consentement"],
  },
  {
    slug: "dark-pattern",
    term: "Interface trompeuse (dark pattern)",
    short:
      "Procédé d'interface qui oriente le choix de l'utilisateur contre son intérêt.",
    example:
      "Un grand bouton « Tout accepter » en couleur, tandis que le refus n'est accessible qu'en passant par « Personnaliser », puis par un second écran.",
    body: [
      "Sur les bandeaux cookies, les procédés les plus courants sont : un bouton d'acceptation nettement plus visible que celui de refus, un refus enfoui derrière un second écran, une croix de fermeture qui vaut acceptation, ou des cases pré-cochées.",
      "Ces procédés ne sont pas seulement discourtois : ils invalident le caractère libre du consentement, et sont à l'origine d'une part importante des sanctions prononcées en France.",
    ],
    reference: "CNIL, recommandation, délibération n° 2020-092",
    related: ["consentement", "refus", "cmp"],
  },
  {
    slug: "empreinte-du-terminal",
    term: "Empreinte du terminal (fingerprinting)",
    aliases: ["fingerprinting", "empreinte numérique"],
    short:
      "Technique consistant à identifier un visiteur par les caractéristiques de son appareil, sans déposer de cookie.",
    example:
      "Un script combine la résolution d'écran, le fuseau horaire, la langue et la liste des polices pour calculer un identifiant stable, sans rien écrire dans le navigateur.",
    body: [
      "En combinant la résolution d'écran, le modèle de carte graphique, les polices installées, le fuseau horaire et une dizaine d'autres signaux, un script obtient une combinaison suffisamment rare pour reconnaître un visiteur.",
      "L'absence de cookie ne change rien au régime juridique : lire ces informations dans le terminal relève de l'article 82 et suppose un consentement. C'est même plus problématique qu'un cookie, puisque le visiteur ne peut pas l'effacer.",
    ],
    reference: "Article 82 de la loi n° 78-17 modifiée",
    related: ["traceur", "canvas-fingerprinting"],
  },
  {
    slug: "canvas-fingerprinting",
    term: "Empreinte par canvas",
    short:
      "Variante de l'empreinte du terminal exploitant les minuscules différences de rendu graphique entre appareils.",
    example:
      "Un script dessine un texte dans un canvas caché, appelle toDataURL() pour en lire les pixels, puis calcule une empreinte de l'image obtenue.",
    body: [
      "Le script demande au navigateur de dessiner un texte ou une forme dans une zone graphique invisible, puis lit le résultat pixel par pixel. Les écarts de rendu, dus au matériel et aux pilotes, produisent une signature stable.",
      "L'opération est invisible pour le visiteur et ne laisse aucune trace consultable. C'est ce qui la rend particulièrement intrusive.",
    ],
    related: ["empreinte-du-terminal"],
  },
  {
    slug: "masquage-par-cname",
    term: "Masquage par CNAME",
    aliases: ["CNAME cloaking"],
    short:
      "Montage faisant passer un traceur tiers pour un service de votre propre domaine.",
    example:
      "metrics.votresite.fr pointe, par un enregistrement CNAME, vers le domaine d'un prestataire de suivi : le navigateur croit parler à votre site, les données partent chez le tiers.",
    body: [
      "Un sous-domaine qui semble vous appartenir — par exemple analytics.votresite.fr — pointe en réalité, via un enregistrement DNS de type CNAME, vers les serveurs d'une société de suivi.",
      "L'intérêt du montage est d'échapper aux protections des navigateurs contre les cookies tiers, et de prolonger la durée de vie des identifiants. Juridiquement, cela ne change rien : le destinataire réel des données reste le tiers, et il doit être déclaré comme tel.",
    ],
    related: ["cookie-tiers", "marquage-cote-serveur"],
  },
  {
    slug: "marquage-cote-serveur",
    term: "Marquage côté serveur",
    aliases: ["server-side tagging"],
    short:
      "Architecture où les données de suivi transitent par vos serveurs avant d'être transmises aux tiers.",
    example:
      "Le navigateur envoie ses événements à sgtm.votresite.fr, un conteneur Google Tag Manager côté serveur, qui les retransmet ensuite à Google Analytics et à Meta.",
    body: [
      "Plutôt que d'appeler directement les régies depuis le navigateur, le site envoie les événements à un serveur intermédiaire, qui les redistribue.",
      "Cela améliore les performances et la maîtrise technique, mais ne supprime aucune obligation : les destinataires finaux restent des destinataires et doivent figurer dans votre documentation. Présenter ce montage comme une solution de conformité est un raccourci fréquent et faux.",
    ],
    related: ["masquage-par-cname", "sous-traitant"],
  },
  {
    slug: "tcf",
    term: "Cadre de transparence et de consentement (TCF)",
    aliases: ["Transparency and Consent Framework", "TCF v2.2"],
    short:
      "Standard de l'IAB Europe permettant de transmettre le consentement à des centaines de partenaires publicitaires.",
    example:
      "Le choix du visiteur est encodé dans une « TC String » commençant par la lettre C, souvent conservée dans le cookie euconsent-v2 et lue par les partenaires via la fonction __tcfapi.",
    body: [
      "Le TCF encode le choix du visiteur dans une chaîne de caractères, transmise à tous les acteurs de la chaîne publicitaire. Il définit des finalités numérotées et une liste de fournisseurs.",
      "C'est un cadre contractuel privé, distinct du droit applicable : le respecter ne garantit pas la conformité, et l'ignorer ne constitue pas en soi un manquement. En revanche, transmettre une chaîne indiquant un accord alors que le visiteur a refusé est un manquement caractérisé.",
    ],
    related: ["cmp", "consentement", "enchere-en-temps-reel"],
  },
  {
    slug: "signal-de-consentement",
    term: "Signal de consentement",
    aliases: ["Consent Mode", "Global Privacy Control", "GPC"],
    short:
      "Information transmise aux outils tiers pour leur indiquer l'état du choix de l'utilisateur.",
    example:
      "Un navigateur où Global Privacy Control est activé envoie l'en-tête Sec-GPC: 1 à chaque requête ; le Consent Mode, lui, transmet à Google un état comme ad_storage: denied.",
    body: [
      "Deux familles coexistent. Les signaux propres à un fournisseur, comme le Consent Mode de Google, que le site émet vers cet outil. Et les signaux émis par le navigateur lui-même, comme le Global Privacy Control, qui expriment une préférence générale de l'utilisateur.",
      "Les seconds pourraient devenir juridiquement opposables si le projet d'article 88b du Digital Omnibus était adopté — ce qui n'est pas le cas à ce jour.",
    ],
    related: ["cmp", "digital-omnibus"],
  },
  {
    slug: "enchere-en-temps-reel",
    term: "Enchère publicitaire en temps réel (RTB)",
    aliases: ["real-time bidding", "RTB"],
    short:
      "Mise aux enchères d'un espace publicitaire pendant le chargement de la page, entre de nombreux acheteurs.",
    example:
      "Pendant le chargement d'un article, une requête d'enchère contenant l'adresse de la page et un identifiant du visiteur part vers plusieurs plateformes ; l'annonce gagnante s'affiche dans la foulée.",
    body: [
      "À chaque affichage, les caractéristiques du visiteur — centres d'intérêt supposés, localisation approximative, page consultée — sont diffusées simultanément à des dizaines d'acteurs qui enchérissent en quelques millisecondes.",
      "C'est le mécanisme qui diffuse le plus largement les données des visiteurs, et celui dont la chaîne est la plus difficile à maîtriser au-delà du premier niveau. Un déclenchement avant consentement est un constat lourd.",
    ],
    related: ["tcf", "cookie-tiers"],
  },
  {
    slug: "mesure-daudience-exemptee",
    term: "Mesure d'audience exemptée",
    short:
      "Configuration de statistiques de fréquentation dispensée de consentement, sous conditions cumulatives.",
    example:
      "Un Matomo auto-hébergé, avec adresse IP tronquée, sans recoupement avec d'autres traitements et des cookies limités à treize mois, peut bénéficier de l'exemption.",
    body: [
      "La CNIL admet qu'un outil de mesure puisse être exempté s'il sert uniquement à produire des statistiques anonymes pour l'éditeur, ne permet pas de suivre la navigation entre sites, ne transmet pas les données à des tiers, tronque l'adresse IP, et limite les durées de conservation.",
      "Les conditions sont cumulatives : il suffit qu'une seule ne soit pas remplie pour que l'exemption tombe. Dans sa configuration standard, un outil hébergé par un tiers hors EEE ne remplit pas ces conditions.",
    ],
    reference: "CNIL, recommandation relative à la mesure d'audience",
    related: ["consentement", "traceur"],
  },
  {
    slug: "duree-de-vie",
    term: "Durée de vie d'un traceur",
    short: "Période pendant laquelle un traceur reste actif dans le terminal du visiteur.",
    example:
      "Le cookie _fbp de Meta expire quatre-vingt-dix jours après son dernier renouvellement ; un cookie de session disparaît à la fermeture du navigateur.",
    body: [
      "La CNIL recommande une durée maximale de treize mois pour les traceurs, et de vingt-cinq mois pour les données collectées par leur intermédiaire. Au-delà, le consentement doit être de nouveau recueilli.",
      "Cette durée est souvent fixée par l'éditeur du service tiers, et non par vous. Elle vous engage néanmoins : c'est vous qui répondez de ce qui se dépose sur votre site.",
    ],
    reference: "CNIL, recommandation, délibération n° 2020-092",
    related: ["cookie", "mesure-daudience-exemptee"],
  },
  {
    slug: "responsable-de-traitement",
    term: "Responsable de traitement",
    short:
      "Entité qui détermine les finalités et les moyens d'un traitement de données personnelles.",
    example:
      "Le cabinet comptable qui décide de constituer un fichier de prospects, et de ce qu'il contient, en est responsable ; l'agence qui a réalisé le formulaire ne l'est pas.",
    body: [
      "C'est celui qui décide pourquoi et comment les données sont traitées. Pour un site web, c'est en général l'entreprise qui l'édite — pas l'agence qui l'a réalisé, ni l'hébergeur.",
      "Cette qualité emporte l'essentiel des obligations : information des personnes, tenue du registre, réponse aux demandes de droits, notification des violations.",
    ],
    reference: "RGPD, article 4(7)",
    related: ["sous-traitant", "registre-des-traitements"],
  },
  {
    slug: "sous-traitant",
    term: "Sous-traitant",
    short: "Entité qui traite des données pour le compte du responsable de traitement.",
    example:
      "Votre outil d'envoi de newsletters, qui traite les adresses de vos abonnés uniquement pour leur adresser vos messages, selon vos instructions.",
    body: [
      "Un hébergeur, un prestataire d'envoi d'e-mails ou un outil de statistiques agissent comme sous-traitants : ils traitent des données selon vos instructions, sans en déterminer eux-mêmes les finalités.",
      "La relation doit être encadrée par un contrat comportant les mentions de l'article 28 du RGPD. Un sous-traitant peut lui-même recourir à d'autres sous-traitants : cette chaîne doit être documentée, et elle est souvent plus longue qu'on ne l'imagine.",
    ],
    reference: "RGPD, articles 4(8) et 28",
    related: ["responsable-de-traitement", "transfert-hors-ue"],
  },
  {
    slug: "registre-des-traitements",
    term: "Registre des activités de traitement",
    short: "Inventaire documenté de tous les traitements de données réalisés par un organisme.",
    example:
      "Une ligne du registre : « Recrutement — candidats — CV et coordonnées — service RH — conservation deux ans après le dernier contact ».",
    body: [
      "Le registre recense, pour chaque traitement : sa finalité, les catégories de personnes et de données, les destinataires, les transferts hors UE, les durées de conservation et les mesures de sécurité.",
      "C'est la première pièce qu'un contrôleur demande. Son absence est un manquement autonome, indépendamment de la qualité réelle de vos pratiques.",
    ],
    reference: "RGPD, article 30",
    related: ["responsable-de-traitement", "aipd"],
  },
  {
    slug: "aipd",
    term: "Analyse d'impact (AIPD)",
    aliases: ["DPIA", "analyse d'impact relative à la protection des données"],
    short:
      "Étude préalable obligatoire lorsqu'un traitement est susceptible d'engendrer un risque élevé pour les personnes.",
    example:
      "Un site de santé qui envisage de croiser les pages consultées avec des profils publicitaires doit mener une AIPD avant toute mise en service.",
    body: [
      "L'analyse décrit le traitement, évalue sa nécessité et sa proportionnalité, identifie les risques pour les personnes concernées et les mesures prises pour les réduire.",
      "Elle est requise notamment en cas de profilage à grande échelle, de traitement de données sensibles ou de surveillance systématique. Le suivi publicitaire inter-sites y conduit fréquemment.",
    ],
    reference: "RGPD, article 35",
    related: ["registre-des-traitements", "donnees-sensibles"],
  },
  {
    slug: "transfert-hors-ue",
    term: "Transfert hors Union européenne",
    short:
      "Communication de données personnelles vers un destinataire situé hors de l'Espace économique européen.",
    example:
      "Un script chargé depuis un serveur situé aux États-Unis reçoit l'adresse IP de chaque visiteur dès l'affichage de la page : c'est déjà un transfert.",
    body: [
      "Un transfert n'exige pas un envoi délibéré : il suffit qu'un prestataire établi hors EEE puisse accéder aux données. Charger un script depuis un serveur américain constitue déjà un transfert, puisque l'adresse IP du visiteur y est transmise.",
      "Le transfert n'est licite que s'il repose sur une décision d'adéquation, sur des garanties appropriées comme les clauses contractuelles types, ou sur une dérogation. Depuis l'arrêt Schrems II, la seule signature de clauses ne suffit pas : une analyse du droit du pays destinataire est attendue.",
    ],
    reference: "RGPD, articles 44 à 49",
    related: ["decision-dadequation", "sous-traitant", "clauses-contractuelles-types"],
  },
  {
    slug: "decision-dadequation",
    term: "Décision d'adéquation",
    short:
      "Décision par laquelle la Commission européenne reconnaît qu'un pays tiers offre un niveau de protection suffisant.",
    example:
      "Confier des données à un prestataire établi en Suisse ou au Japon ne demande aucune garantie supplémentaire : ces pays bénéficient d'une décision d'adéquation.",
    body: [
      "Lorsqu'une telle décision existe, les transferts vers ce pays s'effectuent sans formalité supplémentaire. Le Royaume-Uni, la Suisse, le Canada, le Japon et Israël en bénéficient notamment.",
      "Le cas des États-Unis est particulier : l'adéquation n'est acquise que pour les organisations certifiées au titre du Data Privacy Framework. La certification se vérifie entité par entité, et son maintien doit être contrôlé.",
    ],
    reference: "RGPD, article 45",
    related: ["transfert-hors-ue", "data-privacy-framework"],
  },
  {
    slug: "data-privacy-framework",
    term: "Data Privacy Framework",
    aliases: ["DPF", "EU-US Data Privacy Framework"],
    short:
      "Cadre d'adéquation conditionnelle applicable aux transferts vers des organisations américaines certifiées.",
    example:
      "Avant un transfert vers un prestataire américain, on vérifie sur dataprivacyframework.gov que l'entité exacte figure sur la liste, avec un statut « Active ».",
    body: [
      "Adopté en 2023 après l'invalidation du Privacy Shield, il permet aux entreprises américaines qui s'y engagent formellement de recevoir des données européennes sans garanties supplémentaires.",
      "Deux précautions : la certification doit être vérifiée pour l'entité exacte qui reçoit les données, et elle peut être retirée. Un instantané daté ne dispense pas d'un contrôle périodique.",
    ],
    related: ["decision-dadequation", "transfert-hors-ue"],
  },
  {
    slug: "clauses-contractuelles-types",
    term: "Clauses contractuelles types",
    aliases: ["CCT", "SCC"],
    short:
      "Modèles de contrat adoptés par la Commission européenne pour encadrer les transferts hors UE.",
    example:
      "Le module 2 (responsable vers sous-traitant) s'applique quand une entreprise française confie l'hébergement de ses données à un prestataire établi en Inde.",
    body: [
      "Ces clauses imposent au destinataire des obligations équivalentes à celles du RGPD. Elles se déclinent en quatre modules selon la qualité des parties.",
      "Depuis Schrems II, elles doivent être accompagnées d'une analyse d'impact des transferts évaluant si le droit du pays destinataire permet réellement de les respecter — notamment au regard des pouvoirs d'accès des autorités.",
    ],
    reference: "Décision d'exécution (UE) 2021/914",
    related: ["transfert-hors-ue", "aipd"],
  },
  {
    slug: "donnees-sensibles",
    term: "Données sensibles",
    aliases: ["catégories particulières de données"],
    short:
      "Données révélant notamment la santé, les opinions politiques, les convictions religieuses ou l'orientation sexuelle.",
    example:
      "Sur un site d'information consacré au diabète, l'adresse de la page consultée, transmise à une régie, peut révéler une information sur la santé du visiteur.",
    body: [
      "Leur traitement est en principe interdit, sauf exceptions limitativement énumérées, dont le consentement explicite.",
      "Le piège tient à ce qu'une donnée sensible peut se déduire du contexte : la seule consultation d'une page relative à une pathologie peut révéler une information sur l'état de santé. C'est pourquoi la présence de traceurs publicitaires sur un site de santé appelle une vigilance particulière.",
    ],
    reference: "RGPD, article 9",
    related: ["aipd", "transfert-hors-ue"],
  },
  {
    slug: "interet-legitime",
    term: "Intérêt légitime",
    short:
      "Base légale permettant un traitement nécessaire aux intérêts du responsable, sous réserve d'une mise en balance.",
    example:
      "La lutte contre la fraude au paiement peut reposer sur l'intérêt légitime ; le dépôt d'un cookie publicitaire, jamais.",
    body: [
      "L'intérêt légitime suppose de démontrer que le traitement est nécessaire, et que les droits des personnes ne prévalent pas — analyse à documenter, pas à affirmer.",
      "Point essentiel : l'intérêt légitime ne peut jamais fonder le dépôt d'un traceur soumis à consentement. L'article 82 exige un consentement, et aucune autre base légale ne s'y substitue. C'est une confusion très répandue.",
    ],
    reference: "RGPD, article 6(1)(f)",
    related: ["consentement", "traceur"],
  },
  {
    slug: "digital-omnibus",
    term: "Digital Omnibus",
    short:
      "Proposition de la Commission européenne visant notamment à rapatrier les règles sur les traceurs dans le RGPD.",
    example:
      "Le projet envisage qu'après un refus, un site ne puisse plus redemander le consentement pendant environ six mois — disposition non adoptée à ce jour.",
    body: [
      "Présentée le 19 novembre 2025, elle envisage un encadrement de la structure du consentement, une exemption élargie pour la mesure d'audience, une interdiction de re-solliciter pendant environ six mois après un refus, et l'opposabilité des signaux émis par le navigateur.",
      "Ce texte n'est pas adopté et fait l'objet d'un avis conjoint critique des autorités européennes de protection des données. Fonder une décision de conformité sur ses dispositions serait prématuré.",
    ],
    reference: "COM(2025) 837",
    related: ["signal-de-consentement", "mesure-daudience-exemptee"],
  },
  {
    slug: "procedure-simplifiee",
    term: "Procédure simplifiée",
    short:
      "Voie de sanction allégée devant la CNIL, réservée aux affaires ne présentant pas de difficulté particulière.",
    example:
      "Une amende de quelques milliers d'euros pour des cookies publicitaires déposés avant tout consentement, prononcée par un membre de la formation restreinte statuant seul.",
    body: [
      "Elle permet de traiter rapidement des dossiers courants, avec un plafond de vingt mille euros par décision. Elle représente une part importante des sanctions prononcées.",
      "C'est l'ordre de grandeur qui concerne réellement une PME — bien loin du plafond de vingt millions d'euros, qui vise les manquements les plus graves des organisations les plus importantes.",
    ],
    reference: "Article 22-1 de la loi n° 78-17 modifiée",
    related: ["consentement"],
  },
  {
    slug: "dpo",
    term: "Délégué à la protection des données (DPO)",
    short:
      "Personne chargée de veiller au respect de la réglementation sur les données au sein d'un organisme.",
    example:
      "Un hôpital ou une mairie doit désigner un DPO ; une boulangerie qui tient un simple fichier de clients n'y est pas tenue.",
    body: [
      "Sa désignation est obligatoire pour les autorités publiques et pour les organismes dont l'activité principale implique un suivi systématique à grande échelle ou le traitement de données sensibles. Elle reste recommandée dans les autres cas.",
      "Le délégué doit disposer des moyens de sa mission et ne peut être sanctionné pour son exercice. Ses coordonnées doivent être communiquées à la CNIL et publiées.",
    ],
    reference: "RGPD, articles 37 à 39",
    related: ["responsable-de-traitement", "registre-des-traitements"],
  },
  {
    slug: "stockage-local",
    term: "Stockage local",
    aliases: ["localStorage", "sessionStorage", "IndexedDB"],
    short:
      "Mécanismes du navigateur permettant de conserver des données sans passer par un cookie.",
    example:
      "Un script qui exécute localStorage.setItem(\"uid\", …) au premier chargement dépose un traceur, exactement comme le ferait un cookie.",
    body: [
      "Le stockage local persiste jusqu'à effacement explicite et n'est pas transmis automatiquement au serveur. IndexedDB permet de stocker des volumes bien plus importants.",
      "Ces mécanismes relèvent exactement du même régime que les cookies : y écrire un identifiant sans consentement est un manquement à l'article 82. Les présenter comme une alternative permettant d'échapper à la règle est un contresens.",
    ],
    related: ["traceur", "cookie"],
  },
];

export function getTerm(slug: string): Term | undefined {
  return GLOSSARY.find((t) => t.slug === slug);
}
