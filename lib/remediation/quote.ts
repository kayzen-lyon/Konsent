import type { ScanResult } from "../engine/types";
import { getRule } from "../rulepack";
import type { Severity } from "../rulepack/types";

/**
 * M11 — Devis de correction.
 *
 * Constater un écart ne le corrige pas. Le devis se calcule intégralement à
 * partir des constats : aucune saisie commerciale, donc aucun écart entre
 * ce que le rapport dit et ce qui est facturé.
 */

export type Stack =
  | "wordpress"
  | "shopify"
  | "prestashop"
  | "webflow"
  | "drupal"
  | "custom"
  | "unknown";

export const STACKS: readonly { id: Stack; label: string; coefficient: number }[] = [
  { id: "wordpress", label: "WordPress", coefficient: 1 },
  { id: "shopify", label: "Shopify", coefficient: 1.2 },
  { id: "prestashop", label: "PrestaShop", coefficient: 1.2 },
  { id: "webflow", label: "Webflow", coefficient: 1.1 },
  { id: "drupal", label: "Drupal", coefficient: 1.25 },
  { id: "custom", label: "Développement sur mesure", coefficient: 1.5 },
  { id: "unknown", label: "Pile non déterminée", coefficient: 1.25 },
];

export interface QuoteLine {
  ruleId: string;
  title: string;
  severity: Severity;
  occurrences: number;
  effort: "LOW" | "MEDIUM" | "HIGH";
  unitLow: number;
  unitHigh: number;
  /** Montants après mutualisation et coefficient de pile. */
  low: number;
  high: number;
}

export interface Quote {
  hostname: string;
  scanId: string;
  issuedAt: string;
  rulepackVersion: string;
  stack: Stack;
  stackLabel: string;
  coefficient: number;
  baseFee: number;
  lines: readonly QuoteLine[];
  /** Constats non facturables : correction autonome documentée. */
  selfServiceCount: number;
  totalLow: number;
  totalHigh: number;
  /** Durée de validité de l'offre, en jours. */
  validityDays: number;
}

const BASE_FEE = 490;
const VALIDITY_DAYS = 30;

/**
 * Mutualisation : corriger dix balises publicitaires ne coûte pas dix fois
 * le prix d'une seule. Le premier constat est plein, les suivants décroissent.
 */
function mutualise(index: number): number {
  return index === 0 ? 1 : Math.max(0.25, 1 / (1 + index * 0.55));
}

/** Devine la pile technique à partir des marqueurs observés. */
export function detectStack(scan: ScanResult): Stack {
  const haystack = [
    scan.observation.finalUrl,
    ...scan.observation.requests.map((r) => r.url),
    ...scan.observation.legalPages.map((p) => p.url),
  ]
    .join(" ")
    .toLowerCase();

  if (haystack.includes("/wp-content/") || haystack.includes("/wp-includes/")) return "wordpress";
  if (haystack.includes("cdn.shopify.com") || haystack.includes("shopifysvc")) return "shopify";
  if (haystack.includes("/modules/") && haystack.includes("prestashop")) return "prestashop";
  if (haystack.includes("assets.website-files.com") || haystack.includes("webflow")) return "webflow";
  if (haystack.includes("/sites/default/files/")) return "drupal";
  return "unknown";
}

export function buildQuote(scan: ScanResult, stack?: Stack): Quote {
  const resolved = stack ?? detectStack(scan);
  const stackEntry = STACKS.find((s) => s.id === resolved) ?? STACKS[STACKS.length - 1]!;

  // Les constats les plus graves d'abord : ils portent le plein tarif.
  const rank: Record<Severity, number> = {
    CRITICAL: 0,
    MAJOR: 1,
    MODERATE: 2,
    MINOR: 3,
    INFO: 4,
  };

  const billable = scan.findings
    .map((f) => ({ finding: f, rule: getRule(f.ruleId) }))
    .filter(
      (x): x is { finding: (typeof scan.findings)[number]; rule: NonNullable<typeof x.rule> } =>
        Boolean(x.rule?.remediation.billable && x.rule.remediation.priceHintEur),
    )
    .sort((a, b) => rank[a.finding.severity] - rank[b.finding.severity]);

  const selfServiceCount = scan.findings.length - billable.length;

  const lines: QuoteLine[] = billable.map(({ finding, rule }, index) => {
    const [unitLow, unitHigh] = rule.remediation.priceHintEur!;
    const factor = mutualise(index) * stackEntry.coefficient;
    return {
      ruleId: rule.id,
      title: rule.title,
      severity: finding.severity,
      occurrences: finding.occurrences,
      effort: rule.remediation.effort,
      unitLow,
      unitHigh,
      low: Math.round((unitLow * factor) / 10) * 10,
      high: Math.round((unitHigh * factor) / 10) * 10,
    };
  });

  const totalLow = lines.reduce((sum, l) => sum + l.low, BASE_FEE);
  const totalHigh = lines.reduce((sum, l) => sum + l.high, BASE_FEE);

  return {
    hostname: scan.hostname,
    scanId: scan.id,
    issuedAt: scan.scannedAt,
    rulepackVersion: scan.rulepackVersion,
    stack: stackEntry.id,
    stackLabel: stackEntry.label,
    coefficient: stackEntry.coefficient,
    baseFee: BASE_FEE,
    lines,
    selfServiceCount,
    totalLow,
    totalHigh,
    validityDays: VALIDITY_DAYS,
  };
}

export function formatEur(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
