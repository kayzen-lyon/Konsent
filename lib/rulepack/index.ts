import type { Family, Rule, Severity } from "./types";
import { RULEPACK_VERSION } from "./types";
import { DEPOT_RULES } from "./families/depot";
import { BANNER_RULES, REFUS_RULES } from "./families/refus-banner";
import { DOC_RULES, SEC_RULES, TRANSFER_RULES } from "./families/doc-transfer-sec";
import {
  CMV2_RULES,
  CONSENT_RULES,
  EXEMPT_RULES,
  FP_RULES,
  SPECIAL_RULES,
  STORAGE_RULES,
  VENDOR_RULES,
} from "./families/misc";

export * from "./types";

export const RULES: readonly Rule[] = [
  ...DEPOT_RULES,
  ...REFUS_RULES,
  ...BANNER_RULES,
  ...EXEMPT_RULES,
  ...STORAGE_RULES,
  ...FP_RULES,
  ...CONSENT_RULES,
  ...TRANSFER_RULES,
  ...VENDOR_RULES,
  ...CMV2_RULES,
  ...DOC_RULES,
  ...SPECIAL_RULES,
  ...SEC_RULES,
];

const BY_ID = new Map<string, Rule>(RULES.map((r) => [r.id, r]));

export function getRule(id: string): Rule | undefined {
  return BY_ID.get(id);
}

/**
 * Lève si la règle est inconnue. À n'utiliser que côté moteur, où un
 * identifiant absent traduit une erreur de programmation, jamais une
 * donnée externe.
 */
export function requireRule(id: string): Rule {
  const rule = BY_ID.get(id);
  if (!rule) throw new Error(`Règle inconnue dans le rulepack : ${id}`);
  return rule;
}

export function rulesByFamily(family: Family): readonly Rule[] {
  return RULES.filter((r) => r.family === family);
}

export const FAMILY_LABELS: Record<Family, string> = {
  DEPOT: "Dépôt avant consentement",
  REFUS: "Respect du refus",
  BANNER: "Bandeau et recueil du consentement",
  EXEMPT: "Mesure d'audience exemptée",
  STORAGE: "Stockage alternatif",
  FP: "Empreinte du terminal",
  CONSENT: "Mécanique et preuve du consentement",
  TRANSFER: "Transferts hors UE",
  VENDOR: "Destinataires et sous-traitance",
  TCF: "Cadre de transparence publicitaire",
  CMV2: "Signaux de consentement Google",
  DOC: "Documents et information",
  SPECIAL: "Circonstances aggravantes",
  SEC: "Hygiène de sécurité",
};

export const FAMILY_ORDER: readonly Family[] = [
  "DEPOT",
  "REFUS",
  "BANNER",
  "TRANSFER",
  "VENDOR",
  "STORAGE",
  "FP",
  "CMV2",
  "CONSENT",
  "EXEMPT",
  "DOC",
  "SPECIAL",
  "SEC",
  "TCF",
];

export const SEVERITY_LABELS: Record<Severity, string> = {
  CRITICAL: "Critique",
  MAJOR: "Majeur",
  MODERATE: "Modéré",
  MINOR: "Mineur",
  INFO: "Information",
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  MAJOR: 1,
  MODERATE: 2,
  MINOR: 3,
  INFO: 4,
};

export const RULEPACK = {
  version: RULEPACK_VERSION,
  total: RULES.length,
  /** Règles évaluables sans navigateur (déployables en serverless). */
  staticCount: RULES.filter((r) => r.engine === "static").length,
  headlessCount: RULES.filter((r) => r.engine === "headless").length,
} as const;
