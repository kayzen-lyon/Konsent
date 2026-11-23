import type { VerdictScan } from "@/lib/engine/orchestrate";
import type { ScanResult } from "@/lib/engine/types";
import { findingMinutes, formatDuration } from "@/lib/report/effort";
import { rankFindings, type RankedFinding } from "@/lib/report/priorities";
import { FAMILY_LABELS, PILLARS, RULEPACK, getRule, pillarOfFamily } from "@/lib/rulepack";
import type { Rule, Severity } from "@/lib/rulepack/types";

/**
 * Données du rapport d'audit imprimable, dérivées du seul résultat
 * d'analyse : le document ne peut rien affirmer que le moteur n'ait relevé.
 */

export interface ActionPhase {
  label: string;
  when: string;
  intro: string;
  items: readonly { title: string; effort?: string }[];
}

export interface DocumentModel {
  result: ScanResult;
  degraded: VerdictScan["degraded"] | null;
  ranked: readonly RankedFinding[];
  evaluatedCount: number;
  criticalCount: number;
  headless: boolean;
  verdict: string;
  diagnosis: readonly string[];
  phases: readonly ActionPhase[];
  outOfReach: readonly { family: string; rules: readonly Rule[] }[];
  references: readonly string[];
}

const BASE_REFERENCES = [
  "Règlement (UE) 2016/679 (RGPD), articles 4(11), 6, 7, 13 et 44 à 49",
  "Loi n° 78-17 du 6 janvier 1978 modifiée, article 82",
  "CNIL, délibération n° 2020-091 du 17 septembre 2020 (lignes directrices « cookies et autres traceurs »)",
  "CNIL, délibération n° 2020-092 du 17 septembre 2020 (recommandation sur les modalités du consentement)",
  "CNIL, Guide RGPD de l'équipe de développement",
  "IAB Europe, Transparency & Consent Framework v2.2, spécifications techniques",
];

const pluralS = (n: number) => (n > 1 ? "s" : "");

export function pillarTitle(rule: Rule): string {
  const id = pillarOfFamily(rule.family);
  return PILLARS.find((p) => p.id === id)?.title ?? "";
}

function phaseItems(ranked: readonly RankedFinding[], severities: readonly Severity[]) {
  return ranked
    .filter((r) => severities.includes(r.finding.severity))
    .map((r) => ({ title: r.rule.title, effort: formatDuration(findingMinutes(r.rule)).short }));
}

function buildPhases(ranked: readonly RankedFinding[], outOfReachCount: number): ActionPhase[] {
  const phases: ActionPhase[] = [];
  const critical = phaseItems(ranked, ["CRITICAL"]);
  const major = phaseItems(ranked, ["MAJOR"]);
  const minor = phaseItems(ranked, ["MODERATE", "MINOR", "INFO"]);

  if (critical.length > 0) {
    phases.push({
      label: "Phase 1",
      when: "Sous 7 jours",
      intro: "Les écarts critiques : à traiter en premier.",
      items: critical,
    });
  }
  if (major.length > 0) {
    phases.push({
      label: `Phase ${phases.length + 1}`,
      when: "Sous 30 jours",
      intro: "Les écarts majeurs, à planifier avec votre prestataire ou votre équipe.",
      items: major,
    });
  }
  if (minor.length > 0) {
    phases.push({
      label: `Phase ${phases.length + 1}`,
      when: "Au fil de l'eau",
      intro: "Les points modérés ou mineurs, à traiter lors de la prochaine évolution du site.",
      items: minor,
    });
  }
  phases.push({
    label: `Phase ${phases.length + 1}`,
    when: "En continu",
    intro: "Ce qui maintient la conformité dans le temps.",
    items: [
      { title: "Relancer cette analyse après chaque modification du site ou du bandeau" },
      { title: "Activer la surveillance Konsent pour être alerté d'un nouveau traceur" },
      {
        title: `Contrôler les ${outOfReachCount} points non vérifiés, listés en fin de rapport`,
      },
      { title: "Conserver l'archive signée de ce rapport comme preuve de contrôle" },
    ],
  });
  return phases;
}

function buildDiagnosis(
  result: ScanResult,
  ranked: readonly RankedFinding[],
  evaluatedCount: number,
  degraded: boolean,
): string[] {
  const { findings, vendors, outsideEea } = result;
  const critical = findings.filter((f) => f.severity === "CRITICAL").length;
  const lines: string[] = [];

  if (findings.length === 0) {
    lines.push(
      `Aucun écart n'a été relevé sur les ${evaluatedCount} points vérifiés automatiquement.`,
    );
  } else {
    lines.push(
      `${findings.length} écart${pluralS(findings.length)} relevé${pluralS(findings.length)}, dont ${critical} critique${pluralS(critical)}, sur les ${evaluatedCount} points vérifiés automatiquement.`,
    );
  }

  const top = ranked[0];
  if (top) lines.push(`Point le plus urgent : « ${top.rule.title} ». ${top.rule.messageExec}`);

  lines.push(
    vendors.length === 0
      ? "Aucun destinataire tiers n'a été identifié par cette analyse."
      : `${vendors.length} destinataire${pluralS(vendors.length)} tiers identifié${pluralS(vendors.length)}${
          outsideEea.length > 0
            ? `, dont ${outsideEea.length} relevant d'une juridiction hors de l'Espace économique européen.`
            : ", tous rattachés à l'Espace économique européen."
        }`,
  );

  if (degraded) {
    lines.push(
      "Attention : l'analyse en navigateur n'a pas pu aller au bout. Ce rapport est partiel ; relancez-la avant de vous y fier.",
    );
  }
  return lines;
}

export function buildDocumentModel(
  result: ScanResult,
  degraded: VerdictScan["degraded"] | null,
): DocumentModel {
  const ranked = rankFindings(result.findings);
  const evaluatedCount = RULEPACK.total - result.notEvaluatedRuleIds.length;
  const criticalCount = result.findings.filter((f) => f.severity === "CRITICAL").length;

  const notEvaluated = result.notEvaluatedRuleIds
    .map((id) => getRule(id))
    .filter((r): r is Rule => Boolean(r));
  const byFamily = new Map<string, Rule[]>();
  for (const rule of notEvaluated) {
    const label = FAMILY_LABELS[rule.family];
    byFamily.set(label, [...(byFamily.get(label) ?? []), rule]);
  }

  const verdict = degraded
    ? "Rapport partiel"
    : criticalCount > 0
      ? `${criticalCount} écart${pluralS(criticalCount)} critique${pluralS(criticalCount)} à corriger`
      : result.findings.length > 0
        ? `${result.findings.length} point${pluralS(result.findings.length)} à améliorer`
        : "Aucun écart relevé";

  const references = [
    ...new Set([...BASE_REFERENCES, ...ranked.flatMap((r) => r.rule.references)]),
  ];

  return {
    result,
    degraded,
    ranked,
    evaluatedCount,
    criticalCount,
    headless: result.mode === "headless",
    verdict,
    diagnosis: buildDiagnosis(result, ranked, evaluatedCount, Boolean(degraded)),
    phases: buildPhases(ranked, notEvaluated.length),
    outOfReach: [...byFamily.entries()].map(([family, rules]) => ({ family, rules })),
    references,
  };
}
