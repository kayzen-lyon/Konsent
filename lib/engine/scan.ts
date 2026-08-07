import { RULEPACK_VERSION } from "../rulepack/types";
import { computeScore } from "../risk/score";
import type { TrackerEntity } from "../trackers/types";
import { evaluate } from "./evaluate";
import { runStaticScan } from "./static";
import type { ScanResult } from "./types";

export type ScanErrorCode = "INVALID_URL" | "UNREACHABLE" | "BLOCKED" | "TIMEOUT";

export class ScanError extends Error {
  readonly code: ScanErrorCode;

  constructor(message: string, code: ScanErrorCode) {
    super(message);
    this.name = "ScanError";
    this.code = code;
  }
}

/** Hôtes non routables ou réservés : refusés pour éviter tout usage du scanner comme relais. */
function assertPublicTarget(url: URL): void {
  const host = url.hostname.toLowerCase();
  const isLocal =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    host === "[::1]" ||
    host.startsWith("[fc") ||
    host.startsWith("[fd");

  if (isLocal) {
    throw new ScanError(
      "Seules les adresses publiques peuvent être analysées.",
      "INVALID_URL",
    );
  }
  if (!host.includes(".")) {
    throw new ScanError("Le nom de domaine est incomplet.", "INVALID_URL");
  }
}

/** Accepte « exemple.fr », « www.exemple.fr », « https://exemple.fr/page ». */
export function normalizeTarget(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) throw new ScanError("Aucune adresse fournie.", "INVALID_URL");

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new ScanError("Cette adresse n'est pas valide.", "INVALID_URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ScanError("Seuls les protocoles HTTP et HTTPS sont pris en charge.", "INVALID_URL");
  }
  assertPublicTarget(url);
  return url;
}

function scanId(hostname: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  const stamp = Date.now().toString(36);
  return `${hostname.replace(/[^a-z0-9]/gi, "-").slice(0, 24)}-${stamp}${random}`;
}

/**
 * Exécute un scan complet : observation → évaluation → score.
 *
 * Le mode `static` est le seul disponible en environnement serverless.
 * Le protocole en trois phases (avant consentement / après refus / après
 * acceptation) requiert le worker Playwright (voir `worker/`).
 */
export async function runScan(rawTarget: string, signal?: AbortSignal): Promise<ScanResult> {
  const url = normalizeTarget(rawTarget);

  let observation;
  try {
    observation = await runStaticScan(url.toString(), signal);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ScanError("L'analyse a dépassé le temps imparti.", "TIMEOUT");
    }
    throw new ScanError(
      "Le site n'a pas répondu, ou a refusé la connexion. Il peut être protégé par un pare-feu applicatif.",
      "UNREACHABLE",
    );
  }

  if (observation.httpStatus === 403 || observation.httpStatus === 429) {
    throw new ScanError(
      `Le site a refusé l'analyse (code ${observation.httpStatus}). Un pare-feu applicatif bloque probablement les clients automatisés.`,
      "BLOCKED",
    );
  }

  const { findings, notEvaluatedRuleIds } = evaluate(observation);
  const score = computeScore(findings);

  const vendors = [
    ...new Map(
      observation.requests
        .map((r) => r.tracker)
        .filter((t): t is TrackerEntity => Boolean(t))
        .map((t) => [t.slug, t]),
    ).values(),
  ];

  return {
    id: scanId(observation.hostname),
    url: observation.url,
    finalUrl: observation.finalUrl,
    hostname: observation.hostname,
    mode: observation.mode,
    rulepackVersion: RULEPACK_VERSION,
    scannedAt: new Date().toISOString(),
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
