/**
 * Trois niveaux de lecture d'un même rapport (§16, n°109).
 *
 * Un rapport d'audit s'adresse à trois personnes qui n'ont ni le même besoin
 * ni le même vocabulaire, et le réflexe habituel — tout afficher, charge au
 * lecteur de trier — les dessert toutes les trois. Le dirigeant décroche
 * devant `KZC-TRANSFER-003` ; le DPO a besoin de l'article exact pour
 * instruire son dossier ; le développeur veut l'URL complète et la commande à
 * exécuter, pas une explication du RGPD.
 *
 * Principe directeur : **on ne cache jamais un constat, seulement son
 * appareillage**. Les trois niveaux voient exactement les mêmes écarts, le
 * même score et les mêmes limites d'analyse. Ce qui varie est la profondeur
 * de justification. Un niveau qui masquerait un manquement fabriquerait trois
 * vérités différentes sur le même site, et c'est précisément ce que ce
 * produit reproche au marché.
 */

export type ReadingLevel = "dirigeant" | "dpo" | "developpeur";

export interface ReadingLevelSpec {
  id: ReadingLevel;
  label: string;
  /** Ce que ce niveau apporte, dit au lecteur qui hésite. */
  hint: string;
  /** Références normatives, statut Digital Omnibus, notes de faux positif. */
  showNormative: boolean;
  /** Message technique, étapes de correction détaillées, identifiants de règles. */
  showTechnical: boolean;
  /** Preuves brutes : URLs complètes, en-têtes, chaînes DNS. */
  showRawEvidence: boolean;
}

export const READING_LEVELS: readonly ReadingLevelSpec[] = [
  {
    id: "dirigeant",
    label: "Dirigeant",
    hint: "Ce qui est en écart et ce que cela coûte de corriger. Sans jargon.",
    showNormative: false,
    showTechnical: false,
    showRawEvidence: false,
  },
  {
    id: "dpo",
    label: "DPO",
    hint: "Chaque constat avec sa référence normative, sa preuve et ses limites.",
    showNormative: true,
    showTechnical: false,
    showRawEvidence: true,
  },
  {
    id: "developpeur",
    label: "Développeur",
    hint: "Le détail technique, les URLs complètes et les étapes de correction.",
    showNormative: true,
    showTechnical: true,
    showRawEvidence: true,
  },
];

export const DEFAULT_READING_LEVEL: ReadingLevel = "dirigeant";

/**
 * Le niveau voyage dans l'URL, pas dans un état de composant.
 *
 * Trois raisons, dans cet ordre : un rapport se transmet par lien à la
 * personne concernée, l'impression doit restituer ce que l'écran montrait, et
 * le rendu reste entièrement côté serveur.
 */
export function parseReadingLevel(raw: string | undefined): ReadingLevel {
  return READING_LEVELS.some((l) => l.id === raw) ? (raw as ReadingLevel) : DEFAULT_READING_LEVEL;
}

export function readingLevel(id: ReadingLevel): ReadingLevelSpec {
  return READING_LEVELS.find((l) => l.id === id) ?? READING_LEVELS[0]!;
}
