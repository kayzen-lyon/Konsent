import type { WorkerOutput } from "./headless-adapter";

/**
 * Client du worker navigateur.
 *
 * L'application ne fait tourner aucun navigateur — Vercel ne convient pas à
 * un Chromium de longue durée. Elle délègue donc l'observation au worker et
 * garde pour elle ce qu'elle sait faire : appliquer le référentiel.
 *
 * Tout ici est écrit pour qu'une indisponibilité du worker dégrade le
 * rapport sans jamais le fausser. Le moteur statique reprend la main, et le
 * rapport dit lequel des deux a parlé.
 */

export type WorkerFailure =
  | "NOT_CONFIGURED"
  | "UNAUTHORIZED"
  | "SATURATED"
  | "TIMEOUT"
  | "UNREACHABLE"
  | "REJECTED"
  | "MALFORMED";

export class WorkerError extends Error {
  readonly failure: WorkerFailure;

  constructor(message: string, failure: WorkerFailure) {
    super(message);
    this.name = "WorkerError";
    this.failure = failure;
  }
}

/**
 * Le worker est-il déployé ?
 *
 * Les deux variables sont exigées ensemble : une URL sans secret produirait
 * un appel systématiquement refusé en 401, et un secret sans URL n'a pas de
 * destinataire. Mieux vaut rester franchement inerte qu'à moitié branché.
 */
export function isWorkerConfigured(): boolean {
  return Boolean(process.env["KONSENT_WORKER_URL"] && process.env["KONSENT_WORKER_SECRET"]);
}

/**
 * Budget d'attente côté application.
 *
 * Il est délibérément plus court que le plafond du worker : si le worker
 * s'accorde 120 s, l'application qui l'attend doit rendre la main avant, ou
 * c'est la requête de l'utilisateur qui expire. Le §5.5 vise ~35 s pour un
 * scan `quick`, et `maxDuration` vaut 60 s sur les routes concernées.
 */
function budgetMs(): number {
  const configured = Number(process.env["KONSENT_WORKER_TIMEOUT_MS"]);
  return Number.isFinite(configured) && configured > 0 ? configured : 45_000;
}

function looksLikeWorkerOutput(value: unknown): value is WorkerOutput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["url"] === "string" &&
    typeof v["scannedAt"] === "string" &&
    Array.isArray(v["snapshots"]) &&
    v["snapshots"].length > 0 &&
    typeof v["banner"] === "object" &&
    v["banner"] !== null
  );
}

/**
 * Demande au worker l'observation en trois phases d'une URL.
 *
 * Lève une `WorkerError` typée en cas d'échec — jamais de valeur nulle
 * silencieuse : l'appelant doit pouvoir DIRE à l'utilisateur pourquoi il lit
 * un rapport statique plutôt qu'un rapport complet.
 */
export async function requestWorkerScan(
  url: string,
  signal?: AbortSignal,
): Promise<WorkerOutput> {
  const base = process.env["KONSENT_WORKER_URL"];
  const secret = process.env["KONSENT_WORKER_SECRET"];
  if (!base || !secret) {
    throw new WorkerError(
      "Le worker navigateur n'est pas configuré sur ce déploiement.",
      "NOT_CONFIGURED",
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budgetMs());
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  let response: Response;
  try {
    response = await fetch(new URL("/scan", base), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new WorkerError(
      aborted
        ? "Le worker navigateur n'a pas répondu dans le temps imparti."
        : "Le worker navigateur est injoignable.",
      aborted ? "TIMEOUT" : "UNREACHABLE",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }

  if (!response.ok) {
    // Le message du worker porte le détail utile (site injoignable, bandeau
    // non résolu, saturation). On le remonte tel quel : le masquer derrière
    // un « erreur interne » nous priverait du seul diagnostic disponible.
    const detail = await response
      .json()
      .then((b: unknown) =>
        typeof b === "object" && b !== null && typeof (b as { error?: unknown }).error === "string"
          ? (b as { error: string }).error
          : null,
      )
      .catch(() => null);

    const failure: WorkerFailure =
      response.status === 401 || response.status === 403
        ? "UNAUTHORIZED"
        : response.status === 503
          ? "SATURATED"
          : "REJECTED";

    throw new WorkerError(detail ?? `Le worker a refusé l'analyse (code ${response.status}).`, failure);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!looksLikeWorkerOutput(body)) {
    throw new WorkerError(
      "Le worker a répondu dans un format non reconnu.",
      "MALFORMED",
    );
  }

  return body;
}
