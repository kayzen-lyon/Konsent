/**
 * Finalités et fonctionnalités spéciales du TCF v2, en français lisible.
 *
 * Les libellés officiels de l'IAB sont rédigés pour des juristes de régie
 * publicitaire. « Créer des profils pour la publicité personnalisée » ne dit
 * rien à un dirigeant de PME. On garde donc le libellé de référence ET une
 * traduction en langage de dirigeant — c'est le même parti pris que
 * `purposeFr` sur les traceurs (PRD §7.3), et c'est ce qui rend le rapport
 * lisible par la personne qui décide.
 */

export interface TcfPurpose {
  id: number;
  /** Intitulé de référence, tel que publié par l'IAB Europe. */
  official: string;
  /** Ce que ça veut dire, pour la personne qui signe. */
  plain: string;
  /**
   * L'intérêt légitime est-il défendable pour cette finalité ?
   *
   * La CJUE a jugé le 4 octobre 2024 (C-621/22, KNLTB) qu'un intérêt purement
   * commercial ne suffit pas à lui seul. Les finalités de ciblage sont donc
   * marquées comme non défendables : c'est ce qui arme la règle KZC-TCF-006.
   */
  legitimateInterestDefensible: boolean;
}

export const TCF_PURPOSES: readonly TcfPurpose[] = [
  {
    id: 1,
    official: "Stocker et/ou accéder à des informations sur un terminal",
    plain: "Déposer ou lire des données dans le navigateur du visiteur.",
    legitimateInterestDefensible: false,
  },
  {
    id: 2,
    official: "Utiliser des données limitées aux fins de sélection de publicités",
    plain: "Choisir quelle publicité afficher, sans profilage poussé.",
    legitimateInterestDefensible: false,
  },
  {
    id: 3,
    official: "Créer des profils pour la publicité personnalisée",
    plain: "Constituer un profil du visiteur pour lui adresser de la publicité ciblée.",
    legitimateInterestDefensible: false,
  },
  {
    id: 4,
    official: "Utiliser des profils pour sélectionner des publicités personnalisées",
    plain: "Se servir de ce profil pour choisir les publicités affichées.",
    legitimateInterestDefensible: false,
  },
  {
    id: 5,
    official: "Créer des profils pour personnaliser le contenu",
    plain: "Constituer un profil pour adapter le contenu éditorial affiché.",
    legitimateInterestDefensible: false,
  },
  {
    id: 6,
    official: "Utiliser des profils pour sélectionner du contenu personnalisé",
    plain: "Se servir de ce profil pour choisir le contenu affiché.",
    legitimateInterestDefensible: false,
  },
  {
    id: 7,
    official: "Mesurer la performance des publicités",
    plain: "Compter les affichages et les clics publicitaires.",
    legitimateInterestDefensible: true,
  },
  {
    id: 8,
    official: "Mesurer la performance du contenu",
    plain: "Compter ce qui est lu et regardé sur le site.",
    legitimateInterestDefensible: true,
  },
  {
    id: 9,
    official: "Comprendre les audiences par le recoupement de données",
    plain: "Rapprocher plusieurs sources pour décrire le public du site.",
    legitimateInterestDefensible: true,
  },
  {
    id: 10,
    official: "Développer et améliorer les services",
    plain: "Se servir des données pour faire évoluer le produit.",
    legitimateInterestDefensible: true,
  },
  {
    id: 11,
    official: "Utiliser des données limitées pour sélectionner du contenu",
    plain: "Choisir le contenu affiché, sans profilage poussé.",
    legitimateInterestDefensible: true,
  },
];

/** Finalités de ciblage : celles où l'intérêt légitime n'est pas défendable. */
export const TARGETING_PURPOSES: readonly number[] = TCF_PURPOSES.filter(
  (p) => !p.legitimateInterestDefensible,
).map((p) => p.id);

export const TCF_SPECIAL_FEATURES: readonly { id: number; official: string; plain: string }[] = [
  {
    id: 1,
    official: "Utiliser des données de géolocalisation précises",
    plain: "Connaître la position du visiteur à quelques mètres près.",
  },
  {
    id: 2,
    official: "Analyser activement les caractéristiques du terminal",
    plain: "Interroger le terminal pour en tirer une empreinte identifiante.",
  },
];

export function purposeLabel(id: number): string {
  return TCF_PURPOSES.find((p) => p.id === id)?.plain ?? `Finalité ${id}`;
}
