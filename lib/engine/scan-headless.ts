import { RULEPACK_VERSION } from "../rulepack/types";
import { RULES } from "../rulepack";
import { computeScore } from "../risk/score";
import type { TrackerEntity } from "../trackers/types";
import { evaluate } from "./evaluate";
import { evaluatePhases, PHASE_RULE_IDS, phaseUndecided } from "./evaluate-phases";
import { evaluateTcfPhases, TCF_RULE_IDS } from "./evaluate-tcf";
import { comparePhases, observationFromWorker, type WorkerOutput } from "./headless-adapter";
import { runStaticScan } from "./static";
import type { ScanResult } from "./types";

/**
 * Assemble un rapport complet à partir d'une sortie de worker navigateur.
 *
 * Le protocole en trois phases produit ce que l'analyse statique ne peut pas
 * voir. Mais l'inverse est vrai aussi : le worker n'inspecte ni les pages
 * légales, ni les en-têtes HTTP, ni les chaînes DNS. On combine donc les
 * deux plutôt que de choisir — chacun apporte ce qu'il sait faire.
 */
export async function assembleHeadlessScan(
  output: WorkerOutput,
  options: { withStaticContext?: boolean } = {},
): Promise<ScanResult> {
  const { withStaticContext = true } = options;

  // Contexte statique : pages légales, en-têtes, DNS. Facultatif, pour que
  // l'assemblage reste possible hors ligne à partir d'un JSON de worker.
  let staticContext;
  if (withStaticContext) {
    try {
      const observed = await runStaticScan(output.url);
      staticContext = {
        legalPages: observed.legalPages,
        dns: observed.dns,
        headers: observed.headers,
        sensitiveTopics: observed.sensitiveTopics,
        formsInsecure: observed.formsInsecure,
      };
    } catch {
      // Le contexte statique est un bonus : son échec ne doit pas empêcher
      // l'exploitation d'une observation navigateur déjà coûteuse à produire.
      staticContext = undefined;
    }
  }

  const observation = observationFromWorker(output, staticContext);
  const base = evaluate(observation);
  const comparison = comparePhases(output);
  const phaseFindings = evaluatePhases(comparison);
  const tcf = evaluateTcfPhases(output);

  // Les constats de phase priment : ils reposent sur une observation réelle
  // du navigateur, là où le moteur statique ne pouvait que présumer.
  const byRule = new Map(base.findings.map((f) => [f.ruleId, f]));
  for (const finding of [...phaseFindings, ...tcf.findings]) byRule.set(finding.ruleId, finding);
  const findings = [...byRule.values()];

  const score = computeScore(findings);

  const vendors = [
    ...new Map(
      observation.requests
        .map((r) => r.tracker)
        .filter((t): t is TrackerEntity => Boolean(t))
        .map((t) => [t.slug, t]),
    ).values(),
  ];

  // Ce mode couvre tout sauf les règles qui exigent encore un travail
  // manuel ou une phase D non implémentée. On les déclare, comme toujours.
  // Une règle statique déclarée indécidable le reste quand le navigateur
  // tourne : le compter « couvert » ici l'aurait fait passer pour satisfaite.
  const raised = new Set(findings.map((f) => f.ruleId));
  // `evaluate` déclare aussi toutes les règles `headless` non évaluées (il ne
  // sait pas que le navigateur a tourné) : on n'en retient que les statiques.
  const staticIds = new Set(RULES.filter((r) => r.engine === "static").map((r) => r.id));
  const undecided = new Set<string>([
    ...base.notEvaluatedRuleIds.filter((id) => staticIds.has(id)),
    ...tcf.undecided,
    ...phaseUndecided(comparison),
  ]);
  const covered = new Set<string>(
    [
      ...RULES.filter((r) => r.engine === "static").map((r) => r.id),
      ...PHASE_RULE_IDS,
      ...TCF_RULE_IDS,
    ].filter((id) => !undecided.has(id)),
  );
  const notEvaluatedRuleIds = RULES.filter((r) => !covered.has(r.id) && !raised.has(r.id)).map(
    (r) => r.id,
  );

  return {
    id: `hl-${observation.hostname.replace(/[^a-z0-9]/gi, "-").slice(0, 24)}-${Date.now().toString(36)}`,
    url: output.url,
    finalUrl: observation.finalUrl,
    hostname: observation.hostname,
    mode: "headless",
    rulepackVersion: RULEPACK_VERSION,
    scannedAt: output.scannedAt,
    durationMs: observation.durationMs,
    score: score.score,
    grade: score.grade,
    gradeLabel: score.gradeLabel,
    ...(score.cappedBy ? { cappedBy: score.cappedBy } : {}),
    findings,
    notEvaluatedRuleIds,
    observation,
    vendors,
    outsideEea: vendors.filter((v) => v.adequacy !== "EEA"),
  };
}
