import { requireRule } from "../rulepack";
import type { Finding } from "../rulepack/types";

export interface ScoreResult {
  score: number;
  grade: string;
  gradeLabel: string;
  /** Renseigné si un plafond dur a été appliqué (§8.1). */
  cappedBy?: string;
  /** Score avant application des plafonds, utile pour expliquer l'écart. */
  rawScore: number;
}

const GRADES: readonly { min: number; grade: string; label: string }[] = [
  { min: 90, grade: "A", label: "Écarts résiduels" },
  { min: 75, grade: "B", label: "Écarts limités" },
  { min: 60, grade: "C", label: "Écarts significatifs" },
  { min: 40, grade: "D", label: "Écarts majeurs" },
  { min: 20, grade: "E", label: "Exposition élevée" },
  { min: 0, grade: "F", label: "Exposition critique" },
];

/**
 * Rendements décroissants sur les occurrences répétées d'une même règle :
 * dix cookies publicitaires sont pires qu'un seul, mais pas dix fois pires.
 */
function occurrenceFactor(occurrences: number): number {
  const n = Math.max(1, occurrences);
  return 1 + Math.log(n) / 4;
}

/**
 * Plafonds durs (« plafond de verre », §8.1).
 *
 * Ils évitent qu'un site cumulant de bonnes pratiques mineures compense un
 * manquement grave et obtienne un score flatteur. Ils ne sont pas un artifice
 * destiné à noircir le tableau : ils traduisent le fait qu'un dépôt avant
 * consentement rend le reste largement secondaire.
 */
const CAPS: readonly { test: (ids: Set<string>, findings: readonly Finding[]) => boolean; cap: number; reason: string }[] = [
  {
    test: (_ids, findings) =>
      findings.some(
        (f) => f.severity === "CRITICAL" && (f.family === "DEPOT" || f.family === "REFUS"),
      ),
    cap: 45,
    reason:
      "Au moins un constat critique de dépôt avant consentement ou de non-respect du refus.",
  },
  {
    test: (ids) => ids.has("KZC-BANNER-001"),
    cap: 30,
    reason:
      "Aucun mécanisme de recueil du consentement alors que des traceurs non exemptés sont présents.",
  },
  {
    test: (ids) => ids.has("KZC-DOC-001"),
    cap: 60,
    reason: "Aucune politique de confidentialité accessible.",
  },
];

export function computeScore(findings: readonly Finding[]): ScoreResult {
  let penalty = 0;
  for (const finding of findings) {
    const rule = requireRule(finding.ruleId);
    if (rule.weight === 0) continue;
    penalty += rule.weight * occurrenceFactor(finding.occurrences);
  }

  const rawScore = Math.round(Math.max(0, Math.min(100, 100 - penalty)));

  const ids = new Set(findings.map((f) => f.ruleId));
  let score = rawScore;
  let cappedBy: string | undefined;
  for (const { test, cap, reason } of CAPS) {
    if (test(ids, findings) && score > cap) {
      score = cap;
      cappedBy = reason;
    }
  }

  const band = GRADES.find((g) => score >= g.min) ?? GRADES[GRADES.length - 1]!;
  return {
    score,
    grade: band.grade,
    gradeLabel: band.label,
    ...(cappedBy ? { cappedBy } : {}),
    rawScore,
  };
}

export function gradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "#15803d";
    case "B":
      return "#4d7c0f";
    case "C":
      return "#b45309";
    case "D":
      return "#c2410c";
    case "E":
      return "#ba1a1a";
    default:
      return "#7f1d1d";
  }
}
