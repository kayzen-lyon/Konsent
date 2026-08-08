/**
 * M02 — Rulepack : structure d'une règle.
 *
 * Principe directeur (§6.1 du PRD) : la règle produit un CONSTAT factuel.
 * La qualification juridique reste une hypothèse indicative. Aucun message
 * de règle ne doit affirmer « vous êtes en infraction ».
 */

export type Severity = "CRITICAL" | "MAJOR" | "MODERATE" | "MINOR" | "INFO";

export type Family =
  | "DEPOT"
  | "REFUS"
  | "BANNER"
  | "EXEMPT"
  | "STORAGE"
  | "FP"
  | "CONSENT"
  | "TRANSFER"
  | "VENDOR"
  | "TCF"
  | "CMV2"
  | "DOC"
  | "SPECIAL"
  | "SEC";

/** Phase du protocole de scan (§5.1). */
export type Phase = "A" | "B" | "C" | "D";

/**
 * Quel moteur est capable d'évaluer la règle.
 *  - `static`   : moteur sans navigateur (déployable en serverless).
 *  - `headless` : nécessite Playwright/CDP et le protocole 3 phases.
 *
 * Une règle `headless` non évaluée n'est JAMAIS comptée comme conforme :
 * elle est reportée en « non évalué » dans le rapport (§5.4, aveu d'incertitude).
 */
export type EngineCapability = "static" | "headless";

export type RemediationEffort = "LOW" | "MEDIUM" | "HIGH";

export interface Remediation {
  effort: RemediationEffort;
  /** La correction est-elle facturable en prestation (M11) ? */
  billable: boolean;
  /** Fourchette indicative de prix de correction, en euros. */
  priceHintEur?: readonly [number, number];
  steps: readonly string[];
}

export interface Rule {
  /** Identifiant stable, ex. KZC-DEPOT-001. Ne change jamais. */
  id: string;
  family: Family;
  severity: Severity;
  /** Points retirés du score (§8.1). */
  weight: number;
  /** Phases de scan concernées. */
  phases: readonly Phase[];
  engine: EngineCapability;
  title: string;
  /** Références normatives précises : article + délibération + point. */
  references: readonly string[];
  /**
   * Statut de la règle sous le projet « Digital Omnibus » COM(2025) 837.
   * Ce texte n'est PAS adopté : le champ est prospectif (§1.2, §11.3).
   */
  omnibusStatus: string;
  /** Message destiné au dirigeant : sans jargon, factuel, non accusatoire. */
  messageExec: string;
  /** Message destiné au développeur / DPO. */
  messageTech: string;
  remediation: Remediation;
  /** Points de vigilance sur les faux positifs (§20). */
  falsePositiveNotes?: string;
  lastReviewed: string;
}

/** Un constat : l'instanciation d'une règle sur un scan donné. */
export interface Finding {
  ruleId: string;
  severity: Severity;
  family: Family;
  title: string;
  /** Nombre d'occurrences observées (alimente le facteur logarithmique). */
  occurrences: number;
  /** Preuves rattachées, affichées telles quelles dans le rapport. */
  evidence: readonly Evidence[];
  /** Phase où le constat a été relevé. */
  phase: Phase;
}

export interface Evidence {
  kind: "request" | "cookie" | "header" | "dom" | "dns" | "page" | "note";
  label: string;
  detail?: string;
  /** Horodatage relatif au chargement, en millisecondes, si disponible. */
  tMs?: number;
  url?: string;
}

export const RULEPACK_VERSION = "2026.08.2";
