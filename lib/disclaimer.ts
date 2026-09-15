/**
 * Formules canoniques d'avertissement (§3.3 du PRD).
 *
 * À réutiliser telles quelles, sans reformulation. Elles doivent figurer sur
 * l'écran de résultat, en en-tête et pied de chaque document généré, et dans
 * chaque réponse d'API ou d'outil MCP — où elles ne sont pas désactivables.
 */

export const DISCLAIMER_LONG = `Konsent est un outil d'analyse technique automatisée. Les résultats produits sont purement indicatifs et reposent sur l'observation du comportement d'un client automatisé à un instant donné, dans une configuration donnée. Ils ne constituent ni un audit juridique, ni une consultation juridique, ni une certification de conformité, et n'engagent pas la responsabilité de KAYZEN LYON SASU quant à l'appréciation qui pourrait être portée par une autorité de contrôle ou une juridiction. Seul un professionnel du droit habilité peut qualifier juridiquement une situation au regard du règlement (UE) 2016/679, de la loi n° 78-17 du 6 janvier 1978 modifiée et des textes applicables. Les montants mentionnés correspondent à des plafonds légaux théoriques et non à une prévision de sanction. Les documents générés sont des modèles à personnaliser et à faire valider avant toute utilisation.`;

export const DISCLAIMER_SHORT =
  "Analyse technique automatisée — résultat indicatif, non juridique. Ne constitue ni une consultation ni une certification.";

/**
 * Formulation imposée pour tout constat (§3.2, point 4).
 * Le produit ne dit jamais « vous êtes en infraction ».
 */
export function constatWording(reference: string): string {
  return `Le comportement observé présente un écart avec ${reference}. Seule la CNIL ou un juge peut qualifier une infraction.`;
}

/**
 * Identité de l'éditeur — source unique.
 *
 * Mentions légales, pied de page, documents générés, carte de contact et
 * fiche vCard lisent TOUS ce bloc. Recopier un SIREN dans un composant est la
 * manière la plus sûre de se retrouver avec deux numéros différents sur le
 * même site, et c'est précisément le genre d'écart que ce produit relève.
 *
 * Note de nomenclature : `999 418 346 000 14` est un **SIRET** (14 chiffres,
 * il identifie l'établissement), pas un SIREN (9 chiffres, il identifie
 * l'entreprise). Les deux figurent ci-dessous sous leur vrai nom — les
 * confondre dans des mentions légales est une inexactitude relevable.
 */
export const EDITOR = {
  legalName: "KAYZEN LYON SASU",
  tradeName: "KAYZEN LYON",
  legalForm: "Société par actions simplifiée unipersonnelle (SASU)",
  siren: "999 418 346",
  siret: "999 418 346 00014",
  rcs: "Lyon B 999 418 346",
  vatNumber: "FR85 999 418 346",
  apeCode: "4791B",
  address: "6 rue Pierre Termier, 69009 Lyon",
  street: "6 rue Pierre Termier",
  postalCode: "69009",
  city: "Lyon",
  country: "France",
  phone: "+33 4 87 77 68 61",
  /** Format E.164, pour les liens `tel:` et la fiche vCard. */
  phoneE164: "+33487776861",
  email: "contact@kayzen-lyon.fr",
  product: "Konsent",
  productSite: "https://konsent.kayzen-lyon.com",
  agencySite: "https://internet.kayzen-lyon.fr",
  agencyName: "Kayzen Web",
} as const;
