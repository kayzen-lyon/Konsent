import { createServer } from "node:http";
import { handleWorkerRequest, MAX_BODY_BYTES } from "./handler.ts";

/**
 * Service HTTP du worker navigateur (conteneur Docker, poste de travail).
 *
 * L'application appelle `POST /scan`, reçoit l'observation en trois phases,
 * et l'évalue avec le même référentiel. Le worker reste ignorant du métier —
 * il observe et rend son instantané. La logique de la requête (secret,
 * validation, analyse) vit dans `handler.ts`, partagée avec la fonction
 * Vercel ; ce fichier n'ajoute que ce qui tient au serveur : la limite
 * d'analyses simultanées et l'arrêt propre.
 *
 * Il n'écrit rien, ne conserve rien, ne partage aucun état entre deux
 * analyses : un navigateur est lancé puis fermé à chaque requête (§5.2).
 */

const PORT = Number(process.env["PORT"] ?? 8080);

/**
 * Un scan `quick` occupe ~40 s de CPU et de mémoire (§14.2 : 3 scans
 * concurrents pour 4 vCPU / 8 Go). Au-delà, on refuse explicitement plutôt
 * que de faire tomber l'instance entière et d'échouer aussi les analyses
 * déjà en cours.
 */
const MAX_CONCURRENT = Number(process.env["KONSENT_WORKER_CONCURRENCY"] ?? 3);
let inFlight = 0;

function json(
  res: import("node:http").ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": String(Buffer.byteLength(payload)),
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(payload);
}

/** Corps de requête, plafonné. */
async function readBody(req: import("node:http").IncomingMessage): Promise<string | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const server = createServer((req, res) => {
  void (async () => {
    const method = req.method ?? "GET";
    const path = (req.url ?? "/").split("?")[0] ?? "/";
    const isScan = method === "POST" && path === "/scan";

    if (isScan && inFlight >= MAX_CONCURRENT) {
      json(
        res,
        503,
        { error: `Worker saturé (${inFlight}/${MAX_CONCURRENT} analyses en cours).` },
        { "Retry-After": "60" },
      );
      return;
    }

    if (isScan) inFlight += 1;
    try {
      const response = await handleWorkerRequest(
        {
          method,
          path,
          authorization: req.headers["authorization"] ?? "",
          body: isScan ? await readBody(req) : "",
        },
        { health: { inFlight, maxConcurrent: MAX_CONCURRENT } },
      );
      json(res, response.status, response.body, response.headers);
    } finally {
      if (isScan) inFlight -= 1;
    }
  })();
});

server.listen(PORT, () => {
  process.stdout.write(
    `Worker Konsent à l'écoute sur :${PORT} — ${MAX_CONCURRENT} analyse(s) concurrente(s), ` +
      `secret ${process.env["KONSENT_WORKER_SECRET"] ? "configuré" : "ABSENT (analyses refusées)"}.\n`,
  );
});

// Arrêt propre : on laisse les analyses en cours se terminer plutôt que de
// rendre une erreur à un client qui attend depuis 40 secondes.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
