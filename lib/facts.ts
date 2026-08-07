/**
 * Table `facts` (§1.3 du PRD).
 *
 * Règle absolue : aucun chiffre n'est affiché dans le produit sans sa source
 * et sa date de vérification. C'est à la fois une exigence de loyauté
 * commerciale et un différenciateur — aucun concurrent n'affiche ses sources.
 *
 * `verified` indique si le chiffre a été confronté à la source officielle
 * par un humain. Un fait non vérifié N'EST PAS affiché dans les écrans
 * publics : il reste ici en attente de contrôle. Voir `PUBLIC_FACTS`.
 */

export interface Fact {
  id: string;
  claim: string;
  value: string;
  sourceName: string;
  sourceUrl: string;
  /** Date de dernière confrontation à la source, au format ISO. */
  verifiedAt: string | null;
  verified: boolean;
}

export const FACTS: readonly Fact[] = [
  {
    id: "cnil-sanctions-2025",
    claim: "Volume et montant des sanctions prononcées par la CNIL en 2025",
    value: "83 sanctions, environ 487 millions d'euros",
    sourceName: "CNIL, rapport annuel 2025",
    sourceUrl: "https://www.cnil.fr/fr/documents/rapports-annuels",
    verifiedAt: null,
    verified: false,
  },
  {
    id: "cookies-premier-motif",
    claim: "Part des cookies et traceurs dans les motifs de sanction en France",
    value: "premier motif de sanction",
    sourceName: "CNIL, bilan annuel des sanctions",
    sourceUrl: "https://www.cnil.fr/fr/les-sanctions-prononcees-par-la-cnil",
    verifiedAt: null,
    verified: false,
  },
  {
    id: "tpe-pme-controlees",
    claim: "Part des TPE et PME parmi les organismes contrôlés en 2025",
    value: "32 %",
    sourceName: "CNIL, rapport annuel 2025",
    sourceUrl: "https://www.cnil.fr/fr/documents/rapports-annuels",
    verifiedAt: null,
    verified: false,
  },
  {
    id: "procedure-simplifiee-plafond",
    claim: "Plafond de sanction en procédure simplifiée",
    value: "20 000 € par décision",
    sourceName: "Loi n° 78-17 du 6 janvier 1978 modifiée, article 22-1",
    sourceUrl: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000886460",
    verifiedAt: "2026-08-07",
    verified: true,
  },
  {
    id: "rgpd-plafond-art83",
    claim: "Plafond de l'amende administrative pour manquement grave",
    value: "20 000 000 € ou 4 % du chiffre d'affaires annuel mondial, le montant le plus élevé",
    sourceName: "RGPD, article 83(5)",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32016R0679",
    verifiedAt: "2026-08-07",
    verified: true,
  },
  {
    id: "penal-226-16",
    claim: "Peine encourue au titre du volet pénal",
    value:
      "300 000 € d'amende pour une personne physique ; quintuple pour une personne morale (art. 131-38 du code pénal)",
    sourceName: "Code pénal, articles 226-16 et 131-38",
    sourceUrl: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070719/LEGISCTA000006165313",
    verifiedAt: "2026-08-07",
    verified: true,
  },
  {
    id: "eprivacy-retrait",
    claim: "Sort de la proposition de règlement ePrivacy",
    value: "retirée par la Commission européenne le 11 février 2025",
    sourceName: "Journal officiel de l'Union européenne, retraits de propositions",
    sourceUrl: "https://eur-lex.europa.eu/",
    verifiedAt: null,
    verified: false,
  },
  {
    id: "digital-omnibus",
    claim: "Statut de la proposition « Digital Omnibus »",
    value:
      "COM(2025) 837, présentée le 19 novembre 2025 — non adoptée à ce jour ; avis conjoint CEPD/EDPS 2/2026 du 11 février 2026",
    sourceName: "Commission européenne, COM(2025) 837",
    sourceUrl: "https://eur-lex.europa.eu/",
    verifiedAt: null,
    verified: false,
  },
  {
    id: "art82",
    claim: "Base juridique du dépôt et de la lecture de traceurs en France",
    value:
      "article 82 de la loi n° 78-17 du 6 janvier 1978 modifiée, transposant la directive 2002/58/CE",
    sourceName: "Légifrance",
    sourceUrl: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000037822826",
    verifiedAt: "2026-08-07",
    verified: true,
  },
  {
    id: "ld-2020-091",
    claim: "Lignes directrices de la CNIL relatives aux cookies et autres traceurs",
    value: "délibération n° 2020-091 du 17 septembre 2020",
    sourceName: "CNIL",
    sourceUrl: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000042388179",
    verifiedAt: "2026-08-07",
    verified: true,
  },
  {
    id: "reco-2020-092",
    claim: "Recommandation de la CNIL sur les modalités pratiques de recueil du consentement",
    value: "délibération n° 2020-092 du 17 septembre 2020",
    sourceName: "CNIL",
    sourceUrl: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000042388197",
    verifiedAt: "2026-08-07",
    verified: true,
  },
  {
    id: "planet49",
    claim: "Position de la Cour de justice sur les cases pré-cochées",
    value: "CJUE, 1er octobre 2019, C-673/17, Planet49",
    sourceName: "Cour de justice de l'Union européenne",
    sourceUrl: "https://curia.europa.eu/juris/liste.jsf?num=C-673/17",
    verifiedAt: "2026-08-07",
    verified: true,
  },
];

/**
 * Faits affichables publiquement : uniquement ceux confrontés à leur source.
 *
 * Les chiffres de bilan (nombre de sanctions, part des TPE/PME, moyenne
 * observée) sont commercialement très efficaces mais restent en attente de
 * vérification. Les afficher sans contrôle serait exactement le travers que
 * le produit reproche au marché.
 */
export const PUBLIC_FACTS: readonly Fact[] = FACTS.filter((f) => f.verified);

export const PENDING_FACTS: readonly Fact[] = FACTS.filter((f) => !f.verified);

export function getFact(id: string): Fact | undefined {
  return FACTS.find((f) => f.id === id);
}
