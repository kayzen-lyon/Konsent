import { computeScore } from "../risk/score";
import { PILLARS, pillarOfFamily, type Pillar } from "../rulepack";
import type { Finding } from "../rulepack/types";

export interface PillarScore {
  id: Pillar;
  index: number;
  title: string;
  /** Score brut du pilier, de 0 à 100, sans plafond. */
  score: number;
  findings: number;
  critical: number;
}

/**
 * Score par pilier : même barème que le score global (`computeScore`),
 * appliqué aux seuls constats du pilier, SANS les plafonds durs. Les
 * plafonds traduisent une gravité transversale ; les rejouer pilier par
 * pilier noircirait des piliers qui n'y sont pour rien.
 */
export function pillarScores(findings: readonly Finding[]): readonly PillarScore[] {
  return PILLARS.map((pillar) => {
    const list = findings.filter((f) => pillarOfFamily(f.family) === pillar.id);
    return {
      id: pillar.id,
      index: pillar.index,
      title: pillar.title,
      score: computeScore(list).rawScore,
      findings: list.length,
      critical: list.filter((f) => f.severity === "CRITICAL").length,
    };
  });
}
