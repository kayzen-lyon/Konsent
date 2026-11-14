import { FAMILY_ORDER, PILLARS, SEVERITY_ORDER, pillarOfFamily, type Pillar } from "../rulepack";
import type { Family, Finding } from "../rulepack/types";
import type { ScanResult } from "../engine/types";
import type { TrackerEntity } from "../trackers/types";

/**
 * Comparaison de deux analyses — logique pure, sans E/S.
 *
 * Le module ne juge pas : il range les constats et les destinataires en
 * « communs », « propres à A » et « propres à B », et calcule l'écart de
 * score. Un écart de score ne dit rien de la gravité juridique d'une
 * situation ; il dit seulement lequel des deux sites présente le moins
 * d'écarts observés par ce mode d'analyse.
 */

export type ComparableScan = Pick<
  ScanResult,
  "hostname" | "mode" | "score" | "grade" | "findings" | "vendors" | "outsideEea"
>;

export type Winner = "A" | "B" | "TIE";

export interface CommonFinding {
  ruleId: string;
  a: Finding;
  b: Finding;
}

export interface FamilyRow {
  family: Family;
  a: number;
  b: number;
}

export interface PillarRow {
  pillar: Pillar;
  a: number;
  b: number;
  /** Familles du pilier où au moins un des deux sites présente un écart. */
  families: readonly FamilyRow[];
}

export interface Comparison {
  /** Score A − score B : positif si A fait mieux. */
  scoreDelta: number;
  winner: Winner;
  /** Les deux analyses n'ont pas tourné avec le même moteur. */
  modeMismatch: boolean;
  common: readonly CommonFinding[];
  onlyA: readonly Finding[];
  onlyB: readonly Finding[];
  pillars: readonly PillarRow[];
  vendors: {
    common: readonly TrackerEntity[];
    onlyA: readonly TrackerEntity[];
    onlyB: readonly TrackerEntity[];
  };
  outsideEea: {
    a: readonly TrackerEntity[];
    b: readonly TrackerEntity[];
  };
}

function bySeverity(x: Finding, y: Finding): number {
  return SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity] || x.ruleId.localeCompare(y.ruleId);
}

function countByFamily(findings: readonly Finding[]): Map<Family, number> {
  const counts = new Map<Family, number>();
  for (const f of findings) counts.set(f.family, (counts.get(f.family) ?? 0) + 1);
  return counts;
}

export function compareScans(a: ComparableScan, b: ComparableScan): Comparison {
  const aRules = new Map(a.findings.map((f) => [f.ruleId, f]));
  const bRules = new Map(b.findings.map((f) => [f.ruleId, f]));

  const common: CommonFinding[] = [];
  for (const [ruleId, fa] of aRules) {
    const fb = bRules.get(ruleId);
    if (fb) common.push({ ruleId, a: fa, b: fb });
  }
  common.sort((x, y) => bySeverity(x.a, y.a));

  const onlyA = a.findings.filter((f) => !bRules.has(f.ruleId)).slice().sort(bySeverity);
  const onlyB = b.findings.filter((f) => !aRules.has(f.ruleId)).slice().sort(bySeverity);

  const aFam = countByFamily(a.findings);
  const bFam = countByFamily(b.findings);
  const pillars: PillarRow[] = PILLARS.map((p) => {
    const families = FAMILY_ORDER.filter((fam) => pillarOfFamily(fam) === p.id)
      .map((family) => ({ family, a: aFam.get(family) ?? 0, b: bFam.get(family) ?? 0 }))
      .filter((row) => row.a > 0 || row.b > 0);
    return {
      pillar: p.id,
      a: families.reduce((sum, r) => sum + r.a, 0),
      b: families.reduce((sum, r) => sum + r.b, 0),
      families,
    };
  });

  const aVendors = new Set(a.vendors.map((v) => v.slug));
  const bVendors = new Set(b.vendors.map((v) => v.slug));

  const scoreDelta = a.score - b.score;

  return {
    scoreDelta,
    winner: scoreDelta > 0 ? "A" : scoreDelta < 0 ? "B" : "TIE",
    modeMismatch: a.mode !== b.mode,
    common,
    onlyA,
    onlyB,
    pillars,
    vendors: {
      common: a.vendors.filter((v) => bVendors.has(v.slug)),
      onlyA: a.vendors.filter((v) => !bVendors.has(v.slug)),
      onlyB: b.vendors.filter((v) => !aVendors.has(v.slug)),
    },
    outsideEea: { a: a.outsideEea, b: b.outsideEea },
  };
}

/**
 * Clé de comparaison d'une adresse saisie : hôte en minuscules, sans `www.`.
 * Retourne null si l'adresse ne se lit pas comme une URL — la validation
 * réelle (protocole, cible publique) reste celle du moteur.
 */
export function hostKey(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
