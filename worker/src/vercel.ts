import type { IncomingMessage, ServerResponse } from "node:http";
import { handleWorkerRequest, MAX_BODY_BYTES } from "./handler.ts";

/**
 * Le worker en fonction Vercel.
 *
 * Même contrat que le conteneur Docker (`POST /scan`, `GET /health`), même
 * code de traitement (`handler.ts`). Seule différence : le navigateur. Une
 * fonction ne peut pas embarquer le Chromium complet de Playwright ;
 * `@sparticuz/chromium` fournit un Chromium compressé pour l'environnement
 * Linux des fonctions, décompressé dans /tmp au premier appel.
 *
 * Une instance traite une analyse à la fois : la plateforme en lance d'autres
 * si plusieurs arrivent ensemble. Il n'y a donc pas de limite de concurrence
 * à gérer ici.
 *
 * Ce fichier n'est jamais exécuté tel quel : `scripts/build-vercel.mjs` le
 * regroupe dans la sortie de build (Build Output API).
 */

async function readBody(req: IncomingMessage): Promise<string | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function launchOptions() {
  // Import paresseux : le module n'existe que dans la fonction déployée.
  const { default: chromium } = await import("@sparticuz/chromium");
  return { executablePath: await chromium.executablePath(), args: chromium.args, parallel: true };
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method ?? "GET";
  // /scan et /health sont routés vers cette même fonction (config.json), qui
  // peut voir le chemin réécrit : on décide donc par la méthode. GET = sonde,
  // POST = analyse ; toute autre méthode tombe sur le 404 du traitement commun.
  const path = method === "GET" ? "/health" : method === "POST" ? "/scan" : "/";
  const isScan = path === "/scan";

  const response = await handleWorkerRequest(
    {
      method,
      path,
      authorization: req.headers["authorization"] ?? "",
      body: isScan ? await readBody(req) : "",
    },
    { launch: launchOptions, health: { host: "vercel" } },
  );

  const payload = JSON.stringify(response.body);
  res.writeHead(response.status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...response.headers,
  });
  res.end(payload);
}
