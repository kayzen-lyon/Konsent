import type { Family, Rule } from "../rulepack/types";

/**
 * Couche multi-juridiction.
 *
 * Axeptio affiche RGPD, PIPEDA, Loi 25, CCPA, nLPD et GPC sur sa page
 * d'accueil. Une V1 purement française nous ferme toute agence ayant un client
 * canadien ou suisse.
 *
 * La réponse n'est pas d'écrire cinq référentiels. Le CONSTAT technique est
 * universel — « un traceur publicitaire s'est déposé avant toute action » est
 * le même fait observé à Lyon, à Montréal ou en Californie. Ce qui change,
 * c'est la norme qu'on lui oppose et la conséquence qu'elle emporte.
 *
 * Ce module ne réécrit donc aucune règle : il pose, par juridiction, ce que le
 * constat vaut. Voir PRD §6.15.
 *
 * AVERTISSEMENT DE PORTÉE, à ne pas diluer. Seules les qualifications FR et UE
 * ont été construites à partir des textes et de la doctrine de l'autorité
 * compétente. QC, CA, CH et US_CA sont des qualifications INDICATIVES,
 * établies par analogie de régime, et doivent être validées par un juriste de
 * la juridiction concernée avant toute exploitation commerciale. Le produit
 * affiche cet avertissement, il ne le range pas dans une note de bas de page.
 */

export type JurisdictionCode = "FR" | "EU" | "QC" | "CA" | "CH" | "US_CA";

/**
 * Régime de consentement applicable aux traceurs.
 *  - `OPT_IN`         : accord préalable requis. Un dépôt avant action est un écart.
 *  - `OPT_IN_IMPLIED` : accord requis, mais pouvant être implicite selon le contexte.
 *  - `OPT_OUT`        : dépôt licite par défaut ; le manquement porte sur le
 *                       refus d'obtempérer à une opposition.
 */
export type ConsentRegime = "OPT_IN" | "OPT_IN_IMPLIED" | "OPT_OUT";

export interface Jurisdiction {
  code: JurisdictionCode;
  label: string;
  /** Autorité de contrôle compétente. */
  authority: string;
  regime: ConsentRegime;
  /** Texte de référence pour le dépôt de traceurs. */
  basis: string;
  /** Le niveau de qualification atteint par notre travail. */
  maturity: "qualified" | "indicative";
  /** Ce qu'il faut avoir en tête en lisant un rapport sous cette juridiction. */
  caveat: string;
}

export const JURISDICTIONS: readonly Jurisdiction[] = [
  {
    code: "FR",
    label: "France",
    authority: "CNIL",
    regime: "OPT_IN",
    basis: "Article 82 de la loi n° 78-17 du 6 janvier 1978 modifiée",
    maturity: "qualified",
    caveat:
      "Juridiction de référence du référentiel. Les qualifications s'appuient sur les lignes directrices 2020-091 et la recommandation 2020-092.",
  },
  {
    code: "EU",
    label: "Union européenne",
    authority: "Autorité de l'État membre concerné",
    regime: "OPT_IN",
    basis: "Directive 2002/58/CE, article 5(3), telle que transposée",
    maturity: "qualified",
    caveat:
      "La directive est transposée État par État : les modalités pratiques et les barèmes de sanction varient. Le constat technique, lui, ne varie pas.",
  },
  {
    code: "QC",
    label: "Québec",
    authority: "Commission d'accès à l'information",
    regime: "OPT_IN",
    basis: "Loi 25 modifiant la Loi sur la protection des renseignements personnels",
    maturity: "indicative",
    caveat:
      "Qualification établie par analogie de régime. La Loi 25 impose notamment la confidentialité par défaut et une transparence renforcée sur les décisions automatisées, points que ce référentiel ne couvre pas encore.",
  },
  {
    code: "CA",
    label: "Canada (fédéral)",
    authority: "Commissariat à la protection de la vie privée",
    regime: "OPT_IN_IMPLIED",
    basis: "LPRPDE (PIPEDA), principe 3 de l'annexe 1",
    maturity: "indicative",
    caveat:
      "Le consentement implicite peut suffire pour des finalités non sensibles. Un dépôt avant action n'est donc pas mécaniquement un écart : le contexte et la sensibilité de la donnée commandent.",
  },
  {
    code: "CH",
    label: "Suisse",
    authority: "PFPDT",
    regime: "OPT_OUT",
    basis: "Article 45c de la loi sur les télécommunications ; nLPD du 1er septembre 2023",
    maturity: "indicative",
    caveat:
      "Le régime suisse est d'opposition, non d'accord préalable : le dépôt est licite si l'utilisateur est informé et peut refuser. La famille DEPOT y perd l'essentiel de sa portée, et l'information devient centrale.",
  },
  {
    code: "US_CA",
    label: "Californie",
    authority: "California Privacy Protection Agency",
    regime: "OPT_OUT",
    basis: "CCPA/CPRA, §1798.120 et §1798.135",
    maturity: "indicative",
    caveat:
      "Le dépôt préalable n'est pas en soi un manquement. Le manquement porte sur l'absence de mécanisme d'opposition à la vente ou au partage, et sur le non-respect du signal GPC — juridiquement opposable en Californie depuis 2021.",
  },
];

export const DEFAULT_JURISDICTION: JurisdictionCode = "FR";

export function getJurisdiction(code: string): Jurisdiction | undefined {
  return JURISDICTIONS.find((j) => j.code === code);
}

/* ------------------------------------------------------- applicabilité */

export interface RuleApplicability {
  applies: boolean;
  /** Pourquoi la règle ne s'applique pas, le cas échéant. Affiché tel quel. */
  reason?: string;
  /** Fondement local, quand il diffère du fondement français. */
  localBasis?: string;
}

/**
 * Familles neutralisées par un régime d'opposition.
 *
 * En Suisse et en Californie, constater qu'un traceur s'est déposé avant toute
 * action ne caractérise rien : c'est le régime normal. Maintenir ces familles
 * produirait un score effondré sans le moindre fondement — le genre de faux
 * positif qui ruine la crédibilité d'un rapport (§20).
 */
const OPT_OUT_NEUTRALIZED: readonly Family[] = ["DEPOT", "STORAGE", "FP"];

/**
 * Familles qui, à l'inverse, prennent le pas sous un régime d'opposition :
 * le manquement s'y déplace vers le refus d'obtempérer et vers l'information.
 */
export const OPT_OUT_CRITICAL: readonly Family[] = ["CONSENT", "REFUS", "DOC"];

/** Règles adossées à un texte strictement français. */
const FRENCH_SPECIFIC: readonly string[] = ["KZC-DOC-013", "KZC-DOC-017"];

export function applicability(rule: Rule, code: JurisdictionCode): RuleApplicability {
  const jurisdiction = getJurisdiction(code);
  if (!jurisdiction) return { applies: true };

  if (FRENCH_SPECIFIC.includes(rule.id) && code !== "FR") {
    return {
      applies: false,
      reason:
        "Cette règle s'adosse à un texte strictement français (droit de réclamation auprès de la CNIL, obligations d'identification de l'hébergeur au titre de la LCEN).",
    };
  }

  if (jurisdiction.regime === "OPT_OUT" && OPT_OUT_NEUTRALIZED.includes(rule.family)) {
    return {
      applies: false,
      reason: `Sous le régime d'opposition applicable (${jurisdiction.basis}), le dépôt préalable n'est pas en soi un écart. Le contrôle porte sur l'information et sur le respect de l'opposition.`,
      localBasis: jurisdiction.basis,
    };
  }

  // Le TCF est un cadre européen : hors UE, il n'a pas d'objet, sauf au Canada
  // où l'IAB publie une déclinaison propre.
  if (rule.family === "TCF" && !["FR", "EU", "CA", "QC"].includes(code)) {
    return {
      applies: false,
      reason: "Le cadre de transparence de l'IAB Europe n'a pas d'objet dans cette juridiction.",
    };
  }

  return { applies: true, localBasis: jurisdiction.basis };
}

/**
 * Répartition d'un référentiel pour une juridiction donnée.
 *
 * Les règles hors périmètre ne DISPARAISSENT pas : elles sont renvoyées à
 * part, avec leur motif, pour être affichées. Un rapport qui masque ce qu'il
 * n'évalue pas est exactement le défaut reproché au marché (§5.4).
 */
export function partitionForJurisdiction(
  rules: readonly Rule[],
  code: JurisdictionCode,
): {
  applicable: readonly Rule[];
  outOfScope: readonly { rule: Rule; reason: string }[];
} {
  const applicable: Rule[] = [];
  const outOfScope: { rule: Rule; reason: string }[] = [];

  for (const rule of rules) {
    const a = applicability(rule, code);
    if (a.applies) {
      applicable.push(rule);
    } else {
      outOfScope.push({ rule, reason: a.reason ?? "Hors périmètre." });
    }
  }

  return { applicable, outOfScope };
}
