import { getRule } from "../rulepack";
import type { Severity } from "../rulepack/types";
import type { ActionItem, ScanHistoryEntry } from "../storage";

/**
 * Plan d'action d'un domaine : les constats de la DERNIÈRE analyse, chacun
 * avec l'état déclaré par le client.
 *
 * « Corrigé » est une déclaration, pas une constatation. Si l'analyse
 * suivante observe toujours le constat, l'entrée est marquée « toujours
 * observé » : laisser croire qu'un écart est réglé parce qu'une case a été
 * cochée serait la fausse assurance que le produit reproche aux autres.
 */

export const NOTE_MAX = 500;
export const RULE_ID_MAX = 120;

export type ActionState =
  /** À traiter. */
  | "open"
  /** Déclaré corrigé après la dernière analyse : en attente de la suivante. */
  | "fixed_pending"
  /** Déclaré corrigé AVANT la dernière analyse, qui l'observe encore. */
  | "still_observed";

export interface ActionPlanEntry {
  ruleId: string;
  title: string;
  severity: Severity | null;
  occurrences: number;
  state: ActionState;
  note: string;
  fixedAt: string | null;
}

const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 0,
  MAJOR: 1,
  MODERATE: 2,
  MINOR: 3,
  INFO: 4,
};

export function entryState(
  item: Pick<ActionItem, "status" | "fixedAt"> | undefined,
  scannedAt: string,
): ActionState {
  if (!item || item.status !== "fixed") return "open";
  if (item.fixedAt && Date.parse(item.fixedAt) < Date.parse(scannedAt)) return "still_observed";
  return "fixed_pending";
}

/** Construit le plan depuis la dernière analyse enregistrée et les états déclarés. */
export function buildActionPlan(
  latest: Pick<ScanHistoryEntry, "scannedAt" | "baseline"> | null,
  items: readonly ActionItem[],
): ActionPlanEntry[] {
  if (!latest) return [];
  const byRule = new Map(items.map((i) => [i.ruleId, i]));

  return Object.entries(latest.baseline.f ?? {})
    .map(([ruleId, occurrences]) => {
      const rule = getRule(ruleId);
      const item = byRule.get(ruleId);
      return {
        ruleId,
        title: rule?.title ?? ruleId,
        severity: rule?.severity ?? null,
        occurrences: Number(occurrences) || 0,
        state: entryState(item, latest.scannedAt),
        note: item?.note ?? "",
        fixedAt: item?.fixedAt ?? null,
      };
    })
    .sort(
      (a, b) =>
        (a.severity ? SEVERITY_RANK[a.severity] : 9) - (b.severity ? SEVERITY_RANK[b.severity] : 9) ||
        a.ruleId.localeCompare(b.ruleId),
    );
}

/** Forme d'un identifiant de règle (ex. KZC-DEPOT-001), avant tout accès en base. */
export function isValidRuleId(ruleId: string): boolean {
  return ruleId.length > 0 && ruleId.length <= RULE_ID_MAX && /^[A-Za-z0-9._:-]+$/.test(ruleId);
}
