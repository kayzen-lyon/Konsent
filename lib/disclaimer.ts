/**
 * Formules canoniques d'avertissement (§3.3 du PRD).
 *
 * À réutiliser telles quelles, sans reformulation. Elles doivent figurer sur
 * l'écran de résultat, en en-tête et pied de chaque document généré, et dans
 * chaque réponse d'API ou d'outil MCP — où elles ne sont pas désactivables.
 */

export const DISCLAIMER_LONG = `Konsent est un outil d'analyse technique automatisée. Les résultats produits sont purement indicatifs et reposent sur l'observation du comportement d'un client automatisé à un instant donné, dans une configuration donnée. Ils ne constituent ni un audit juridique, ni une consultation juridique, ni une certification de conformité, et n'engagent pas la responsabilité de l'éditeur, KAYZEN (Tarek BELHADJ, entrepreneur individuel), quant à l'appréciation qui pourrait être portée par une autorité de contrôle ou une juridiction. Seul un professionnel du droit habilité peut qualifier juridiquement une situation au regard du règlement (UE) 2016/679, de la loi n° 78-17 du 6 janvier 1978 modifiée et des textes applicables. Les montants mentionnés correspondent à des plafonds légaux théoriques et non à une prévision de sanction. Les documents générés sont des modèles à personnaliser et à faire valider avant toute utilisation.`;

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
 * Note de nomenclature : `493 857 262 00098` est un **SIRET** (14 chiffres,
 * il identifie l'établissement), pas un SIREN (9 chiffres, il identifie
 * l'entreprise). Les deux figurent ci-dessous sous leur vrai nom — les
 * confondre dans des mentions légales est une inexactitude relevable.
 */
export const EDITOR = {
  /** Dénomination : nom de l'entrepreneur suivi de « EI » (art. R. 526-26 C. com.). */
  legalName: "Tarek BELHADJ EI",
  tradeName: "KAYZEN",
  legalForm: "Entreprise individuelle (micro-entreprise)",
  director: "Tarek BELHADJ",
  siren: "493 857 262",
  siret: "493 857 262 00098",
  apeCode: "62.01Z",
  /** Franchise en base : aucune TVA facturée, aucun numéro intracommunautaire affiché. */
  vatMention: "TVA non applicable, art. 293 B du CGI",
  address: "6 rue Pierre Termier, 69009 Lyon",
  street: "6 rue Pierre Termier",
  postalCode: "69009",
  city: "Lyon",
  country: "France",
  premises: "6 rue de Bourgogne, 69009 Lyon",
  phone: "+33 4 87 77 68 61",
  /** Format E.164, pour les liens `tel:` et la fiche vCard. */
  phoneE164: "+33487776861",
  email: "contact@kayzen-lyon.fr",
  product: "Konsent",
  productSite: "https://konsent.kayzen-lyon.com",
  agencySite: "https://internet.kayzen-lyon.fr",
  agencyName: "Kayzen Web",
  groupSite: "https://www.kayzen-lyon.com",
} as const;
