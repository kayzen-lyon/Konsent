import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { runThreePhaseScan } from "./index.ts";
import { normalizeTarget } from "./target.ts";

/**
 * Service HTTP du worker navigateur.
 *
 * Jusqu'ici le worker n'était qu'une commande : on l'exécutait à la main, on
 * poussait sa sortie dans `/api/ingest`. C'est ce qui laissait le jalon P0
 * ouvert — l'inconnu qui saisit son domaine sur le site obtenait le moteur
 * statique, donc 43 règles décidées sur 139.
 *
 * Ce serveur est le maillon manquant : l'application appelle `POST /scan`,
 * reçoit l'observation en trois phases, et l'évalue avec le même référentiel.
 * Le worker reste ignorant du métier — il observe et rend son instantané.
 *
 * Il n'écrit rien, ne conserve rien, ne partage aucun état entre deux
 * analyses : un navigateur est lancé puis fermé à chaque requête (§5.2).
 */

const PORT = Number(process.env["PORT"] ?? 8080);
const SECRET = process.env["KONSENT_WORKER_SECRET"] ?? "";

/**
 * Un scan `quick` occupe ~40 s de CPU et de mémoire (§14.2 : 3 scans
 * concurrents pour 4 vCPU / 8 Go). Au-delà, on refuse explicitement plutôt
 * que de faire tomber l'instance entière et d'échouer aussi les analyses
 * déjà en cours.
 */
const MAX_CONCURRENT = Number(process.env["KONSENT_WORKER_CONCURRENCY"] ?? 3);
let inFlight = 0;

/** Plafond de durée d'une analyse, pare-feu contre une page qui ne se stabilise jamais. */
const SCAN_TIMEOUT_MS = Number(process.env["KONSENT_WORKER_TIMEOUT_MS"] ?? 120_000);

/**
 * Comparaison à durée constante du jeton partagé.
 *
 * Un `===` sur un secret fuit sa longueur et son préfixe par le temps de
 * réponse. Le worker est joignable depuis le réseau : c'est exactement le
 * genre de détail que nous relevons chez les autres.
 */
function secretMatches(provided: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(SECRET);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function json(
  res: import("node:http").ServerResponse,
  status: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

/** Corps de requête, plafonné : une URL tient dans 8 Ko. */
async function readBody(req: import("node:http").IncomingMessage): Promise<string | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 8_192) return null;
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
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

const server = createServer((req, res) => {
  void (async () => {
    const path = (req.url ?? "/").split("?")[0];

    // Sonde de disponibilité — sans secret, elle ne révèle rien d'exploitable.
    if (req.method === "GET" && path === "/health") {
      json(res, 200, {
        ok: true,
        engine: "headless",
        inFlight,
        maxConcurrent: MAX_CONCURRENT,
      });
      return;
    }

    if (req.method !== "POST" || path !== "/scan") {
      json(res, 404, { error: "Point d'entrée inconnu. Utiliser POST /scan." });
      return;
    }

    // Sans secret configuré, le service refuse de démarrer une analyse. Un
    // worker ouvert serait un scanner gratuit pour n'importe qui, et notre
    // user-agent porterait la responsabilité du trafic.
    if (!SECRET) {
      json(res, 503, {
        error:
          "Worker non configuré : la variable KONSENT_WORKER_SECRET est absente. Aucune analyse n'est acceptée sans elle.",
      });
      return;
    }

    const header = req.headers["authorization"] ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!secretMatches(token)) {
      json(res, 401, { error: "Jeton absent ou invalide." });
      return;
    }

    if (inFlight >= MAX_CONCURRENT) {
      res.setHeader("Retry-After", "60");
      json(res, 503, {
        error: `Worker saturé (${inFlight}/${MAX_CONCURRENT} analyses en cours).`,
      });
      return;
    }

    const raw = await readBody(req);
    if (raw === null) {
      json(res, 413, { error: "Corps de requête trop volumineux." });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      json(res, 400, { error: "Corps de requête JSON invalide." });
      return;
    }

    const target =
      typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)["url"]
        : undefined;
    if (typeof target !== "string") {
      json(res, 400, { error: "Champ « url » manquant." });
      return;
    }

    const url = normalizeTarget(target);
    if (!url) {
      json(res, 400, {
        error: "Adresse invalide, ou non publique. Seules les adresses routables sont analysées.",
      });
      return;
    }

    inFlight += 1;
    try {
      const output = await withTimeout(runThreePhaseScan(url.toString()), SCAN_TIMEOUT_MS);
      json(res, 200, output);
    } catch (error) {
      json(res, 502, {
        error: error instanceof Error ? error.message : "Analyse impossible.",
      });
    } finally {
      inFlight -= 1;
    }
  })();
});

server.listen(PORT, () => {
  process.stdout.write(
    `Worker Konsent à l'écoute sur :${PORT} — ${MAX_CONCURRENT} analyse(s) concurrente(s), ` +
      `secret ${SECRET ? "configuré" : "ABSENT (analyses refusées)"}.\n`,
  );
});

// Arrêt propre : on laisse les analyses en cours se terminer plutôt que de
// rendre une erreur à un client qui attend depuis 40 secondes.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
