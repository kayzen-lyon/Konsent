import type { ScanResult } from "../engine/types";
import { FAMILY_LABELS, RULES } from "../rulepack";
import type { Rule } from "../rulepack/types";

export interface VerifiedFamily {
  family: string;
  items: readonly { rule: Rule; raised: boolean }[];
}

/**
 * Points réellement décidés par cette analyse, par famille, avec leur
 * résultat. Complément exact de `notEvaluatedRuleIds` : le total des deux
 * listes est celui du référentiel.
 */
export function verifiedByFamily(
  result: Pick<ScanResult, "findings" | "notEvaluatedRuleIds">,
): readonly VerifiedFamily[] {
  const skipped = new Set(result.notEvaluatedRuleIds);
  const raised = new Set(result.findings.map((f) => f.ruleId));
  const verified = RULES.filter((r) => !skipped.has(r.id));
  const families = [...new Set(verified.map((r) => r.family))];
  return families.map((family) => ({
    family: FAMILY_LABELS[family],
    items: verified
      .filter((r) => r.family === family)
      .map((rule) => ({ rule, raised: raised.has(rule.id) })),
  }));
}
