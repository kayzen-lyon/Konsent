import type { Finding, RemediationEffort, Rule } from "../rulepack/types";

/**
 * Temps de correction estimé, par constat.
 *
 * Le devis (`lib/remediation/quote.ts`) porte un MONTANT et l'effort déclaré
 * par la règle (`remediation.effort` : faible, moyen, élevé), mais aucune
 * durée. La durée se dérive donc de ce même champ, et de lui seul, selon un
 * barème fixe et affiché à l'écran :
 *
 *   faible → ≈ 30 min · moyen → ≈ ½ journée (3 h 30) · élevé → ≈ 1 journée (7 h)
 *
 * Ni la gravité ni le nombre d'occurrences n'entrent dans le calcul : un
 * constat critique peut se corriger en retirant une ligne, et dix balises
 * identiques se retirent d'un même geste (c'est aussi le parti du devis,
 * qui mutualise). C'est une estimation indicative, hors recette et
 * coordination ; le rapport le dit à côté du total.
 */

export const WORKDAY_MINUTES = 420;

export const EFFORT_MINUTES: Record<RemediationEffort, number> = {
  LOW: 30,
  MEDIUM: WORKDAY_MINUTES / 2,
  HIGH: WORKDAY_MINUTES,
};

export const EFFORT_LABELS: Record<RemediationEffort, string> = {
  LOW: "faible",
  MEDIUM: "moyen",
  HIGH: "élevé",
};

export function findingMinutes(rule: Pick<Rule, "remediation">): number {
  return EFFORT_MINUTES[rule.remediation.effort];
}

export function totalMinutes(
  findings: readonly Finding[],
  ruleOf: (id: string) => Pick<Rule, "remediation"> | undefined,
): number {
  return findings.reduce((sum, f) => {
    const rule = ruleOf(f.ruleId);
    return rule ? sum + findingMinutes(rule) : sum;
  }, 0);
}

export interface DurationText {
  /** Forme courte, pour un badge : « ≈ 30 min », « ≈ ½ journée ». */
  short: string;
  /** Forme lue par les technologies d'assistance : « environ 30 minutes ». */
  long: string;
}

const half = (n: number) => Math.round(n * 2) / 2;
const fr = (n: number) => String(n).replace(".", ",");

export function formatDuration(minutes: number): DurationText {
  if (minutes <= 0) return { short: "—", long: "aucun temps estimé" };
  if (minutes < 60) return { short: `≈ ${minutes} min`, long: `environ ${minutes} minutes` };
  if (minutes === WORKDAY_MINUTES / 2) return { short: "≈ ½ journée", long: "environ une demi-journée" };
  if (minutes < WORKDAY_MINUTES) {
    const h = half(minutes / 60);
    return { short: `≈ ${fr(h)} h`, long: `environ ${fr(h)} heure${h >= 2 ? "s" : ""}` };
  }
  const d = half(minutes / WORKDAY_MINUTES);
  const word = d >= 2 ? "journées" : "journée";
  return { short: `≈ ${fr(d)} ${word}`, long: `environ ${fr(d)} ${word}` };
}

/** Phrase de méthode, reprise partout où une durée est affichée. */
export const EFFORT_METHOD =
  "Estimation indicative, dérivée de l'effort de correction déclaré par chaque règle du référentiel : faible ≈ 30 min, moyen ≈ ½ journée, élevé ≈ 1 journée (7 h). Hors recette, coordination et délais de mise en production.";
