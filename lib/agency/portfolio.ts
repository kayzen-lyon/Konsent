import { ScanError, runScan } from "../engine/scan";
import type { ScanResult } from "../engine/types";

/**
 * M14 — Couche agence.
 *
 * Une agence n'a pas le même besoin qu'un éditeur : elle gère un
 * portefeuille et veut savoir, en un écran, lequel de ses clients pose
 * problème ce matin.
 */

export interface PortfolioRow {
  hostname: string;
  input: string;
  ok: boolean;
  error?: string;
  score?: number;
  grade?: string;
  gradeLabel?: string;
  criticalCount?: number;
  findingCount?: number;
  vendorCount?: number;
  outsideEeaCount?: number;
  cmpDetected?: boolean;
  durationMs?: number;
}

/**
 * Le portefeuille reste sur le moteur STATIQUE, à dessein.
 *
 * Un scan en navigateur coûte ~40 s ; huit domaines en série dépassent
 * largement le budget d'une requête, et les paralléliser saturerait le pool
 * de workers au détriment des analyses individuelles.
 *
 * Conséquence assumée, et à afficher : le score d'un domaine vu ici peut
 * différer de celui de son rapport complet — vers le haut, puisque le mode
 * statique ne constate pas ce qu'il ne peut pas voir. Ce tableau sert à
 * repérer lequel des clients ouvrir en premier, pas à établir un verdict.
 */
export const PORTFOLIO_ENGINE_NOTE =
  "Vue de tri, produite par l'analyse statique pour tenir le budget de temps sur plusieurs domaines. " +
  "Le rapport complet d'un domaine peut relever davantage d'écarts : ouvrez-le avant de conclure.";

export interface PortfolioSummary {
  rows: readonly PortfolioRow[];
  analysed: number;
  failed: number;
  averageScore: number | null;
  worst: PortfolioRow | null;
  totalCritical: number;
  /** Domaines dont le score justifie une intervention prioritaire. */
  needAttention: number;
}

/** Nombre maximal de domaines traités en une passe, pour tenir le budget de temps. */
export const MAX_PORTFOLIO_DOMAINS = 8;
const CONCURRENCY = 4;

/** Exécute les scans par vagues, pour ne pas saturer le worker serverless. */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index]!);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function toRow(input: string, scan: ScanResult): PortfolioRow {
  return {
    hostname: scan.hostname,
    input,
    ok: true,
    score: scan.score,
    grade: scan.grade,
    gradeLabel: scan.gradeLabel,
    criticalCount: scan.findings.filter((f) => f.severity === "CRITICAL").length,
    findingCount: scan.findings.length,
    vendorCount: scan.vendors.length,
    outsideEeaCount: scan.outsideEea.length,
    cmpDetected: scan.observation.cmp.detected,
    durationMs: scan.durationMs,
  };
}

export async function scanPortfolio(domains: readonly string[]): Promise<PortfolioSummary> {
  const targets = [...new Set(domains.map((d) => d.trim()).filter(Boolean))].slice(
    0,
    MAX_PORTFOLIO_DOMAINS,
  );

  const rows = await mapWithConcurrency(targets, CONCURRENCY, async (input) => {
    try {
      const scan = await runScan(input);
      return toRow(input, scan);
    } catch (error) {
      return {
        hostname: input,
        input,
        ok: false,
        error:
          error instanceof ScanError
            ? error.message
            : "L'analyse n'a pas abouti pour ce domaine.",
      } satisfies PortfolioRow;
    }
  });

  const analysed = rows.filter((r) => r.ok);
  const scores = analysed.map((r) => r.score ?? 0);

  return {
    rows,
    analysed: analysed.length,
    failed: rows.length - analysed.length,
    averageScore:
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null,
    worst:
      analysed.length > 0
        ? analysed.reduce((min, r) => ((r.score ?? 100) < (min.score ?? 100) ? r : min))
        : null,
    totalCritical: analysed.reduce((sum, r) => sum + (r.criticalCount ?? 0), 0),
    needAttention: analysed.filter((r) => (r.score ?? 100) < 60).length,
  };
}

/** Réglages de marque blanche, transmis par l'URL. Aucun compte requis. */
export interface Branding {
  agency: string | null;
  accent: string | null;
}

const HEX = /^#?[0-9a-f]{6}$/i;

export function parseBranding(params: {
  agence?: string;
  couleur?: string;
}): Branding {
  const agency = params.agence?.trim().slice(0, 48) || null;
  const raw = params.couleur?.trim() ?? "";
  const accent = HEX.test(raw) ? (raw.startsWith("#") ? raw : `#${raw}`) : null;
  return { agency, accent };
}
