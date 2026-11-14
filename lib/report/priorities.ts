import { SEVERITY_ORDER, getRule } from "../rulepack";
import type { Finding, Rule } from "../rulepack/types";

export interface RankedFinding {
  finding: Finding;
  rule: Rule;
}

/**
 * Constats par ordre de priorité : gravité d'abord, poids de la règle
 * ensuite — le même ordre que le résumé exécutif (`summary.ts`), pour que
 * la synthèse, la présentation et le rapport désignent le même « premier »
 * point à traiter.
 */
export function rankFindings(findings: readonly Finding[]): readonly RankedFinding[] {
  return findings
    .map((finding) => ({ finding, rule: getRule(finding.ruleId) }))
    .filter((x): x is RankedFinding => Boolean(x.rule))
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.finding.severity] - SEVERITY_ORDER[b.finding.severity] ||
        b.rule.weight - a.rule.weight,
    );
}
