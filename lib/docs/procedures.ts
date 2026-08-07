import { EDITOR } from "../disclaimer";
import type { ScanResult } from "../engine/types";
import { TodoTracker, type GeneratedDoc } from "./types";

/**
 * D15 — Procédure de gestion des violations de données.
 *
 * Le délai de 72 heures court à compter de la prise de connaissance, pas de
 * la survenance. En pratique, ce sont les premières heures qui décident : une
 * procédure écrite à froid vaut infiniment mieux qu'une improvisation.
 */
export function generateBreachProcedure(scan: ScanResult): GeneratedDoc {
  const t = new TodoTracker();

  return {
    templateId: "D15",
    slug: "procedure-violation",
    title: "Procédure de gestion des violations de données",
    subtitle: scan.hostname,
    generatedAt: scan.scannedAt,
    todos: t.list(),
    footer: `Modèle généré par ${EDITOR.product}. Cette procédure doit être adaptée à votre organisation réelle, diffusée aux personnes concernées et testée. Un document non diffusé n'a jamais évité une violation. À faire valider par un professionnel du droit.`,
    sections: [
      {
        id: "definition",
        heading: "1. Ce qui constitue une violation",
        clauseRef: "RGPD, article 4(12)",
        body: [
          "Une violation est une atteinte à la sécurité entraînant, de manière accidentelle ou illicite, la destruction, la perte, l'altération, la divulgation ou l'accès non autorisé à des données personnelles.",
          "Trois formes, souvent mal identifiées :",
        ],
        bullets: [
          "Violation de confidentialité : des données ont été vues ou obtenues par quelqu'un qui n'y avait pas droit.",
          "Violation d'intégrité : des données ont été modifiées sans autorisation.",
          "Violation de disponibilité : des données ont été perdues ou rendues inaccessibles — un rançongiciel, mais aussi une sauvegarde défaillante.",
        ],
      },
      {
        id: "alerte",
        heading: "2. Donner l'alerte — immédiatement",
        clauseRef: "RGPD, article 33(1)",
        body: [
          `Toute personne constatant ou soupçonnant une violation alerte sans délai ${t.mark("nom et coordonnées du point de contact interne, joignable en dehors des heures de bureau")}.`,
          "Le doute suffit. Une alerte injustifiée ne coûte rien ; une alerte tardive fait courir le délai de 72 heures pendant qu'on hésite.",
          `Contact de secours : ${t.mark("second contact en cas d'indisponibilité du premier")}`,
        ],
      },
      {
        id: "qualification",
        heading: "3. Qualifier, dans les premières heures",
        clauseRef: "RGPD, articles 33 et 34",
        body: [
          "Le point de contact réunit les éléments suivants, même partiels — l'article 33(4) permet expressément une notification par phases :",
        ],
        bullets: [
          "Nature de la violation et catégories de données concernées.",
          "Nombre approximatif de personnes concernées et d'enregistrements.",
          "Date et heure de survenance, et date de prise de connaissance — c'est cette dernière qui fait courir le délai.",
          "Conséquences probables pour les personnes concernées.",
          "Mesures déjà prises ou envisagées pour y remédier et en atténuer les effets.",
        ],
      },
      {
        id: "decision",
        heading: "4. Décider s'il faut notifier",
        clauseRef: "RGPD, articles 33(1) et 34(1)",
        body: [
          "Deux décisions distinctes, à ne pas confondre :",
        ],
        bullets: [
          "Notification à la CNIL : obligatoire dans les 72 heures, sauf si la violation est peu susceptible d'engendrer un risque pour les droits et libertés. Si le délai est dépassé, la notification reste due, accompagnée des motifs du retard.",
          "Information des personnes concernées : obligatoire lorsque le risque est élevé. Elle peut être évitée si les données étaient chiffrées de façon robuste, ou si des mesures ultérieures ont écarté le risque élevé.",
          "Dans tous les cas, la violation doit être consignée dans le registre interne, même lorsqu'aucune notification n'est due.",
        ],
      },
      {
        id: "notification",
        heading: "5. Notifier",
        clauseRef: "RGPD, article 33(3)",
        body: [
          "La notification à la CNIL s'effectue en ligne sur cnil.fr. Elle comporte les éléments réunis à l'étape 3, ainsi que les coordonnées du point de contact.",
          "L'information des personnes concernées est rédigée en termes clairs et simples. Elle décrit la nature de la violation, ses conséquences probables, les mesures prises, et les recommandations pratiques — changer un mot de passe, surveiller ses relevés.",
          `Modèle de message aux personnes concernées : ${t.mark("message type validé, à préparer à froid")}`,
        ],
      },
      {
        id: "registre",
        heading: "6. Consigner",
        clauseRef: "RGPD, article 33(5)",
        body: [
          "Chaque violation est consignée dans un registre interne, qu'elle ait été notifiée ou non. Le registre doit permettre à l'autorité de contrôle de vérifier le respect de l'article 33.",
        ],
        table: {
          columns: [
            "Date de découverte",
            "Nature",
            "Données concernées",
            "Personnes touchées",
            "Notifié CNIL",
            "Personnes informées",
            "Mesures prises",
          ],
          rows: [["", "", "", "", "", "", ""]],
        },
      },
      {
        id: "apres",
        heading: "7. Après",
        body: [
          "Analyser la cause première, et pas seulement le symptôme. Corriger. Mettre à jour l'analyse de risque et, le cas échéant, l'analyse d'impact.",
          "Si la violation trouve son origine chez un sous-traitant, vérifier que celui-ci a respecté son obligation de vous alerter sans délai injustifié, et documenter cet échange.",
        ],
      },
    ],
  };
}

/**
 * D16 — Procédure d'exercice des droits.
 *
 * Le délai d'un mois est court quand la demande arrive un vendredi soir sur
 * une adresse générique que personne ne relève.
 */
export function generateRightsProcedure(scan: ScanResult): GeneratedDoc {
  const t = new TodoTracker();

  return {
    templateId: "D16",
    slug: "procedure-droits",
    title: "Procédure d'exercice des droits des personnes",
    subtitle: scan.hostname,
    generatedAt: scan.scannedAt,
    todos: t.list(),
    footer: `Modèle généré par ${EDITOR.product}. À adapter à votre organisation, puis à diffuser aux personnes susceptibles de recevoir une demande — accueil, support, commercial. Une procédure que seul le référent connaît ne sert à rien. À faire valider par un professionnel du droit.`,
    sections: [
      {
        id: "reception",
        heading: "1. Recevoir la demande",
        clauseRef: "RGPD, article 12(3)",
        body: [
          "Une demande peut arriver par n'importe quel canal : formulaire, courriel, courrier, téléphone, message sur un réseau social, ou oralement en agence. Aucune forme particulière ne peut être imposée.",
          `Toute demande est transmise sans délai à ${t.mark("point de contact chargé des demandes de droits")}, qui l'horodate et ouvre une entrée au registre.`,
          "Le délai d'un mois court à compter de la réception, pas de la transmission interne. Une demande qui dort trois semaines dans une boîte générique consomme le délai.",
        ],
      },
      {
        id: "identite",
        heading: "2. Vérifier l'identité — avec mesure",
        clauseRef: "RGPD, article 12(6)",
        body: [
          "La vérification n'est requise qu'en cas de doute raisonnable sur l'identité du demandeur. Réclamer systématiquement une pièce d'identité est une pratique excessive, régulièrement critiquée par la CNIL.",
          "Lorsque la demande émane d'une adresse déjà associée au compte, ou reprend des éléments que seul le titulaire peut connaître, le doute n'est en général pas raisonnable.",
        ],
      },
      {
        id: "qualification",
        heading: "3. Qualifier le droit invoqué",
        clauseRef: "RGPD, articles 15 à 22",
        body: [
          "Le demandeur n'emploie pas toujours les termes du règlement. « Supprimez-moi de vos fichiers » peut relever de l'effacement, de l'opposition à la prospection, ou des deux.",
        ],
        table: {
          columns: ["Droit", "Ce que la personne demande", "Points de vigilance"],
          rows: [
            [
              "Accès (art. 15)",
              "Savoir quelles données sont traitées et en obtenir copie",
              "Ne pas divulguer les données de tiers dans la copie fournie",
            ],
            [
              "Rectification (art. 16)",
              "Corriger une donnée inexacte",
              "Répercuter la correction chez les destinataires",
            ],
            [
              "Effacement (art. 17)",
              "Supprimer ses données",
              "Vérifier l'absence d'obligation légale de conservation (facturation, prescription)",
            ],
            [
              "Limitation (art. 18)",
              "Geler le traitement le temps d'une vérification",
              "Marquer les données plutôt que les supprimer",
            ],
            [
              "Opposition (art. 21)",
              "Ne plus être ciblé, notamment en prospection",
              "L'opposition à la prospection est absolue : aucune mise en balance",
            ],
            [
              "Portabilité (art. 20)",
              "Récupérer ses données dans un format réutilisable",
              "Ne concerne que les données fournies, traitées sur consentement ou contrat",
            ],
          ],
        },
      },
      {
        id: "delai",
        heading: "4. Répondre dans le délai",
        clauseRef: "RGPD, article 12(3) et (4)",
        body: [
          "Le délai est d'un mois à compter de la réception. Il peut être prolongé de deux mois pour les demandes complexes ou nombreuses, à condition d'en informer la personne dans le premier mois, en motivant.",
          "En cas de refus, la réponse doit être motivée et mentionner la possibilité de saisir la CNIL et de former un recours juridictionnel. Un silence n'est jamais une réponse acceptable.",
          "La réponse est gratuite. Des frais raisonnables ne peuvent être demandés qu'en cas de demandes manifestement infondées ou excessives, notamment répétitives — et la charge de le démontrer vous incombe.",
        ],
      },
      {
        id: "propagation",
        heading: "5. Répercuter",
        clauseRef: "RGPD, article 19",
        body: [
          "Toute rectification, tout effacement et toute limitation doivent être notifiés à chaque destinataire des données, sauf si cela s'avère impossible ou exige des efforts disproportionnés.",
          `Liste des destinataires à notifier : elle se déduit du registre des traitements${scan.vendors.length > 0 ? `, qui recense actuellement ${scan.vendors.length} service(s) tiers identifié(s) sur le site` : ""}.`,
        ],
      },
      {
        id: "registre",
        heading: "6. Tenir le registre des demandes",
        body: [
          "Un registre des demandes permet de démontrer le respect des délais — c'est la seule preuve exploitable en cas de contrôle ou de réclamation.",
        ],
        table: {
          columns: [
            "Date de réception",
            "Demandeur",
            "Droit invoqué",
            "Date de réponse",
            "Suite donnée",
            "Motif en cas de refus",
          ],
          rows: [["", "", "", "", "", ""]],
        },
      },
    ],
  };
}
