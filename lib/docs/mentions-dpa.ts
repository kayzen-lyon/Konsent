import { EDITOR } from "../disclaimer";
import type { ScanResult } from "../engine/types";
import { TodoTracker, type GeneratedDoc } from "./types";

/**
 * D03 — Mentions légales (LCEN, art. 6-III).
 *
 * Obligation distincte du RGPD, souvent négligée, et sanctionnable pour
 * elle-même. Le scan renseigne ce qu'il peut déduire : le nom de domaine et
 * l'hébergeur lorsqu'il est identifiable.
 */
export function generateLegalNotice(scan: ScanResult): GeneratedDoc {
  const t = new TodoTracker();

  // L'hébergeur se devine parfois depuis les en-têtes ou les destinataires.
  const cdn = scan.vendors.find((v) => v.categories.includes("cdn"));

  return {
    templateId: "D03",
    slug: "mentions-legales",
    title: "Mentions légales",
    subtitle: scan.hostname,
    generatedAt: scan.scannedAt,
    todos: t.list(),
    footer: `Modèle généré par ${EDITOR.product} le ${new Date(scan.scannedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })}. Les mentions légales relèvent de la loi pour la confiance dans l'économie numérique, distincte du RGPD : leur absence est sanctionnable pour elle-même. À compléter, puis à faire valider par un professionnel du droit avant publication.`,
    sections: [
      {
        id: "editeur",
        heading: "1. Éditeur du site",
        clauseRef: "LCEN, article 6-III, 1° a) et b)",
        body: [
          `Le site ${scan.hostname} est édité par :`,
          `${t.mark("dénomination sociale ou nom et prénom si personne physique")}`,
          `${t.mark("forme juridique et montant du capital social")}`,
          `Siège social : ${t.mark("adresse complète du siège")}`,
          `Téléphone : ${t.mark("numéro de téléphone")}`,
          `Courriel : ${t.mark("adresse de contact")}`,
          `Immatriculation : ${t.mark("numéro RCS et ville du greffe")}`,
          `Numéro de TVA intracommunautaire : ${t.mark("numéro de TVA, ou mention de la franchise en base")}`,
        ],
      },
      {
        id: "publication",
        heading: "2. Directeur de la publication",
        clauseRef: "LCEN, article 6-III, 1° c)",
        body: [
          `${t.mark("nom et prénom du directeur de la publication")}`,
          "Le directeur de la publication est en principe le représentant légal de la personne morale éditrice.",
        ],
      },
      {
        id: "hebergeur",
        heading: "3. Hébergeur",
        clauseRef: "LCEN, article 6-III, 1° d)",
        body: [
          cdn
            ? `L'analyse technique a identifié ${cdn.name} (${cdn.entity}) parmi les services d'infrastructure de ce site. Attention : un réseau de diffusion de contenu n'est pas nécessairement l'hébergeur au sens de la loi. Vérifiez qui héberge réellement vos fichiers.`
            : "L'analyse technique n'a pas permis d'identifier l'hébergeur avec certitude.",
          `Dénomination : ${t.mark("dénomination sociale de l'hébergeur")}`,
          `Adresse : ${t.mark("adresse de l'hébergeur")}`,
          `Téléphone : ${t.mark("téléphone de l'hébergeur")}`,
        ],
      },
      {
        id: "activite",
        heading: "4. Activité réglementée",
        clauseRef: "LCEN, article 6-III, 1° e) et f)",
        body: [
          "Si votre activité est soumise à un régime d'autorisation ou relève d'une profession réglementée, les mentions suivantes sont obligatoires :",
        ],
        bullets: [
          `Autorité ayant délivré l'autorisation : ${t.mark("autorité compétente, si applicable")}`,
          `Ordre professionnel de rattachement : ${t.mark("ordre professionnel, si applicable")}`,
          `Titre professionnel et État l'ayant délivré : ${t.mark("titre professionnel, si applicable")}`,
          "Si aucune de ces mentions ne vous concerne, supprimez cette section.",
        ],
      },
      {
        id: "propriete",
        heading: "5. Propriété intellectuelle",
        body: [
          "L'ensemble des contenus de ce site — textes, images, graphismes, logo, icônes, architecture — est protégé au titre du droit d'auteur et, le cas échéant, du droit des marques.",
          "Toute reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable, est interdite.",
        ],
      },
      {
        id: "donnees",
        heading: "6. Données personnelles et cookies",
        clauseRef: "RGPD · Article 82 de la loi n° 78-17",
        body: [
          "Le traitement de vos données personnelles est décrit dans notre politique de confidentialité.",
          "Les traceurs déposés lors de votre navigation sont détaillés dans notre politique de gestion des cookies.",
          `${t.mark("liens vers ces deux pages")}`,
        ],
      },
      {
        id: "mediation",
        heading: "7. Médiation de la consommation",
        body: [
          "Si vous vendez à des consommateurs, vous devez indiquer les coordonnées du médiateur de la consommation dont vous relevez.",
          `${t.mark("nom et coordonnées du médiateur, si vous vendez à des consommateurs — sinon supprimer cette section")}`,
        ],
      },
    ],
  };
}

/**
 * D19 — Contrat de sous-traitance (RGPD, art. 28(3)).
 *
 * Généré avec la liste des destinataires réellement observés : c'est cette
 * liste qui détermine avec qui un contrat doit exister, et c'est
 * précisément celle que les organismes n'ont jamais sous la main.
 */
export function generateDpa(scan: ScanResult): GeneratedDoc {
  const t = new TodoTracker();
  const processors = scan.vendors.filter((v) => !v.categories.includes("cmp"));
  const outsideEea = processors.filter((v) => v.adequacy !== "EEA");

  return {
    templateId: "D19",
    slug: "contrat-sous-traitance",
    title: "Contrat de sous-traitance",
    subtitle: `${scan.hostname} — clauses de l'article 28 du RGPD`,
    generatedAt: scan.scannedAt,
    todos: t.list(),
    footer: `Modèle généré par ${EDITOR.product}. Un contrat de sous-traitance engage juridiquement les deux parties : ce modèle doit impérativement être relu et adapté par un professionnel du droit avant signature. Beaucoup de grands fournisseurs imposent leur propre contrat — dans ce cas, ce document sert de grille de contrôle plutôt que de contrat à signer.`,
    sections: [
      {
        id: "parties",
        heading: "1. Parties",
        body: [
          `Le responsable de traitement : ${t.mark("dénomination, SIREN et adresse du responsable de traitement")}`,
          `Le sous-traitant : ${t.mark("dénomination, immatriculation et adresse du sous-traitant")}`,
          `Date de prise d'effet : ${t.mark("date d'entrée en vigueur")}`,
        ],
      },
      {
        id: "objet",
        heading: "2. Objet et description du traitement",
        clauseRef: "RGPD, article 28(3), phrase introductive",
        body: [
          "Le contrat doit décrire précisément le traitement confié. Une description vague prive la clause de son effet.",
        ],
        bullets: [
          `Nature et finalité du traitement : ${t.mark("nature et finalité du traitement confié")}`,
          `Durée du traitement : ${t.mark("durée du traitement")}`,
          `Catégories de personnes concernées : ${t.mark("catégories de personnes concernées")}`,
          `Types de données traitées : ${t.mark("types de données traitées")}`,
        ],
      },
      {
        id: "obligations",
        heading: "3. Obligations du sous-traitant",
        clauseRef: "RGPD, article 28(3)(a) à (h)",
        body: ["Le sous-traitant s'engage à :"],
        bullets: [
          "Ne traiter les données que sur instruction documentée du responsable, y compris pour les transferts hors Union européenne.",
          "Veiller à ce que les personnes autorisées à traiter les données soient soumises à une obligation de confidentialité.",
          "Mettre en œuvre les mesures de sécurité requises par l'article 32.",
          "Ne pas recruter de sous-traitant ultérieur sans autorisation écrite préalable, générale ou spécifique, et informer le responsable de tout changement.",
          "Aider le responsable à répondre aux demandes d'exercice des droits, par des mesures techniques et organisationnelles appropriées.",
          "Aider le responsable à respecter ses obligations de sécurité, de notification des violations et d'analyse d'impact.",
          "Selon le choix du responsable, supprimer ou renvoyer toutes les données à la fin de la prestation, et détruire les copies existantes.",
          "Mettre à disposition toutes les informations nécessaires pour démontrer le respect de l'article 28, et permettre la réalisation d'audits.",
        ],
      },
      {
        id: "violation",
        heading: "4. Notification des violations",
        clauseRef: "RGPD, articles 28(3)(f) et 33(2)",
        body: [
          `Le sous-traitant notifie au responsable toute violation de données sans délai injustifié après en avoir pris connaissance, et au plus tard dans un délai de ${t.mark("délai contractuel de notification — 24 ou 48 heures recommandées")} suivant la découverte.`,
          "La notification comporte les éléments permettant au responsable de respecter sa propre obligation de notification dans les 72 heures. Un délai contractuel plus long que 24 heures rend en pratique ce respect difficile.",
        ],
      },
      {
        id: "transferts",
        heading: "5. Transferts hors Union européenne",
        clauseRef: "RGPD, articles 44 à 49",
        body:
          outsideEea.length > 0
            ? [
                `L'analyse technique de ${scan.hostname} a identifié ${outsideEea.length} destinataire(s) relevant d'une juridiction hors Espace économique européen. Pour chacun, l'encadrement du transfert doit être documenté.`,
                `Garanties retenues : ${t.mark("garanties applicables pour chaque transfert")}`,
                "Depuis l'arrêt Schrems II, la seule signature de clauses contractuelles types ne suffit pas : une analyse d'impact du transfert doit évaluer si le droit du pays destinataire permet réellement de les respecter.",
              ]
            : [
                "L'analyse technique n'a identifié aucun destinataire hors Espace économique européen. Si le sous-traitant recourt néanmoins à des serveurs ou à un support situés hors EEE, l'encadrement du transfert doit être documenté.",
              ],
      },
      {
        id: "annexe",
        heading: "6. Annexe — destinataires identifiés sur le site",
        body: [
          `Liste des services tiers observés lors de l'analyse du ${new Date(scan.scannedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })}. Chacun doit faire l'objet d'un contrat, ou être retiré du site.`,
          "Cette liste est un point de départ factuel : elle recense ce que le site appelle réellement, pas ce que l'organisme croit utiliser.",
        ],
        table: {
          columns: ["Service", "Entité contractante", "Pays", "Contrat en place ?"],
          rows:
            processors.length > 0
              ? processors.map((v) => [
                  v.name,
                  v.entity,
                  v.effectiveJurisdiction,
                  "à vérifier",
                ])
              : [["Aucun service tiers identifié", "—", "—", "—"]],
        },
      },
    ],
  };
}
