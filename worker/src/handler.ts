import { timingSafeEqual } from "node:crypto";
import { runThreePhaseScan, type LaunchOptions } from "./index.ts";
import { normalizeTarget } from "./target.ts";

/**
 * Traitement d'une requête au worker, indépendant du transport.
 *
 * Le même code sert le serveur HTTP (`server.ts`, conteneur Docker) et la
 * fonction Vercel (`vercel.ts`) : le contrat vu par l'application —
 * `POST /scan` avec un jeton Bearer, `GET /health` — ne dépend donc pas de
 * l'hébergement. Les garde-fous non plus : sans secret, aucune analyse ;
 * jeton comparé à durée constante ; seules les adresses publiques passent.
 */

export interface WorkerRequest {
  method: string;
  path: string;
  authorization: string;
  /** Corps brut, `null` s'il dépasse la taille admise. */
  body: string | null;
}

export interface WorkerResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

/** Plafond de durée d'une analyse, pare-feu contre une page qui ne se stabilise jamais. */
const SCAN_TIMEOUT_MS = Number(process.env["KONSENT_WORKER_TIMEOUT_MS"] ?? 120_000);

/** Taille maximale du corps : une URL tient dans 8 Ko. */
export const MAX_BODY_BYTES = 8_192;

/**
 * Comparaison à durée constante du jeton partagé.
 *
 * Un `===` sur un secret fuit sa longueur et son préfixe par le temps de
 * réponse. Le worker est joignable depuis le réseau : c'est exactement le
 * genre de détail que nous relevons chez les autres.
 */
function secretMatches(provided: string, secret: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Analyse interrompue après ${Math.round(ms / 1000)} s.`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export async function handleWorkerRequest(
  req: WorkerRequest,
  options: {
    /** Options de lancement, ou fonction qui les prépare (appelée après authentification). */
    launch?: LaunchOptions | (() => Promise<LaunchOptions>);
    health?: Record<string, unknown>;
  } = {},
): Promise<WorkerResponse> {
  // Sonde de disponibilité — sans secret, elle ne révèle rien d'exploitable.
  if (req.method === "GET" && req.path === "/health") {
    return { status: 200, body: { ok: true, engine: "headless", ...options.health } };
  }

  if (req.method !== "POST" || req.path !== "/scan") {
    return { status: 404, body: { error: "Point d'entrée inconnu. Utiliser POST /scan." } };
  }

  // Sans secret configuré, le service refuse de démarrer une analyse. Un
  // worker ouvert serait un scanner gratuit pour n'importe qui, et notre
  // user-agent porterait la responsabilité du trafic.
  const secret = process.env["KONSENT_WORKER_SECRET"] ?? "";
  if (!secret) {
    return {
      status: 503,
      body: {
        error:
          "Worker non configuré : la variable KONSENT_WORKER_SECRET est absente. Aucune analyse n'est acceptée sans elle.",
      },
    };
  }

  const token = req.authorization.startsWith("Bearer ") ? req.authorization.slice(7) : "";
  if (!secretMatches(token, secret)) {
    return { status: 401, body: { error: "Jeton absent ou invalide." } };
  }

  if (req.body === null) {
    return { status: 413, body: { error: "Corps de requête trop volumineux." } };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(req.body);
  } catch {
    return { status: 400, body: { error: "Corps de requête JSON invalide." } };
  }

  const target =
    typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)["url"]
      : undefined;
  if (typeof target !== "string") {
    return { status: 400, body: { error: "Champ « url » manquant." } };
  }

  const url = normalizeTarget(target);
  if (!url) {
    return {
      status: 400,
      body: {
        error: "Adresse invalide, ou non publique. Seules les adresses routables sont analysées.",
      },
    };
  }

  const started = Date.now();
  try {
    const launch =
      typeof options.launch === "function" ? await options.launch() : options.launch;
    const output = await withTimeout(runThreePhaseScan(url.toString(), launch), SCAN_TIMEOUT_MS);
    return { status: 200, body: output };
  } catch (error) {
    // Sans cette ligne, un échec ne laisse aucune trace. Première ligne
    // seulement, adresses masquées : l'adresse analysée n'est pas journalisée.
    const reason = error instanceof Error ? error.message.split("\n")[0] : "inconnue";
    const masked = (reason ?? "").replace(/https?:\/\/\S+/g, "[adresse]");
    process.stderr.write(`analyse : échec après ${Date.now() - started} ms (${masked})\n`);
    return {
      status: 502,
      body: { error: error instanceof Error ? error.message : "Analyse impossible." },
    };
  }
}
