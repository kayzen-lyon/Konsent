import { EDITOR } from "../disclaimer";
import type { ScanResult } from "../engine/types";
import { TodoTracker, type DocSection, type GeneratedDoc } from "./types";

/**
 * Registres et documents de gouvernance (D09 à D14, D24).
 *
 * Ces gabarits ont un point commun qui les distingue des politiques publiques :
 * **ce sont des structures, pas des textes**. Un registre de violations n'a pas
 * à être bien rédigé, il a à contenir les bonnes colonnes et à être tenu. Ils
 * sont donc écrits comme des cadres à remplir, ce qui les rend aussi beaucoup
 * moins exposés à l'approximation qu'un contrat.
 *
 * La règle du §9.3 s'applique sans exception : aucune valeur n'est déduite.
 * Ce que le scan ne peut pas savoir apparaît en `[[À COMPLÉTER]]`, y compris
 * lorsque la valeur « évidente » serait juste neuf fois sur dix.
 */

const footer = (extra: string): string =>
  `Modèle généré par ${EDITOR.product}. ${extra} À faire valider par un professionnel du droit avant exploitation.`;

/**
 * D09 — Registre des activités de traitement, rôle de SOUS-TRAITANT.
 *
 * Distinct du D08, et régulièrement oublié : une agence, un éditeur de
 * logiciel ou un hébergeur traite des données POUR le compte d'autrui, et
 * l'article 30(2) lui impose son propre registre. Le contenu n'est pas le
 * même — on y décrit les responsables pour lesquels on agit, pas ses propres
 * finalités.
 */
export function generateProcessorRegistry(scan: ScanResult): GeneratedDoc {
  const t = new TodoTracker();

  // Les destinataires observés sont, du point de vue du sous-traitant, ses
  // propres SOUS-traitants ultérieurs — ceux dont l'article 28(2) impose
  // l'autorisation par le responsable de traitement.
  const subProcessors: DocSection["table"] = {
    columns: ["Sous-traitant ultérieur", "Entité contractante", "Juridiction effective", "Adéquation"],
    rows:
      scan.vendors.length > 0
        ? scan.vendors.map((v) => [v.name, v.entity, v.effectiveJurisdiction, v.adequacy])
        : [["Aucun destinataire tiers observé sur le site analysé", "—", "—", "—"]],
  };

  return {
    templateId: "D09",
    slug: "registre-sous-traitant",
    title: "Registre des activités de traitement — rôle de sous-traitant",
    subtitle: scan.hostname,
    generatedAt: scan.scannedAt,
    todos: t.list(),
    footer: footer(
      "Ce registre ne remplace pas celui de l'article 30(1) : une même organisation est souvent responsable pour ses propres traitements et sous-traitante pour ceux de ses clients. Les deux registres coexistent.",
    ),
    sections: [
      {
        id: "identite",
        heading: "1. Identité du sous-traitant",
        clauseRef: "RGPD, article 30(2)(a)",
        body: [
          `Sous-traitant : ${t.mark("raison sociale, forme juridique, SIREN")}`,
          `Coordonnées : ${t.mark("adresse postale du siège, téléphone, courriel de contact")}`,
          `Représentant dans l'Union, le cas échéant : ${t.mark("représentant au sens de l'article 27, si l'établissement est hors UE — sinon « sans objet »")}`,
          `Délégué à la protection des données : ${t.mark("nom et coordonnées du DPO, ou mention « aucun DPO désigné »")}`,
        ],
      },
      {
        id: "responsables",
        heading: "2. Responsables de traitement pour le compte desquels vous agissez",
        clauseRef: "RGPD, article 30(2)(a)",
        body: [
          "Une ligne par client. C'est la colonne que les contrôleurs lisent en premier, parce qu'elle dit l'étendue réelle de l'activité.",
        ],
        table: {
          columns: ["Client (responsable de traitement)", "Contrat de sous-traitance signé le", "Contact DPO du client"],
          rows: [[t.mark("liste de vos clients responsables de traitement"), "—", "—"]],
        },
      },
      {
        id: "categories",
        heading: "3. Catégories de traitements effectués",
        clauseRef: "RGPD, article 30(2)(b)",
        body: [
          "Décrivez ce que vous FAITES des données, pas la finalité poursuivie par votre client — celle-ci relève de son registre à lui.",
        ],
        table: {
          columns: ["Catégorie de traitement", "Client concerné", "Catégories de données", "Personnes concernées"],
          rows: [
            [
              t.mark("catégories de traitement effectuées pour le compte de vos clients"),
              "—",
              "—",
              "—",
            ],
          ],
        },
      },
      {
        id: "sous-traitance",
        heading: "4. Sous-traitants ultérieurs",
        clauseRef: "RGPD, article 28(2) et (4)",
        body: [
          "Tout recours à un sous-traitant ultérieur suppose l'autorisation écrite du responsable de traitement, et lui impose les mêmes obligations que celles qui vous lient.",
          "Les services ci-dessous ont été observés sur le site analysé. Ils constituent un point de départ, pas un inventaire complet : votre infrastructure interne — hébergement, sauvegarde, messagerie, outils de support — n'est pas visible depuis une page web.",
        ],
        table: subProcessors,
      },
      {
        id: "transferts",
        heading: "5. Transferts vers des pays tiers",
        clauseRef: "RGPD, article 30(2)(c)",
        body:
          scan.outsideEea.length > 0
            ? [
                `${scan.outsideEea.length} destinataire(s) observés relèvent d'une juridiction hors Espace économique européen : ${scan.outsideEea.map((v) => `${v.name} (${v.effectiveJurisdiction})`).join(", ")}.`,
                `Garanties invoquées pour chacun : ${t.mark("clauses contractuelles types, décision d'adéquation, ou autre garantie de l'article 46, service par service")}`,
              ]
            : [
                "Aucun transfert hors Espace économique européen n'a été observé sur le site analysé.",
                "Cette observation ne porte que sur les services appelés par la page. Vos outils internes doivent être examinés séparément.",
              ],
      },
      {
        id: "securite",
        heading: "6. Description générale des mesures de sécurité",
        clauseRef: "RGPD, articles 30(2)(d) et 32(1)",
        body: [
          "La description doit être générale mais réelle. Une liste de bonnes intentions non mises en œuvre est un aveu, pas une garantie.",
          `Mesures effectivement en place : ${t.mark("chiffrement, contrôle d'accès, journalisation, sauvegardes, cloisonnement des environnements — décrire ce qui existe, pas ce qui est prévu")}`,
        ],
      },
      {
        id: "tenue",
        heading: "7. Tenue du registre",
        clauseRef: "RGPD, article 30(4)",
        body: [
          "Le registre est tenu par écrit, y compris sous forme électronique, et mis à disposition de l'autorité de contrôle sur demande.",
          `Responsable de sa mise à jour : ${t.mark("personne chargée de tenir ce registre")}`,
          `Dernière revue : ${t.mark("date de la dernière revue, à renouveler au moins annuellement")}`,
        ],
      },
    ],
  };
}

/**
 * D10 — Registre des violations de données.
 *
 * L'article 33(5) impose de documenter TOUTE violation, y compris celles qui
 * ne sont pas notifiées. C'est le point le plus souvent manqué : on croit
 * qu'un incident sans risque n'a pas à être écrit, alors que c'est justement
 * cette trace qui permettra de démontrer que l'analyse a été faite.
 */
export function generateBreachRegistry(scan: ScanResult): GeneratedDoc {
  const t = new TodoTracker();

  return {
    templateId: "D10",
    slug: "registre-violations",
    title: "Registre des violations de données",
    subtitle: scan.hostname,
    generatedAt: scan.scannedAt,
    todos: t.list(),
    footer: footer(
      "Ce registre se tient même lorsqu'aucune violation n'est survenue : un registre vide et daté prouve que le dispositif existe.",
    ),
    sections: [
      {
        id: "principe",
        heading: "1. Ce qui doit y figurer",
        clauseRef: "RGPD, article 33(5)",
        body: [
          "Toute violation est consignée, y compris celle qui n'a pas été notifiée à la CNIL. L'article 33(5) est explicite : la documentation permet à l'autorité de vérifier le respect de l'article 33 — donc aussi la décision de NE PAS notifier.",
          "Une violation absente du registre au motif qu'elle paraissait bénigne est, du point de vue d'un contrôle, une violation dissimulée.",
        ],
      },
      {
        id: "colonnes",
        heading: "2. Structure du registre",
        clauseRef: "RGPD, article 33(5)",
        body: ["Une ligne par violation. Les colonnes ci-dessous couvrent les exigences de l'article 33(3) et (5)."],
        table: {
          columns: [
            "Réf.",
            "Date de survenance",
            "Date de prise de connaissance",
            "Nature (confidentialité / intégrité / disponibilité)",
            "Catégories et nombre approximatif de personnes",
            "Catégories et nombre approximatif d'enregistrements",
            "Conséquences probables",
            "Mesures prises",
            "Notification CNIL (oui / non + motif)",
            "Information des personnes (oui / non + motif)",
          ],
          rows: [["—", "—", "—", "—", "—", "—", "—", "—", "—", "—"]],
        },
      },
      {
        id: "delai",
        heading: "3. Le délai, et d'où il part",
        clauseRef: "RGPD, article 33(1)",
        body: [
          "Les 72 heures courent à compter de la PRISE DE CONNAISSANCE, pas de la survenance. D'où deux colonnes distinctes : les confondre fait perdre le seul repère qui compte en cas de contrôle.",
          "Au-delà du délai, la notification reste due et doit être accompagnée des motifs du retard. Une notification tardive vaut mieux qu'une absence de notification.",
        ],
      },
      {
        id: "motifs",
        heading: "4. Motiver une non-notification",
        clauseRef: "RGPD, articles 33(1) et 34(3)",
        body: [
          "Lorsque la violation est jugée peu susceptible d'engendrer un risque, le motif est écrit dans le registre — pas seulement pensé. Quelques formulations qui tiennent :",
        ],
        bullets: [
          "Données chiffrées par un procédé conforme à l'état de l'art, clés non compromises.",
          "Périmètre strictement interne, sans exfiltration constatée par les journaux.",
          "Données pseudonymisées sans que la table de correspondance ait été atteinte.",
          "Mesures ultérieures ayant écarté le risque élevé avant toute exploitation possible.",
        ],
      },
      {
        id: "tenue",
        heading: "5. Tenue et conservation",
        body: [
          `Responsable de la tenue : ${t.mark("personne chargée de consigner les violations")}`,
          `Emplacement du registre : ${t.mark("où le registre est conservé, et qui y a accès")}`,
          "Le registre se conserve aussi longtemps qu'il peut être utile à la démonstration de conformité. Une durée trop courte prive de preuve ; une conservation indéfinie contredit l'article 5(1)(e).",
          `Durée de conservation retenue : ${t.mark("durée de conservation des entrées du registre, et sa justification")}`,
        ],
      },
    ],
  };
}

/**
 * D11 — Registre des demandes d'exercice de droits.
 *
 * Sa vraie fonction est probatoire : sans trace, une organisation ne peut pas
 * démontrer qu'elle a répondu dans le délai d'un mois, et c'est la parole du
 * demandeur qui l'emporte.
 */
export function generateRightsRegistry(scan: ScanResult): GeneratedDoc {
  const t = new TodoTracker();

  return {
    templateId: "D11",
    slug: "registre-demandes",
    title: "Registre des demandes d'exercice de droits",
    subtitle: scan.hostname,
    generatedAt: scan.scannedAt,
    todos: t.list(),
    footer: footer(
      "Ce registre sert d'abord à vous : sans trace de la date de réception et de la date de réponse, le respect du délai d'un mois ne se démontre pas.",
    ),
    sections: [
      {
        id: "colonnes",
        heading: "1. Structure du registre",
        clauseRef: "RGPD, articles 12(3) et 15 à 22",
        body: ["Une ligne par demande, quel que soit le canal par lequel elle arrive."],
        table: {
          columns: [
            "Réf.",
            "Date de réception",
            "Canal (courriel, courrier, formulaire, oral)",
            "Droit invoqué",
            "Identité vérifiée le",
            "Date limite de réponse",
            "Date de réponse",
            "Suite donnée (accordée / refusée / partielle)",
            "Motif en cas de refus",
          ],
          rows: [["—", "—", "—", "—", "—", "—", "—", "—", "—"]],
        },
      },
      {
        id: "delais",
        heading: "2. Les délais",
        clauseRef: "RGPD, article 12(3) et (4)",
        body: [
          "Un mois à compter de la réception. Prolongeable de deux mois en raison de la complexité ou du nombre de demandes, à condition d'informer la personne dans le mois initial et de motiver la prolongation.",
          "En cas de refus, la personne est informée dans le même délai d'un mois, avec les motifs, la possibilité de saisir la CNIL et celle d'exercer un recours juridictionnel.",
          "Le silence n'est pas une réponse : c'est un manquement documenté par l'absence même de ligne dans ce registre.",
        ],
      },
      {
        id: "identite",
        heading: "3. Vérification de l'identité",
        clauseRef: "RGPD, article 12(6)",
        body: [
          "L'identité ne se vérifie que s'il existe un doute raisonnable. Exiger systématiquement une pièce d'identité est une pratique que la CNIL considère comme excessive, et elle allonge le délai sans justification.",
          "Lorsque la vérification est justifiée, le délai est suspendu jusqu'à réception des éléments — d'où la colonne dédiée.",
          "Les pièces d'identité éventuellement reçues sont supprimées dès la vérification faite. Les conserver crée un risque sans contrepartie.",
        ],
      },
      {
        id: "canaux",
        heading: "4. Canaux de réception",
        clauseRef: "RGPD, article 12(1)",
        body: [
          "Une demande est valable quel que soit le canal, y compris orale, et même si elle ne cite aucun article. Une demande adressée au service commercial ou au support engage l'organisation autant qu'une demande envoyée au DPO.",
          `Canaux surveillés et personnes chargées de les relever : ${t.mark("adresses et canaux par lesquels une demande peut arriver, et qui les relève")}`,
        ],
      },
      {
        id: "tenue",
        heading: "5. Tenue et conservation",
        body: [
          `Responsable de la tenue : ${t.mark("personne chargée de tenir ce registre")}`,
          `Durée de conservation des entrées : ${t.mark("durée retenue, en tenant compte du délai de prescription applicable")}`,
        ],
      },
    ],
  };
}

/**
 * D12 — Registre des consentements : spécification technique.
 *
 * Ce document n'est pas un registre à remplir mais une SPÉCIFICATION de ce
 * qu'il faut conserver pour pouvoir démontrer un consentement. L'article 7(1)
 * fait peser la charge de la preuve sur le responsable de traitement : sans
 * ces éléments, un consentement recueilli est juridiquement inexistant.
 */
export function generateConsentRegistry(scan: ScanResult): GeneratedDoc {
  const t = new TodoTracker();
  const cmp = scan.observation.cmp;

  return {
    templateId: "D12",
    slug: "registre-consentements",
    title: "Registre des consentements — spécification technique",
    subtitle: scan.hostname,
    generatedAt: scan.scannedAt,
    todos: t.list(),
    footer: footer(
      "Ce document décrit ce qu'il faut journaliser. Sa mise en œuvre relève de votre équipe technique ou de votre éditeur de plateforme de consentement.",
    ),
    sections: [
      {
        id: "charge",
        heading: "1. La charge de la preuve",
        clauseRef: "RGPD, article 7(1)",
        body: [
          "Le responsable de traitement doit être en mesure de démontrer que la personne a consenti. Ce n'est pas à elle de prouver qu'elle n'a pas consenti.",
          "En pratique, un consentement dont on ne peut restituer ni la date, ni la version de l'information affichée, ni le choix exact enregistré, ne se démontre pas — donc n'existe pas.",
        ],
      },
      {
        id: "observe",
        heading: "2. Ce que l'analyse a observé",
        body: cmp.detected
          ? [
              `Un mécanisme de recueil du consentement a été identifié : ${cmp.name ?? "plateforme non nommée"}, détecté par ${
                cmp.method === "api_signature"
                  ? "signature d'interface (fiabilité élevée)"
                  : cmp.method === "selector"
                    ? "sélecteur connu (fiabilité moyenne)"
                    : "heuristique générique (fiabilité faible)"
              }.`,
              "La présence d'une plateforme ne dit rien de ce qu'elle journalise. Vérifiez auprès de votre éditeur que les éléments de la section suivante sont bien conservés et exportables.",
            ]
          : [
              "Aucun mécanisme de recueil du consentement n'a été identifié lors de l'analyse.",
              "Cela ne signifie pas qu'il n'y en a pas — il peut être chargé dynamiquement. Mais si aucun mécanisme n'existe, aucun consentement n'est recueilli, et ce registre n'a rien à consigner : c'est le dépôt de traceurs lui-même qui pose alors question.",
            ],
      },
      {
        id: "champs",
        heading: "3. Éléments à journaliser, par événement de consentement",
        clauseRef: "RGPD, articles 7(1) et 4(11)",
        body: [
          "Un enregistrement par action de l'utilisateur — acceptation, refus, modification, retrait. Le retrait se journalise comme le consentement : c'est lui qu'on cherchera à démontrer en cas de litige.",
        ],
        table: {
          columns: ["Champ", "Pourquoi il est nécessaire"],
          rows: [
            ["Identifiant de l'événement", "Référence unique, citable dans une réponse à la CNIL."],
            [
              "Identifiant pseudonyme du visiteur",
              "Rattache l'événement sans conserver d'identité directe. Ne doit pas être l'adresse IP en clair.",
            ],
            ["Horodatage", "Date et heure, avec fuseau. Le moment du recueil décide de la version applicable."],
            [
              "Choix exact, finalité par finalité",
              "Un consentement global ne démontre rien : l'article 4(11) exige qu'il soit spécifique.",
            ],
            [
              "Version du texte d'information affiché",
              "Sans elle, impossible de savoir à quoi la personne a consenti. C'est le champ le plus souvent absent.",
            ],
            [
              "Version de la liste des destinataires",
              "Un destinataire ajouté après coup n'est pas couvert par un consentement antérieur.",
            ],
            ["Méthode de recueil", "Bandeau, centre de préférences, formulaire. Le contexte fait partie de la preuve."],
            [
              "Chaîne TCF, le cas échéant",
              "Si vous utilisez le cadre TCF, la chaîne consentie est la pièce probante la plus directe.",
            ],
            ["Durée de validité retenue", "La CNIL recommande de ne pas dépasser six mois pour un refus."],
          ],
        },
      },
      {
        id: "interdits",
        heading: "4. Ce qu'il ne faut PAS journaliser",
        clauseRef: "RGPD, article 5(1)(c)",
        body: [
          "Un registre de consentements est un fichier de données personnelles comme un autre. Le sur-collecter transforme une mesure de conformité en risque.",
        ],
        bullets: [
          "Adresse IP complète en clair : tronquez ou hachez avec un sel.",
          "Empreinte de navigateur : constituer un identifiant stable pour prouver un consentement revient à faire ce que le consentement était censé encadrer.",
          "Contenu de formulaire, panier, ou toute donnée sans rapport avec l'acte de consentir.",
        ],
      },
      {
        id: "exploitation",
        heading: "5. Restitution et conservation",
        body: [
          "Le registre doit être interrogeable : retrouver l'ensemble des événements liés à un identifiant, et restituer l'état du consentement à une date donnée.",
          `Durée de conservation des preuves : ${t.mark("durée retenue, à justifier — la CNIL admet une conservation le temps nécessaire à la preuve, généralement alignée sur la prescription applicable")}`,
          `Responsable de l'export en cas de contrôle : ${t.mark("personne capable de produire un export en moins de 72 heures")}`,
        ],
      },
    ],
  };
}

/**
 * D14 — Politique de sécurité des systèmes d'information, socle.
 *
 * Le seul document de cette série que le scan alimente réellement : les
 * en-têtes de sécurité observés sont des mesures de l'article 32 constatables
 * de l'extérieur. Le reste relève de l'organisation et n'est pas devinable.
 */
export function generateSecurityPolicy(scan: ScanResult): GeneratedDoc {
  const t = new TodoTracker();
  const h = scan.observation.headers;

  const state = (value: string | null, absent: string) =>
    value ? `en place — \`${value.length > 90 ? `${value.slice(0, 90)}…` : value}\`` : absent;

  return {
    templateId: "D14",
    slug: "pssi",
    title: "Politique de sécurité des systèmes d'information — socle",
    subtitle: scan.hostname,
    generatedAt: scan.scannedAt,
    todos: t.list(),
    footer: footer(
      "Ce socle couvre ce qu'une analyse externe peut constater et les mesures organisationnelles minimales. Il ne remplace pas une analyse de risques conduite sur votre système d'information réel.",
    ),
    sections: [
      {
        id: "objet",
        heading: "1. Objet et portée",
        clauseRef: "RGPD, article 32(1)",
        body: [
          "L'article 32 impose des mesures techniques et organisationnelles appropriées au risque, compte tenu de l'état de l'art et des coûts. « Approprié » suppose un raisonnement documenté, pas une liste standard.",
          `Périmètre couvert : ${t.mark("systèmes, applications et environnements couverts par cette politique")}`,
          `Responsable de son application : ${t.mark("personne responsable de la sécurité du système d'information")}`,
        ],
      },
      {
        id: "constate",
        heading: "2. Mesures constatées sur le site analysé",
        clauseRef: "RGPD, article 32(1)(b)",
        body: [
          "Les éléments ci-dessous ont été observés par analyse externe le jour du scan. Ils constituent des faits, pas une évaluation de votre sécurité globale.",
        ],
        table: {
          columns: ["Mesure", "État constaté", "Ce qu'elle protège"],
          rows: [
            [
              "Transport strictement chiffré (HSTS)",
              state(h.hsts, "absente"),
              "Empêche une rétrogradation vers HTTP, donc l'interception de session.",
            ],
            [
              "Politique de sécurité de contenu (CSP)",
              state(h.csp, "absente"),
              "Limite les scripts exécutables, donc la portée d'une injection.",
            ],
            [
              "Politique de référent",
              state(h.referrerPolicy, "absente ou permissive"),
              "Évite de transmettre l'adresse complète des pages consultées aux tiers.",
            ],
            [
              "Politique de permissions",
              state(h.permissionsPolicy, "absente"),
              "Restreint l'accès des scripts tiers à la caméra, au micro, à la position.",
            ],
            [
              "Typage strict des réponses",
              state(h.xContentTypeOptions, "absent"),
              "Empêche l'interprétation d'un fichier comme un script.",
            ],
          ],
        },
      },
      {
        id: "acces",
        heading: "3. Contrôle des accès",
        clauseRef: "RGPD, article 32(1)(b) et (4)",
        body: [
          "Le principe est celui du moindre privilège : chacun n'accède qu'à ce dont sa fonction a besoin, et cet accès cesse avec la fonction.",
          `Politique d'authentification : ${t.mark("exigences de mot de passe, second facteur, gestion des comptes à privilèges")}`,
          `Revue des habilitations : ${t.mark("périodicité de la revue des accès et personne qui la conduit")}`,
          `Procédure de départ : ${t.mark("délai de révocation des accès au départ d'une personne — un accès non révoqué est la cause la plus banale d'incident")}`,
        ],
      },
      {
        id: "journalisation",
        heading: "4. Journalisation",
        clauseRef: "RGPD, article 32(1)(b) · délibération CNIL n° 2021-122",
        body: [
          "Sans journaux, une violation ne se détecte pas, ne se qualifie pas et ne se notifie pas dans les délais.",
          `Événements journalisés : ${t.mark("accès aux données, actions d'administration, échecs d'authentification")}`,
          `Durée de conservation des journaux : ${t.mark("durée retenue — la CNIL recommande six mois pour les journaux de sécurité courants")}`,
          "Les journaux contiennent des données personnelles : ils relèvent eux-mêmes du registre des traitements.",
        ],
      },
      {
        id: "sauvegardes",
        heading: "5. Sauvegardes et continuité",
        clauseRef: "RGPD, article 32(1)(c)",
        body: [
          "La disponibilité est l'une des trois formes de violation. Une sauvegarde jamais restaurée n'est pas une sauvegarde.",
          `Fréquence et rétention : ${t.mark("fréquence des sauvegardes et durée de conservation")}`,
          `Dernier test de restauration : ${t.mark("date du dernier test de restauration effectivement réalisé")}`,
        ],
      },
      {
        id: "sous-traitants",
        heading: "6. Sécurité de la chaîne de sous-traitance",
        clauseRef: "RGPD, articles 28(1) et 32(1)",
        body:
          scan.vendors.length > 0
            ? [
                `${scan.vendors.length} service(s) tiers ont été observés sur le site. Chacun doit présenter des garanties suffisantes, appréciées avant l'engagement et non après l'incident.`,
                `Éléments obtenus de chaque prestataire : ${t.mark("certifications, rapports d'audit, engagements contractuels de sécurité")}`,
              ]
            : [
                "Aucun service tiers n'a été observé sur la page analysée. Vos prestataires internes — hébergement, sauvegarde, messagerie — restent à examiner.",
              ],
      },
      {
        id: "revue",
        heading: "7. Revue",
        clauseRef: "RGPD, article 32(1)(d)",
        body: [
          "L'article 32 impose une procédure de test et d'évaluation régulière de l'efficacité des mesures. Une politique jamais revue devient un document de façade.",
          `Périodicité de la revue : ${t.mark("périodicité retenue et personne qui la conduit")}`,
        ],
      },
    ],
  };
}

/**
 * D24 — Lettre de désignation du délégué à la protection des données.
 *
 * Court, et pourtant régulièrement mal fait : la désignation n'existe
 * juridiquement qu'une fois communiquée à la CNIL, et les garanties
 * d'indépendance de l'article 38 doivent y figurer, faute de quoi la
 * désignation est formelle mais inopérante.
 */
export function generateDpoDesignation(scan: ScanResult): GeneratedDoc {
  const t = new TodoTracker();

  return {
    templateId: "D24",
    slug: "designation-dpo",
    title: "Lettre de désignation du délégué à la protection des données",
    subtitle: scan.hostname,
    generatedAt: scan.scannedAt,
    todos: t.list(),
    footer: footer(
      "La désignation doit être communiquée à la CNIL par le téléservice dédié, et les coordonnées du délégué publiées. Une désignation non communiquée ne produit pas d'effet.",
    ),
    sections: [
      {
        id: "parties",
        heading: "1. Parties",
        clauseRef: "RGPD, article 37",
        body: [
          `Organisme : ${t.mark("raison sociale, SIREN, adresse du siège")}`,
          `Représenté par : ${t.mark("nom et qualité du signataire")}`,
          `Délégué désigné : ${t.mark("nom, prénom, fonction ou raison sociale si le délégué est externe")}`,
          `Coordonnées du délégué : ${t.mark("adresse électronique et téléphone dédiés, distincts de ceux du signataire")}`,
          `Date d'effet : ${t.mark("date de prise de fonction")}`,
        ],
      },
      {
        id: "nature",
        heading: "2. Caractère de la désignation",
        clauseRef: "RGPD, articles 37(1) et 37(6)",
        body: [
          `Nature : ${t.mark("désignation obligatoire au titre de l'article 37(1), ou volontaire — préciser laquelle")}`,
          "La distinction n'est pas cosmétique : un délégué désigné volontairement est soumis aux mêmes articles 37 à 39 qu'un délégué obligatoire. On ne peut pas se prévaloir d'un délégué sans lui en donner les moyens.",
          `Modalité : ${t.mark("délégué interne (salarié) ou externe (prestataire, sur la base d'un contrat de service)")}`,
        ],
      },
      {
        id: "missions",
        heading: "3. Missions confiées",
        clauseRef: "RGPD, article 39(1)",
        body: ["Les missions ci-dessous sont celles que le règlement attribue au délégué. Elles ne sont pas négociables à la baisse."],
        bullets: [
          "Informer et conseiller l'organisme et ses employés sur leurs obligations.",
          "Contrôler le respect du règlement et des règles internes, y compris la répartition des responsabilités et la sensibilisation du personnel.",
          "Dispenser des conseils sur l'analyse d'impact et en vérifier l'exécution.",
          "Coopérer avec l'autorité de contrôle et faire office de point de contact pour elle.",
          "Être le point de contact des personnes concernées pour toute question relative à leurs droits.",
        ],
      },
      {
        id: "moyens",
        heading: "4. Moyens et garanties d'indépendance",
        clauseRef: "RGPD, article 38",
        body: [
          "C'est la section qui distingue une désignation réelle d'une désignation de façade. L'article 38 impose quatre garanties, et leur absence a déjà motivé des sanctions.",
        ],
        bullets: [
          "Association en temps utile à toute question relative aux données personnelles.",
          "Ressources nécessaires : temps dédié, budget, accès aux données et aux traitements, formation continue.",
          "Absence d'instruction sur l'exercice des missions : le délégué ne reçoit d'ordre de personne sur la manière de les remplir.",
          "Absence de sanction ou de relèvement de fonctions pour l'exercice de ses missions. Il rend directement compte au niveau le plus élevé de la direction.",
        ],
      },
      {
        id: "conflits",
        heading: "5. Absence de conflit d'intérêts",
        clauseRef: "RGPD, article 38(6)",
        body: [
          "Le délégué peut exercer d'autres fonctions, à condition qu'elles n'entraînent pas de conflit d'intérêts. Une fonction qui décide des finalités et des moyens d'un traitement en crée un par nature — direction générale, direction informatique, direction marketing, direction des ressources humaines.",
          `Autres fonctions exercées : ${t.mark("autres fonctions du délégué, et pourquoi elles ne créent pas de conflit d'intérêts")}`,
        ],
      },
      {
        id: "publicite",
        heading: "6. Publicité de la désignation",
        clauseRef: "RGPD, article 37(7)",
        body: [
          "Deux obligations distinctes, souvent réduites à une seule :",
        ],
        bullets: [
          "Publier les coordonnées du délégué — typiquement dans la politique de confidentialité.",
          "Les communiquer à la CNIL par le téléservice de désignation. Tant que cette communication n'a pas eu lieu, la désignation n'est pas opposable.",
        ],
      },
      {
        id: "signatures",
        heading: "7. Signatures",
        body: [
          `Fait à ${t.mark("lieu")}, le ${t.mark("date de signature")}`,
          "Pour l'organisme — nom, qualité, signature.",
          "Le délégué désigné, qui accepte la mission — nom, signature.",
        ],
      },
    ],
  };
}
