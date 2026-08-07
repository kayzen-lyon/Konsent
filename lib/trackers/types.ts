/** M03 — Tracker Intelligence : modèle de connaissance des destinataires. */

export type TrackerCategory =
  | "advertising"
  | "analytics"
  | "social"
  | "session_replay"
  | "tag_manager"
  | "cdn"
  | "chat"
  | "captcha"
  | "video"
  | "maps"
  | "ab_testing"
  | "marketing_automation"
  | "rtb"
  | "cmp"
  | "payment"
  | "fonts";

/**
 * Statut d'adéquation au sens du chapitre V du RGPD.
 *  - `EEA`             : destinataire établi dans l'EEE.
 *  - `ADEQUATE`        : pays tiers couvert par une décision d'adéquation.
 *  - `DPF_CONDITIONAL` : États-Unis, sous réserve de certification DPF valide.
 *  - `NONE`            : aucune décision d'adéquation applicable.
 *  - `EXTENDED_ACCESS` : juridiction organisant un accès étatique étendu.
 */
export type Adequacy = "EEA" | "ADEQUATE" | "DPF_CONDITIONAL" | "NONE" | "EXTENDED_ACCESS";

export interface KnownCookie {
  name: string;
  purposeFr: string;
  maxLifetimeDays: number | null;
  isIdentifier: boolean;
}

export interface TrackerEntity {
  /** Identifiant de fiche, sert d'URL : /traceurs/{slug}. */
  slug: string;
  /** Nom commercial du service. */
  name: string;
  /** Entité juridique contractante. */
  entity: string;
  /** Société mère ultime, si différente. */
  ultimateParent?: string;
  /** Pays du siège de l'entité contractante (ISO 3166-1 alpha-2). */
  hqJurisdiction: string;
  /** Juridiction effective, une fois la chaîne capitalistique remontée. */
  effectiveJurisdiction: string;
  adequacy: Adequacy;
  /** Instantané du statut DPF. Toujours à reverifier à la source. */
  dpf?: { certified: boolean; checkedAt: string };
  categories: readonly TrackerCategory[];
  /** Domaines et motifs de domaines rattachés à cette entité. */
  domains: readonly string[];
  /** Motifs présents dans le HTML/JS trahissant la présence du service. */
  markers?: readonly string[];
  cookies?: readonly KnownCookie[];
  /** Éligible à l'exemption de mesure d'audience, sous conditions. */
  exemptEligible: boolean;
  /** Rédigé pour un dirigeant, pas pour un développeur (§7.3). */
  purposeFr: string;
  riskNotesFr: string;
  alternativesEu?: readonly string[];
  sources: readonly string[];
}
