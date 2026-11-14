/**
 * Auto-évaluation RGPD — ce qu'un scanner ne peut pas voir.
 *
 * Le scan technique observe un site. Il ne voit ni le registre, ni les
 * contrats, ni la procédure de violation, ni la façon dont une demande
 * d'accès est traitée. Ce questionnaire couvre ce périmètre, sur une base
 * strictement DÉCLARATIVE : le score reflète les réponses données, pas une
 * vérification. Il ne vaut ni audit ni attestation de conformité.
 *
 * Module pur : aucune dépendance au DOM, aucun stockage.
 */

export type Answer = "yes" | "partial" | "no" | "unknown";

export const ANSWER_OPTIONS: readonly { value: Answer; label: string }[] = [
  { value: "yes", label: "Oui" },
  { value: "partial", label: "Partiellement" },
  { value: "no", label: "Non" },
  { value: "unknown", label: "Je ne sais pas" },
];

export const ANSWER_LABELS: Record<Answer, string> = {
  yes: "Oui",
  partial: "Partiellement",
  no: "Non",
  unknown: "Je ne sais pas",
};

export type ThemeId =
  | "gouvernance"
  | "registre"
  | "information"
  | "droits"
  | "sous-traitants"
  | "transferts"
  | "securite"
  | "conservation";

export interface Theme {
  id: ThemeId;
  title: string;
  intro: string;
}

export interface Question {
  id: string;
  theme: ThemeId;
  /** Intitulé, formulé pour qu'un « Oui » corresponde à la pratique attendue. */
  label: string;
  /** « Pourquoi c'est demandé ». */
  help: string;
  /** Référence légale ou recommandation CNIL. */
  reference: string;
  /** Importance relative, de 1 à 3. */
  weight: 1 | 2 | 3;
  /** Action recommandée lorsque la pratique n'est pas en place. */
  action: string;
}

export const THEMES: readonly Theme[] = [
  {
    id: "gouvernance",
    title: "Gouvernance et pilotage",
    intro: "Qui porte le sujet, et comment vous démontrez ce que vous faites.",
  },
  {
    id: "registre",
    title: "Registre et bases légales",
    intro: "Savoir quelles données vous traitez, pourquoi, et sur quel fondement.",
  },
  {
    id: "information",
    title: "Information des personnes",
    intro: "Ce que vous dites aux personnes dont vous traitez les données.",
  },
  {
    id: "droits",
    title: "Droits des personnes",
    intro: "Comment une demande d'accès, d'effacement ou d'opposition est traitée.",
  },
  {
    id: "sous-traitants",
    title: "Sous-traitants et partenaires",
    intro: "Les prestataires qui traitent des données pour votre compte.",
  },
  {
    id: "transferts",
    title: "Transferts hors de l'Union",
    intro: "Les données qui sortent de l'Espace économique européen, souvent sans qu'on le sache.",
  },
  {
    id: "securite",
    title: "Sécurité et violations de données",
    intro: "Les mesures de protection et la réaction en cas d'incident.",
  },
  {
    id: "conservation",
    title: "Durées de conservation et traceurs",
    intro: "Combien de temps vous gardez les données, et la gouvernance des cookies.",
  },
];

export const QUESTIONS: readonly Question[] = [
  // ── Gouvernance ──────────────────────────────────────────────────────────
  {
    id: "gov-dpo",
    theme: "gouvernance",
    label:
      "Avez-vous vérifié si la désignation d'un délégué à la protection des données (DPO) est obligatoire pour vous et, si elle l'est, l'avez-vous désigné et déclaré à la CNIL ?",
    help: "La désignation est obligatoire pour les organismes publics, et pour ceux dont l'activité de base implique un suivi régulier et systématique à grande échelle ou le traitement à grande échelle de données sensibles. Dans les autres cas, elle est facultative, mais l'analyse doit pouvoir être expliquée.",
    reference: "RGPD, art. 37",
    weight: 2,
    action:
      "Analysez les critères de l'article 37(1) et consignez la conclusion. Si la désignation est obligatoire, désignez un DPO et communiquez ses coordonnées à la CNIL ; sinon, nommez au moins un référent interne.",
  },
  {
    id: "gov-pilot",
    theme: "gouvernance",
    label:
      "Une personne est-elle clairement chargée de piloter la protection des données (suivi des actions, arbitrages, points réguliers avec la direction) ?",
    help: "Le responsable du traitement doit mettre en œuvre des mesures appropriées et pouvoir le démontrer. Sans pilote identifié, les actions se perdent entre les services.",
    reference: "RGPD, art. 5(2) et 24",
    weight: 2,
    action:
      "Désignez un pilote (DPO, référent ou dirigeant), fixez-lui une feuille de route et prévoyez un point périodique avec la direction.",
  },
  {
    id: "gov-training",
    theme: "gouvernance",
    label:
      "Les personnes qui manipulent des données personnelles sont-elles sensibilisées régulièrement à leur protection ?",
    help: "Une grande partie des incidents vient d'erreurs humaines : envoi au mauvais destinataire, hameçonnage, partage de fichier trop large. Les personnes agissant sous l'autorité du responsable ne doivent traiter les données que sur instruction.",
    reference: "RGPD, art. 32(4) et 39(1)(b)",
    weight: 1,
    action:
      "Organisez une sensibilisation courte et récurrente (hameçonnage, partage de fichiers, demandes de droits) et gardez une trace des participants.",
  },
  {
    id: "gov-proof",
    theme: "gouvernance",
    label:
      "Conservez-vous une documentation permettant de démontrer votre conformité (politiques internes, analyses, décisions, contrats, preuves) ?",
    help: "Le RGPD repose sur la responsabilité : en cas de contrôle, il ne suffit pas d'être en règle, il faut pouvoir le montrer.",
    reference: "RGPD, art. 5(2) et 24(1)",
    weight: 2,
    action:
      "Centralisez dans un dossier unique le registre, les analyses, les contrats, les procédures et leurs mises à jour datées.",
  },

  // ── Registre ─────────────────────────────────────────────────────────────
  {
    id: "reg-register",
    theme: "registre",
    label: "Tenez-vous un registre des activités de traitement, à jour ?",
    help: "Le registre est la pièce de base demandée en premier lors d'un contrôle. L'exemption prévue pour les structures de moins de 250 personnes est étroite : elle ne joue pas pour les traitements non occasionnels, comme la paie ou la gestion des clients.",
    reference: "RGPD, art. 30",
    weight: 3,
    action:
      "Établissez le registre (le modèle de la CNIL suffit pour commencer) : une fiche par traitement avec finalité, catégories de données et de personnes, destinataires, durées et mesures de sécurité.",
  },
  {
    id: "reg-basis",
    theme: "registre",
    label:
      "Pour chaque traitement, la finalité et la base légale (consentement, contrat, obligation légale, intérêt légitime, etc.) sont-elles identifiées et documentées ?",
    help: "Un traitement sans base légale est illicite, quelle que soit la qualité de sa sécurité. La base légale conditionne aussi les droits ouverts aux personnes.",
    reference: "RGPD, art. 5(1)(b) et 6(1)",
    weight: 3,
    action:
      "Ajoutez au registre la finalité précise et la base légale de chaque traitement. Pour l'intérêt légitime, documentez la mise en balance avec les droits des personnes.",
  },
  {
    id: "reg-minimisation",
    theme: "registre",
    label: "Ne collectez-vous que les données nécessaires à chaque finalité ?",
    help: "Les champs « au cas où » dans un formulaire ou un fichier sont un risque sans contrepartie : plus de données, c'est plus d'exposition en cas d'incident.",
    reference: "RGPD, art. 5(1)(c)",
    weight: 2,
    action:
      "Passez en revue vos formulaires et fichiers, supprimez les champs non nécessaires et rendez facultatifs ceux qui ne sont pas indispensables.",
  },
  {
    id: "reg-sensitive",
    theme: "registre",
    label:
      "Avez-vous identifié si vous traitez des données sensibles (santé, opinions, biométrie, etc.) ou relatives à des infractions, et vérifié les conditions qui s'appliquent ?",
    help: "Ces données sont soumises à une interdiction de principe, assortie d'exceptions limitativement énumérées.",
    reference: "RGPD, art. 9 et 10",
    weight: 2,
    action:
      "Recensez les traitements concernés et vérifiez pour chacun l'exception de l'article 9(2) ou le cadre de l'article 10 qui l'autorise ; à défaut, cessez la collecte.",
  },
  {
    id: "reg-dpia",
    theme: "registre",
    label:
      "Avez-vous vérifié si certains traitements nécessitent une analyse d'impact (AIPD) et réalisé celles qui sont requises ?",
    help: "Une AIPD est obligatoire pour les traitements susceptibles d'engendrer un risque élevé. La CNIL publie une liste de types d'opérations pour lesquels elle est requise.",
    reference: "RGPD, art. 35 ; délibération CNIL n° 2018-327 (liste des traitements soumis à AIPD)",
    weight: 2,
    action:
      "Confrontez vos traitements à la liste de la CNIL et aux critères du CEPD ; conduisez les AIPD nécessaires (l'outil PIA de la CNIL peut aider) et consignez celles écartées, avec la raison.",
  },

  // ── Information ──────────────────────────────────────────────────────────
  {
    id: "info-policy",
    theme: "information",
    label:
      "Une politique de confidentialité complète et à jour est-elle accessible (responsable, finalités, bases légales, destinataires, durées, droits, transferts, droit de réclamation auprès de la CNIL) ?",
    help: "L'information doit être concise, transparente, compréhensible et aisément accessible. Une politique générique copiée d'un autre site décrit rarement vos traitements réels.",
    reference: "RGPD, art. 12, 13 et 14",
    weight: 3,
    action:
      "Rédigez ou mettez à jour la politique à partir de votre registre, pour qu'elle décrive vos traitements réels, et datez chaque version.",
  },
  {
    id: "info-forms",
    theme: "information",
    label:
      "Vos formulaires de collecte (contact, devis, inscription, recrutement) comportent-ils une mention d'information au point de collecte ?",
    help: "Les informations doivent être fournies au moment où les données sont obtenues. Une mention courte, avec un lien vers la politique complète, est l'approche recommandée.",
    reference: "RGPD, art. 13(1) et (2)",
    weight: 2,
    action:
      "Ajoutez sous chaque formulaire une mention courte (responsable, finalité, base légale, droits) renvoyant à la politique complète.",
  },
  {
    id: "info-staff",
    theme: "information",
    label:
      "Les salariés et candidats sont-ils informés des traitements qui les concernent (gestion RH, outils de contrôle ou de surveillance, recrutement) ?",
    help: "Aucune information concernant personnellement un salarié ne peut être collectée par un dispositif qui n'a pas été porté préalablement à sa connaissance.",
    reference: "RGPD, art. 13 ; code du travail, art. L. 1222-4",
    weight: 2,
    action:
      "Diffusez une notice d'information RH (livret d'accueil, intranet) et informez individuellement avant toute mise en place d'un dispositif de contrôle.",
  },

  // ── Droits ───────────────────────────────────────────────────────────────
  {
    id: "rights-procedure",
    theme: "droits",
    label:
      "Une procédure interne permet-elle de recevoir, tracer et traiter les demandes d'exercice des droits (accès, rectification, effacement, opposition, portabilité, etc.) ?",
    help: "Une demande peut arriver par n'importe quel canal (e-mail commercial, courrier, réseaux sociaux). Sans procédure, elle reste sans réponse, et c'est un motif fréquent de plainte.",
    reference: "RGPD, art. 12 et 15 à 22",
    weight: 3,
    action:
      "Prévoyez une adresse dédiée, un circuit de transmission interne, un tableau de suivi des demandes et des modèles de réponse.",
  },
  {
    id: "rights-delay",
    theme: "droits",
    label:
      "Répondez-vous dans le délai d'un mois, prolongé au plus de deux mois en cas de complexité, en informant la personne de cette prolongation et de ses motifs ?",
    help: "Le délai court à compter de la réception de la demande. Une prolongation doit être annoncée à la personne dans le premier mois.",
    reference: "RGPD, art. 12(3)",
    weight: 2,
    action:
      "Inscrivez dans le tableau de suivi la date de réception et l'échéance de chaque demande, et désignez qui relance avant l'échéance.",
  },
  {
    id: "rights-optout",
    theme: "droits",
    label:
      "Les oppositions à la prospection et les désinscriptions sont-elles prises en compte rapidement, et dans tous vos outils (CRM, routeur d'e-mails, prestataires) ?",
    help: "L'opposition à la prospection est un droit absolu : elle n'a pas à être motivée. La prospection par e-mail auprès de particuliers exige en principe leur consentement préalable.",
    reference: "RGPD, art. 21(2) et (3) ; code des postes et des communications électroniques, art. L. 34-5",
    weight: 2,
    action:
      "Mettez en place une liste d'opposition centralisée, synchronisée avec tous les outils d'envoi, et un lien de désinscription dans chaque message.",
  },

  // ── Sous-traitants ───────────────────────────────────────────────────────
  {
    id: "proc-list",
    theme: "sous-traitants",
    label:
      "Disposez-vous de la liste de vos sous-traitants (hébergeur, outils SaaS, prestataire de paie, agence web, CRM, etc.) ?",
    help: "Chaque outil qui stocke ou consulte des données pour votre compte est un sous-traitant. On ne peut encadrer que ce que l'on a recensé.",
    reference: "RGPD, art. 28 et 30(1)(d)",
    weight: 2,
    action:
      "Recensez vos prestataires et outils (la liste des abonnements et des factures est un bon point de départ) et rattachez-les aux traitements du registre.",
  },
  {
    id: "proc-contract",
    theme: "sous-traitants",
    label:
      "Un contrat ou des clauses conformes à l'article 28(3) lient-ils chaque sous-traitant (objet, durée, instructions, confidentialité, sécurité, sous-traitance ultérieure, sort des données en fin de contrat) ?",
    help: "Ces mentions sont obligatoires. Les grands éditeurs proposent généralement un accord de traitement des données (DPA) qu'il suffit d'accepter et d'archiver.",
    reference: "RGPD, art. 28(3)",
    weight: 3,
    action:
      "Récupérez et archivez le DPA de chaque prestataire ; à défaut, faites signer un avenant reprenant les mentions de l'article 28(3).",
  },
  {
    id: "proc-guarantees",
    theme: "sous-traitants",
    label: "Vérifiez-vous les garanties de sécurité d'un sous-traitant avant de le retenir ?",
    help: "Le responsable ne peut faire appel qu'à des sous-traitants présentant des garanties suffisantes. Le choix d'un prestataire fragile engage votre propre responsabilité.",
    reference: "RGPD, art. 28(1)",
    weight: 2,
    action:
      "Ajoutez à vos achats un questionnaire de sécurité simple (hébergement, chiffrement, certifications, localisation, gestion des incidents) à faire remplir avant signature.",
  },
  {
    id: "proc-joint",
    theme: "sous-traitants",
    label:
      "Lorsque vous déterminez les finalités avec un partenaire (page de réseau social, opération commerciale commune, etc.), un accord répartit-il vos obligations respectives ? Répondez « Oui » si vous avez vérifié que ce cas ne vous concerne pas.",
    help: "Les responsables conjoints doivent définir, par un accord, leurs obligations respectives, notamment pour l'information et l'exercice des droits.",
    reference: "RGPD, art. 26",
    weight: 1,
    action:
      "Identifiez les situations de responsabilité conjointe et formalisez un accord ; pour les réseaux sociaux, vérifiez et archivez l'accord proposé par la plateforme.",
  },

  // ── Transferts ───────────────────────────────────────────────────────────
  {
    id: "transfer-map",
    theme: "transferts",
    label:
      "Savez-vous si des données sont transférées ou accessibles hors de l'Espace économique européen, y compris via vos outils SaaS, leur support ou leurs propres sous-traitants ?",
    help: "Un hébergement en Europe n'exclut pas un accès à distance depuis un pays tiers, par exemple par le support technique de l'éditeur. Ce type d'accès constitue aussi un transfert.",
    reference: "RGPD, art. 44",
    weight: 2,
    action:
      "Pour chaque sous-traitant, relevez la localisation des données, du support et des sous-traitants ultérieurs (figurant généralement dans le DPA).",
  },
  {
    id: "transfer-basis",
    theme: "transferts",
    label:
      "Chaque transfert hors EEE repose-t-il sur un fondement valable (décision d'adéquation, dont le Data Privacy Framework pour les entreprises américaines certifiées, ou clauses contractuelles types) ? Répondez « Oui » si vous avez vérifié qu'il n'y a aucun transfert.",
    help: "Hors adéquation, un transfert exige des garanties appropriées. Les dérogations de l'article 49 sont d'interprétation stricte et ne conviennent pas à des transferts réguliers.",
    reference: "RGPD, art. 45, 46 et 49 ; décision d'exécution (UE) 2021/914 (clauses contractuelles types)",
    weight: 3,
    action:
      "Pour chaque transfert, vérifiez la certification du destinataire au Data Privacy Framework ou la présence de clauses contractuelles types ; à défaut, changez de prestataire ou de configuration.",
  },
  {
    id: "transfer-tia",
    theme: "transferts",
    label:
      "Pour les transferts fondés sur des clauses contractuelles types, avez-vous évalué la législation du pays destinataire et prévu des mesures complémentaires si nécessaire ? Répondez « Oui » si ce cas ne vous concerne pas.",
    help: "Depuis l'arrêt Schrems II, l'exportateur doit vérifier que la législation du pays tiers ne prive pas les clauses de leur effet, et compléter si besoin (chiffrement, pseudonymisation).",
    reference: "CJUE, 16 juillet 2020, C-311/18 (Schrems II) ; CEPD, recommandations 01/2020",
    weight: 1,
    action:
      "Documentez une analyse d'impact du transfert (souvent fournie par l'éditeur) et, si elle le justifie, des mesures complémentaires comme le chiffrement dont vous gardez les clés.",
  },

  // ── Sécurité ─────────────────────────────────────────────────────────────
  {
    id: "sec-access",
    theme: "securite",
    label:
      "Les accès aux données sont-ils limités aux besoins de chacun (comptes individuels, habilitations revues périodiquement, accès retirés au départ des personnes) ?",
    help: "Les comptes partagés et les accès non retirés après un départ figurent parmi les manquements de sécurité les plus souvent relevés.",
    reference: "RGPD, art. 32 ; CNIL, Guide de la sécurité des données personnelles",
    weight: 3,
    action:
      "Supprimez les comptes partagés, définissez des profils d'habilitation, revoyez-les au moins une fois par an et intégrez le retrait des accès à la procédure de départ.",
  },
  {
    id: "sec-auth",
    theme: "securite",
    label:
      "L'authentification est-elle robuste (mots de passe conformes aux recommandations de la CNIL, double authentification pour les accès à distance et les comptes d'administration) ?",
    help: "Un mot de passe faible ou réutilisé suffit à compromettre une messagerie ou un CRM entier.",
    reference: "RGPD, art. 32 ; délibération CNIL n° 2022-100 (recommandation relative aux mots de passe)",
    weight: 2,
    action:
      "Activez la double authentification sur la messagerie, les outils SaaS et les accès d'administration, et déployez un gestionnaire de mots de passe.",
  },
  {
    id: "sec-backup",
    theme: "securite",
    label:
      "Les données sont-elles sauvegardées régulièrement, avec des restaurations testées, et chiffrées sur les postes nomades et supports amovibles ?",
    help: "La sécurité couvre la confidentialité mais aussi la disponibilité : la capacité à rétablir l'accès aux données en cas d'incident est expressément visée.",
    reference: "RGPD, art. 32(1)(b) et (c)",
    weight: 2,
    action:
      "Mettez en place des sauvegardes dont une copie est isolée, testez une restauration, et activez le chiffrement des disques des ordinateurs portables.",
  },
  {
    id: "sec-breach",
    theme: "securite",
    label:
      "Disposez-vous d'une procédure de gestion des violations de données permettant de notifier la CNIL dans les 72 heures lorsque c'est requis, et d'informer les personnes en cas de risque élevé ?",
    help: "La notification est due sauf si la violation est peu susceptible d'engendrer un risque. Le délai de 72 heures court dès la prise de connaissance, y compris un week-end. Vos sous-traitants doivent vous alerter sans délai.",
    reference: "RGPD, art. 33 et 34",
    weight: 3,
    action:
      "Rédigez une procédure courte : qui alerter, comment qualifier le risque, qui notifie (téléservice de la CNIL), quand informer les personnes. Vérifiez l'obligation d'alerte dans vos contrats de sous-traitance.",
  },
  {
    id: "sec-breach-log",
    theme: "securite",
    label: "Tenez-vous un registre interne de toutes les violations, y compris celles qui n'ont pas été notifiées ?",
    help: "Toute violation doit être documentée (faits, effets, mesures prises), même lorsqu'elle ne nécessite pas de notification.",
    reference: "RGPD, art. 33(5)",
    weight: 2,
    action:
      "Ouvrez un registre des violations (date, nature, données et personnes concernées, évaluation du risque, décision de notifier ou non, mesures prises).",
  },

  // ── Conservation et traceurs ─────────────────────────────────────────────
  {
    id: "ret-defined",
    theme: "conservation",
    label:
      "Une durée de conservation, ou des critères pour la déterminer, est-elle définie pour chaque traitement ?",
    help: "Les données ne peuvent être conservées sans limite. La durée dépend de la finalité et, souvent, d'obligations légales (comptables, sociales, fiscales).",
    reference: "RGPD, art. 5(1)(e) ; CNIL, guide pratique « Les durées de conservation » et référentiels sectoriels",
    weight: 3,
    action:
      "Fixez pour chaque traitement une durée en base active et, le cas échéant, une durée d'archivage intermédiaire, en vous appuyant sur les référentiels de la CNIL, puis reportez-les au registre.",
  },
  {
    id: "ret-applied",
    theme: "conservation",
    label:
      "Ces durées sont-elles réellement appliquées (suppression, anonymisation ou archivage intermédiaire à accès restreint) ?",
    help: "Une durée inscrite au registre mais jamais appliquée reste un manquement. Les boîtes e-mail, les exports et les sauvegardes sont souvent oubliés.",
    reference: "RGPD, art. 5(1)(e)",
    weight: 2,
    action:
      "Programmez une purge périodique (automatique si l'outil le permet) et gardez une trace datée de chaque purge réalisée.",
  },
  {
    id: "cookie-inventory",
    theme: "conservation",
    label:
      "Tenez-vous un inventaire des traceurs (cookies, pixels, SDK) de vos sites et applications, avec leur finalité, leur émetteur et leur durée ?",
    help: "Hors traceurs strictement nécessaires ou exemptés, le dépôt suppose un consentement préalable. Sans inventaire, impossible d'informer correctement ni de paramétrer le bandeau.",
    reference: "Loi n° 78-17, art. 82 ; délibération CNIL n° 2020-091 (lignes directrices)",
    weight: 2,
    action:
      "Dressez l'inventaire (l'audit technique Konsent fournit une base observée), qualifiez chaque traceur et rapprochez-le de la liste affichée dans votre bandeau.",
  },
  {
    id: "cookie-change",
    theme: "conservation",
    label:
      "L'ajout d'un nouveau tag ou outil tiers sur le site est-il soumis à une validation préalable (mise à jour du bandeau et de la politique) ?",
    help: "Les écarts naissent souvent après la mise en conformité : un pixel publicitaire ajouté par une agence ou un module installé sans revue.",
    reference: "Loi n° 78-17, art. 82 ; RGPD, art. 25 (protection dès la conception)",
    weight: 2,
    action:
      "Instaurez une règle simple : aucun tag sans validation du référent, et une revue des traceurs après chaque mise en production.",
  },
  {
    id: "cookie-proof",
    theme: "conservation",
    label:
      "Êtes-vous en mesure de prouver le consentement recueilli (date, choix exprimé, version de l'interface) et de redemander le choix à intervalle raisonnable ?",
    help: "Le responsable doit pouvoir démontrer que la personne a consenti. La CNIL recommande de conserver le choix, y compris le refus, pendant une durée adaptée, en citant six mois comme bonne pratique.",
    reference: "RGPD, art. 7(1) ; délibération CNIL n° 2020-092 (recommandation)",
    weight: 2,
    action:
      "Vérifiez que votre outil de gestion du consentement journalise les choix et les versions du bandeau, et fixez la durée de validité du choix.",
  },
];

// ── Calcul ──────────────────────────────────────────────────────────────────

/** Part de la pratique attendue en place, selon la réponse. */
const ANSWER_VALUE: Record<Answer, number> = { yes: 1, partial: 0.5, no: 0, unknown: 0 };

/**
 * Gravité de l'écart. « Je ne sais pas » pèse un peu moins qu'un « Non »
 * certain, mais ne vaut aucun point : ne pas savoir est déjà un écart de
 * pilotage.
 */
const ANSWER_GRAVITY: Record<Answer, number> = { yes: 0, partial: 0.5, no: 1, unknown: 0.8 };

export type Priority = "haute" | "moyenne" | "basse";

export interface ThemeScore {
  theme: Theme;
  score: number;
  answered: number;
  total: number;
}

export interface ActionItem {
  question: Question;
  /** Réponse retenue (une question sans réponse est traitée comme « Je ne sais pas »). */
  answer: Answer;
  /** Réponse effectivement donnée, ou absente. */
  given: boolean;
  /** Poids × gravité, entre 0 et 3. */
  rank: number;
  priority: Priority;
  /** Action à mener, préfixée d'une vérification si la réponse est incertaine. */
  text: string;
}

export interface AssessmentResult {
  score: number;
  themes: ThemeScore[];
  actions: ActionItem[];
  answered: number;
  total: number;
}

function priorityOf(rank: number): Priority {
  if (rank >= 2.4) return "haute";
  if (rank >= 1.2) return "moyenne";
  return "basse";
}

function actionText(q: Question, answer: Answer): string {
  if (answer === "unknown") return `Vérifiez d'abord la situation réelle. ${q.action}`;
  if (answer === "partial") return `Complétez ce qui existe. ${q.action}`;
  return q.action;
}

/**
 * Score pondéré sur 100, global et par thème, et plan d'action trié par
 * priorité (poids × gravité). Fonction pure.
 *
 * Une question sans réponse est comptée comme « Je ne sais pas ».
 */
export function scoreAssessment(answers: Partial<Record<string, Answer>>): AssessmentResult {
  let earned = 0;
  let possible = 0;
  let answered = 0;
  const actions: ActionItem[] = [];

  const themes: ThemeScore[] = THEMES.map((theme) => {
    let tEarned = 0;
    let tPossible = 0;
    let tAnswered = 0;
    const qs = QUESTIONS.filter((q) => q.theme === theme.id);

    for (const q of qs) {
      const given = answers[q.id];
      const answer: Answer = given ?? "unknown";
      if (given) tAnswered += 1;
      tEarned += q.weight * ANSWER_VALUE[answer];
      tPossible += q.weight;

      const rank = q.weight * ANSWER_GRAVITY[answer];
      if (rank > 0) {
        actions.push({
          question: q,
          answer,
          given: Boolean(given),
          rank,
          priority: priorityOf(rank),
          text: actionText(q, answer),
        });
      }
    }

    earned += tEarned;
    possible += tPossible;
    answered += tAnswered;
    return {
      theme,
      score: tPossible ? Math.round((tEarned / tPossible) * 100) : 0,
      answered: tAnswered,
      total: qs.length,
    };
  });

  const order = new Map(QUESTIONS.map((q, i) => [q.id, i]));
  actions.sort(
    (a, b) =>
      b.rank - a.rank ||
      b.question.weight - a.question.weight ||
      (order.get(a.question.id) ?? 0) - (order.get(b.question.id) ?? 0),
  );

  return {
    score: possible ? Math.round((earned / possible) * 100) : 0,
    themes,
    actions,
    answered,
    total: QUESTIONS.length,
  };
}

/** Lettre et libellé, pour la jauge. Volontairement descriptifs, jamais « conforme ». */
export function maturityGrade(score: number): { grade: string; label: string } {
  if (score >= 90) return { grade: "A", label: "Pratiques déclarées avancées" };
  if (score >= 75) return { grade: "B", label: "Bonne base déclarée" };
  if (score >= 60) return { grade: "C", label: "Fondations partielles" };
  if (score >= 40) return { grade: "D", label: "Chantiers importants" };
  if (score >= 20) return { grade: "E", label: "Organisation à construire" };
  return { grade: "F", label: "Point de départ" };
}
