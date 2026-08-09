import type { ScanResult } from "../engine/types";
import { getRule } from "../rulepack";
import type { Severity } from "../rulepack/types";
import { getTrackerBySlug } from "../trackers/db";
import { baselineMode, type Baseline } from "./baseline";

/**
 * M10 — Moteur de différentiel.
 *
 * Un client ne lit pas un rapport tous les matins. Ce qu'il veut savoir,
 * c'est ce qui A CHANGÉ : un nouveau traceur, un destinataire qui a changé
 * de juridiction, une page légale disparue lors d'une refonte.
 */

export type ChangeKind =
  | "finding_new"
  | "finding_gone"
  | "finding_worse"
  | "finding_better"
  | "vendor_new"
  | "vendor_gone"
  | "jurisdiction_new"
  | "legal_page_gone"
  | "legal_page_new"
  | "score_drop"
  | "score_rise"
  | "rulepack_changed"
  | "engine_changed";

export interface Change {
  kind: ChangeKind;
  /** true si le changement dégrade la situation. */
  regression: boolean;
  severity: Severity | null;
  title: string;
  detail: string;
}

export interface DiffResult {
  hostname: string;
  from: string;
  to: string;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  gradeBefore: string;
  gradeAfter: string;
  changes: readonly Change[];
  regressions: number;
  improvements: number;
  /** true si les deux scans n'ont pas été produits avec le même référentiel. */
  heterogeneous: boolean;
  /**
   * true si les deux scans n'ont pas été produits par le même MOTEUR.
   *
   * Distinct de `heterogeneous` : une évolution du référentiel décale quelques
   * règles, un changement de moteur en décale 76 d'un bloc.
   */
  engineChanged: boolean;
  /**
   * Le différentiel peut-il fonder une conclusion ?
   *
   * Faux dès que les moteurs diffèrent. Les changements restent listés — ils
   * ont une valeur documentaire — mais ils ne sont plus comptés comme des
   * régressions et ne déclenchent aucune alerte. Annoncer « nouveau traceur »
   * à un client parce que NOTRE moteur a changé serait une fausse alerte, et
   * le garde-fou n°3 du §3.2 l'interdit : la peur doit être vraie.
   */
  conclusive: boolean;
}

const PAGE_LABELS: Record<string, string> = {
  privacy: "politique de confidentialité",
  legal: "mentions légales",
  cookies: "politique cookies",
  terms: "conditions générales",
};

const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 4,
  MAJOR: 3,
  MODERATE: 2,
  MINOR: 1,
  INFO: 0,
};

const MODE_LABELS: Record<string, string> = {
  static: "analyse statique",
  headless: "protocole en trois phases",
};

export function diffAgainstBaseline(baseline: Baseline, current: ScanResult): DiffResult {
  const changes: Change[] = [];

  // ── Moteur ──
  // Contrôlé en premier : il conditionne la lecture de tout le reste.
  const previousMode = baselineMode(baseline);
  const engineChanged = previousMode !== current.mode;
  if (engineChanged) {
    changes.push({
      kind: "engine_changed",
      regression: false,
      severity: null,
      title: "Les deux analyses n'ont pas été produites par le même moteur",
      detail:
        `Référence prise en ${MODE_LABELS[previousMode] ?? previousMode}, analyse courante en ` +
        `${MODE_LABELS[current.mode] ?? current.mode}. Les deux moteurs ne voient pas les mêmes ` +
        `choses : les écarts ci-dessous peuvent provenir de ce changement, et non du site. ` +
        `Aucune régression n'est déclarée sur cette base, et aucune alerte n'est envoyée. ` +
        `Reprenez une référence dans le mode courant pour rétablir une comparaison utile.`,
    });
  }

  // ── Référentiel ──
  const heterogeneous = baseline.r !== current.rulepackVersion;
  if (heterogeneous) {
    changes.push({
      kind: "rulepack_changed",
      regression: false,
      severity: null,
      title: "Le référentiel a changé entre les deux analyses",
      detail: `Référence produite avec ${baseline.r}, analyse courante avec ${current.rulepackVersion}. Certains écarts peuvent provenir d'une évolution des règles plutôt que du site.`,
    });
  }

  // ── Constats ──
  const currentFindings = new Map(current.findings.map((f) => [f.ruleId, f]));

  for (const [ruleId, previousCount] of Object.entries(baseline.f)) {
    const now = currentFindings.get(ruleId);
    const rule = getRule(ruleId);
    if (!now) {
      changes.push({
        kind: "finding_gone",
        regression: false,
        severity: rule?.severity ?? null,
        title: `Écart corrigé — ${rule?.title ?? ruleId}`,
        detail: `${ruleId} n'est plus relevé.`,
      });
      continue;
    }
    if (now.occurrences > previousCount) {
      changes.push({
        kind: "finding_worse",
        regression: true,
        severity: now.severity,
        title: `Aggravation — ${rule?.title ?? ruleId}`,
        detail: `${ruleId} passe de ${previousCount} à ${now.occurrences} occurrences.`,
      });
    } else if (now.occurrences < previousCount) {
      changes.push({
        kind: "finding_better",
        regression: false,
        severity: now.severity,
        title: `Amélioration partielle — ${rule?.title ?? ruleId}`,
        detail: `${ruleId} passe de ${previousCount} à ${now.occurrences} occurrences.`,
      });
    }
  }

  for (const finding of current.findings) {
    if (finding.ruleId in baseline.f) continue;
    const rule = getRule(finding.ruleId);
    changes.push({
      kind: "finding_new",
      regression: true,
      severity: finding.severity,
      title: `Nouvel écart — ${rule?.title ?? finding.ruleId}`,
      detail: rule?.messageExec ?? `${finding.ruleId} est désormais relevé.`,
    });
  }

  // ── Destinataires ──
  const previousVendors = new Set(baseline.d);
  const currentVendors = new Set(current.vendors.map((v) => v.slug));

  for (const slug of currentVendors) {
    if (previousVendors.has(slug)) continue;
    const tracker = getTrackerBySlug(slug);
    changes.push({
      kind: "vendor_new",
      regression: true,
      severity: tracker && tracker.adequacy !== "EEA" ? "MAJOR" : "MODERATE",
      title: `Nouveau destinataire — ${tracker?.name ?? slug}`,
      detail: tracker
        ? `${tracker.entity}, juridiction effective ${tracker.effectiveJurisdiction}. ${tracker.riskNotesFr}`
        : "Ce service n'était pas présent lors de l'analyse de référence.",
    });
  }

  for (const slug of previousVendors) {
    if (currentVendors.has(slug)) continue;
    const tracker = getTrackerBySlug(slug);
    changes.push({
      kind: "vendor_gone",
      regression: false,
      severity: null,
      title: `Destinataire retiré — ${tracker?.name ?? slug}`,
      detail: "Ce service n'est plus détecté.",
    });
  }

  // ── Juridictions ──
  const previousJurisdictions = new Set(baseline.j);
  for (const j of new Set(current.vendors.map((v) => v.effectiveJurisdiction))) {
    if (previousJurisdictions.has(j)) continue;
    changes.push({
      kind: "jurisdiction_new",
      regression: true,
      severity: "MAJOR",
      title: `Nouvelle juridiction de destination — ${j}`,
      detail:
        "Des données de vos visiteurs partent désormais vers un pays qui n'apparaissait pas dans l'analyse de référence.",
    });
  }

  // ── Pages légales ──
  const previousPages = new Set<string>(baseline.p);
  const currentPages = new Set<string>(
    current.observation.legalPages.filter((p) => p.reachable).map((p) => p.kind),
  );

  for (const kind of previousPages) {
    if (currentPages.has(kind)) continue;
    changes.push({
      kind: "legal_page_gone",
      regression: true,
      severity: "MAJOR",
      title: `Page disparue — ${PAGE_LABELS[kind] ?? kind}`,
      detail:
        "Cette page était atteignable lors de l'analyse de référence. Une refonte de site en fait souvent les frais.",
    });
  }
  for (const kind of currentPages) {
    if (previousPages.has(kind)) continue;
    changes.push({
      kind: "legal_page_new",
      regression: false,
      severity: null,
      title: `Page ajoutée — ${PAGE_LABELS[kind] ?? kind}`,
      detail: "Cette page est désormais atteignable.",
    });
  }

  // ── Score ──
  const delta = current.score - baseline.s;
  if (delta !== 0) {
    changes.push({
      kind: delta < 0 ? "score_drop" : "score_rise",
      regression: delta < 0,
      severity: null,
      title: delta < 0 ? `Score en baisse de ${Math.abs(delta)} points` : `Score en hausse de ${delta} points`,
      detail: `De ${baseline.s}/100 (${baseline.g}) à ${current.score}/100 (${current.grade}).`,
    });
  }

  // Les régressions les plus graves d'abord : c'est ce qu'on lit en premier.
  changes.sort((a, b) => {
    if (a.regression !== b.regression) return a.regression ? -1 : 1;
    const ra = a.severity ? SEVERITY_RANK[a.severity] : -1;
    const rb = b.severity ? SEVERITY_RANK[b.severity] : -1;
    return rb - ra;
  });

  // Un changement de moteur rend tout comptage trompeur. On garde la liste
  // — elle documente l'écart entre les deux observations — mais plus rien
  // n'y est présenté comme une régression du site.
  const conclusive = !engineChanged;
  const scored = conclusive ? changes : changes.map((c) => ({ ...c, regression: false }));

  return {
    hostname: current.hostname,
    from: baseline.t,
    to: current.scannedAt,
    scoreBefore: baseline.s,
    scoreAfter: current.score,
    scoreDelta: delta,
    gradeBefore: baseline.g,
    gradeAfter: current.grade,
    changes: scored,
    regressions: scored.filter((c) => c.regression).length,
    improvements: conclusive
      ? scored.filter((c) => !c.regression && c.kind !== "rulepack_changed").length
      : 0,
    heterogeneous,
    engineChanged,
    conclusive,
  };
}

/** Message d'alerte prêt à l'envoi, nominatif et factuel. */
export function alertSummary(diff: DiffResult): string | null {
  // Une comparaison non concluante ne réveille personne. C'est le point
  // entier du champ : une alerte nominative fondée sur un changement de
  // notre moteur serait une fausse alerte envoyée par e-mail.
  if (!diff.conclusive) return null;
  if (diff.regressions === 0) return null;

  const worst = diff.changes.find((c) => c.regression);
  const date = new Date(diff.to).toLocaleDateString("fr-FR", { dateStyle: "long" });

  return `${diff.regressions} régression(s) détectée(s) sur ${diff.hostname} le ${date}. ${
    worst ? `La plus notable : ${worst.title}. ${worst.detail}` : ""
  }`;
}
