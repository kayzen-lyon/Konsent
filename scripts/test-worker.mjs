/**
 * Contrôles du branchement worker ↔ application.
 *
 * Ce qui se joue ici est le jalon P0 : jusqu'à ce branchement, l'inconnu qui
 * saisissait son domaine obtenait le moteur statique, soit 63 règles sur 139.
 * Deux familles de défauts sont possibles, et aucune ne se voit à l'usage :
 *
 *  1. Le worker accepte une adresse non routable et devient un relais vers le
 *     réseau interne de l'hébergeur. Personne ne s'en aperçoit avant l'incident.
 *  2. L'application sert un rapport statique en le présentant comme complet.
 *     Le rapport est joli, le score est bon, et 76 règles jamais regardées
 *     passent pour satisfaites — exactement ce que le produit reproche au marché.
 *
 * Les deux sont testés sans réseau externe et sans navigateur.
 */
import { createServer } from "node:http";
import { normalizeTarget as workerTarget, isPublicHost } from "../worker/src/target.ts";
import { normalizeTarget as appTarget } from "../lib/engine/scan.ts";
import {
  WorkerError,
  isWorkerConfigured,
  requestWorkerScan,
} from "../lib/engine/worker-client.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

/* ═══════════════════════════════ garde-fou SSRF ═══════════════════════════ */

console.log("Adresses refusées par le worker");

const PRIVATE = [
  "localhost",
  "http://localhost:8080",
  "127.0.0.1",
  "http://127.0.0.53/",
  "0.0.0.0",
  "10.0.0.1",
  "192.168.1.1",
  "172.16.0.1",
  "172.31.255.255",
  // Le point d'entrée des métadonnées cloud. Le cas qui compte vraiment.
  "http://169.254.169.254/latest/meta-data/",
  "http://[::1]/",
  "http://[fd00::1]/",
  "machine.local",
  "api.internal",
  "app.localhost",
  // Nom sans point : résolu par le suffixe de recherche DNS de l'hôte.
  "intranet",
  // Protocoles hors HTTP : lecture du disque du worker.
  "file:///etc/passwd",
  "ftp://exemple.fr",
  "",
  "   ",
];

for (const bad of PRIVATE) {
  check(`refusée : ${JSON.stringify(bad)}`, workerTarget(bad) === null);
}

console.log("\nAdresses acceptées par le worker");
for (const good of ["exemple.fr", "www.exemple.fr", "https://exemple.fr/page?a=1", "http://sous.exemple.co.uk"]) {
  check(`acceptée : ${good}`, workerTarget(good) !== null);
}

/* ─────────────────── les deux garde-fous doivent rester d'accord ─────────── */

console.log("\nConcordance application ↔ worker");

// Le contrôle est volontairement dupliqué (le worker ne dépend pas de
// l'application). Une divergence ouvrirait un trou du côté le plus permissif,
// sans qu'aucun des deux fichiers ne paraisse fautif isolément.
for (const target of [...PRIVATE, "exemple.fr", "https://exemple.fr/page", "www.exemple.fr"]) {
  const workerAccepts = workerTarget(target) !== null;
  let appAccepts = true;
  try {
    appTarget(target);
  } catch {
    appAccepts = false;
  }
  check(
    `même verdict sur ${JSON.stringify(target)}`,
    workerAccepts === appAccepts,
    `worker ${workerAccepts ? "accepte" : "refuse"}, application ${appAccepts ? "accepte" : "refuse"}`,
  );
}

check("un hôte public est reconnu", isPublicHost("exemple.fr"));
check("un hôte de bouclage ne l'est pas", !isPublicHost("127.0.0.1"));

/* ═══════════════════════════ client du worker ════════════════════════════ */

console.log("\nDétection de configuration");

delete process.env.KONSENT_WORKER_URL;
delete process.env.KONSENT_WORKER_SECRET;
check("worker non configuré sans variables", !isWorkerConfigured());

process.env.KONSENT_WORKER_URL = "http://127.0.0.1:9";
check("une URL seule ne suffit pas", !isWorkerConfigured());

process.env.KONSENT_WORKER_SECRET = "jeton";
check("URL + secret : configuré", isWorkerConfigured());

/**
 * Serveur factice tenant lieu de worker. On teste le CLIENT, pas Chromium :
 * lancer un vrai navigateur ici rendrait `npm run check` dépendant d'une
 * installation Playwright et d'un accès réseau.
 */
const VALID_OUTPUT = {
  url: "https://exemple.fr/",
  mode: "headless",
  scannedAt: new Date(0).toISOString(),
  bannerResolution: "UNRESOLVED",
  banner: { resolution: "UNRESOLVED", clicksToReject: null, clicksToAccept: null, hasRejectAtFirstLevel: false },
  snapshots: [
    {
      phase: "A",
      requests: [],
      cookies: [],
      localStorage: {},
      sessionStorage: {},
      serviceWorkers: [],
      fingerprinting: {},
      consentMode: null,
      tcString: null,
    },
  ],
};

let behaviour = "ok";
const stub = createServer((req, res) => {
  const send = (status, body) => {
    const payload = JSON.stringify(body);
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(payload);
  };

  if (behaviour === "unauthorized") return send(401, { error: "Jeton absent ou invalide." });
  if (behaviour === "saturated") return send(503, { error: "Worker saturé (3/3 analyses en cours)." });
  if (behaviour === "rejected") return send(502, { error: "Le site n'a pas répondu." });
  if (behaviour === "malformed") return send(200, { url: "https://exemple.fr/" });
  if (behaviour === "slow") return; // aucune réponse : la requête doit expirer.

  // Le jeton doit voyager en en-tête, jamais en paramètre d'URL.
  if (req.headers.authorization !== "Bearer jeton-de-test") {
    return send(401, { error: "Jeton absent ou invalide." });
  }
  send(200, VALID_OUTPUT);
});

await new Promise((resolve) => stub.listen(0, "127.0.0.1", resolve));
const port = stub.address().port;

process.env.KONSENT_WORKER_URL = `http://127.0.0.1:${port}`;
process.env.KONSENT_WORKER_SECRET = "jeton-de-test";
process.env.KONSENT_WORKER_TIMEOUT_MS = "700";

const failureOf = async (target = "exemple.fr") => {
  try {
    await requestWorkerScan(target);
    return null;
  } catch (error) {
    return error instanceof WorkerError ? error.failure : `INATTENDU:${error}`;
  }
};

console.log("\nAppel du worker");

const output = await requestWorkerScan("exemple.fr");
check("une réponse valide est renvoyée telle quelle", output.url === VALID_OUTPUT.url);
check("les instantanés sont préservés", output.snapshots.length === 1);

behaviour = "unauthorized";
check("401 → UNAUTHORIZED", (await failureOf()) === "UNAUTHORIZED");

behaviour = "saturated";
check("503 → SATURATED", (await failureOf()) === "SATURATED");

behaviour = "rejected";
check("502 → REJECTED", (await failureOf()) === "REJECTED");

behaviour = "malformed";
check("réponse tronquée → MALFORMED", (await failureOf()) === "MALFORMED");

behaviour = "slow";
check("absence de réponse → TIMEOUT", (await failureOf()) === "TIMEOUT");

stub.close();
stub.closeAllConnections?.();

behaviour = "ok";
check("worker éteint → UNREACHABLE", (await failureOf()) === "UNREACHABLE");

delete process.env.KONSENT_WORKER_URL;
delete process.env.KONSENT_WORKER_SECRET;
check("worker non configuré → NOT_CONFIGURED", (await failureOf()) === "NOT_CONFIGURED");

/* ═══════════════════════ honnêteté de la dégradation ═════════════════════ */

console.log("\nDégradation déclarée");

// Import tardif : `orchestrate.ts` lit l'environnement à l'appel, mais on veut
// être certain qu'aucun état de configuration n'a été figé à l'import.
const { runVerdictScan } = await import("../lib/engine/orchestrate.ts");

// Une adresse non routable doit être refusée AVANT tout appel réseau, quel que
// soit le moteur : l'erreur ne dépend pas de la présence du worker.
let refused = false;
try {
  await runVerdictScan("http://169.254.169.254/");
} catch {
  refused = true;
}
check("l'orchestrateur refuse une adresse non routable", refused);

// Chaque motif d'échec doit porter une phrase destinée au lecteur. Un motif
// sans phrase produirait un rapport dégradé muet — le défaut que ce module
// existe précisément pour empêcher.
const source = await import("node:fs").then((fs) =>
  fs.readFileSync(new URL("../lib/engine/orchestrate.ts", import.meta.url), "utf8"),
);
for (const failure of [
  "NOT_CONFIGURED",
  "UNAUTHORIZED",
  "SATURATED",
  "TIMEOUT",
  "UNREACHABLE",
  "REJECTED",
  "MALFORMED",
]) {
  check(`${failure} porte un motif affichable`, new RegExp(`${failure}:\\s*\\n?\\s*"`).test(source));
}

/* ═══════════════ pas de fausse alerte au changement de moteur ════════════ */

console.log("\nDifférentiel entre deux moteurs");

const { createBaseline, decodeBaseline, encodeBaseline, baselineMode } = await import(
  "../lib/monitoring/baseline.ts"
);
const { diffAgainstBaseline, alertSummary } = await import("../lib/monitoring/diff.ts");

/** Squelette de `ScanResult` suffisant pour le différentiel. */
const scanStub = (mode, findings, vendors) => ({
  id: "test",
  url: "https://exemple.fr/",
  finalUrl: "https://exemple.fr/",
  hostname: "exemple.fr",
  mode,
  rulepackVersion: "1.0.0",
  scannedAt: new Date(0).toISOString(),
  durationMs: 1,
  score: mode === "headless" ? 40 : 90,
  grade: mode === "headless" ? "E" : "A",
  gradeLabel: "test",
  findings,
  notEvaluatedRuleIds: [],
  observation: { legalPages: [] },
  vendors,
  outsideEea: [],
});

const FINDING = {
  ruleId: "KZC-DEPOT-001",
  severity: "CRITICAL",
  family: "DEPOT",
  title: "Dépôt avant consentement",
  occurrences: 3,
  evidence: [],
};
const VENDOR = { slug: "fixture-vendor", name: "V", effectiveJurisdiction: "US", adequacy: "NONE" };

// Cas réel : la référence a été prise en navigateur (beaucoup de constats),
// la comparaison retombe en statique parce que le worker était indisponible.
const headlessBaseline = createBaseline(scanStub("headless", [FINDING], [VENDOR]));
const staticNow = diffAgainstBaseline(headlessBaseline, scanStub("static", [], []));

check("le changement de moteur est détecté", staticNow.engineChanged);
check("la comparaison est déclarée non concluante", !staticNow.conclusive);
check("aucune régression n'est comptée", staticNow.regressions === 0);
check("aucune amélioration n'est comptée", staticNow.improvements === 0);
check("aucune alerte n'est produite", alertSummary(staticNow) === null);
check(
  "les changements restent listés pour lecture",
  staticNow.changes.some((c) => c.kind === "engine_changed"),
);
check(
  "aucun changement n'est présenté comme une régression",
  staticNow.changes.every((c) => c.regression === false),
);

// Sens inverse : référence statique, analyse navigateur. C'est celui qui
// enverrait un courriel nominatif pour des « nouveaux traceurs » qui étaient
// là depuis toujours.
const staticBaseline = createBaseline(scanStub("static", [], []));
const headlessNow = diffAgainstBaseline(staticBaseline, scanStub("headless", [FINDING], [VENDOR]));
check("sens inverse : non concluant", !headlessNow.conclusive);
check("sens inverse : aucune alerte", alertSummary(headlessNow) === null);

// À moteur identique, le différentiel doit continuer à alerter normalement —
// sans quoi ce garde-fou aurait éteint la surveillance entière.
const sameEngine = diffAgainstBaseline(staticBaseline, scanStub("static", [FINDING], [VENDOR]));
check("à moteur identique : concluant", sameEngine.conclusive);
check("à moteur identique : la régression est comptée", sameEngine.regressions > 0);
check("à moteur identique : l'alerte part", typeof alertSummary(sameEngine) === "string");

// Jeton émis avant ce changement : aucun champ de mode. Le lire comme
// `headless` ferait passer une référence pauvre pour une référence complète.
const legacy = decodeBaseline(encodeBaseline({ ...staticBaseline, m: undefined }));
check("un jeton sans mode est lu comme statique", baselineMode(legacy) === "static");
check(
  "un jeton ancien reste comparable à une analyse statique",
  diffAgainstBaseline(legacy, scanStub("static", [], [])).conclusive,
);

/* ────────────────────────────────────────────────────────────────────────── */

console.log(
  failures === 0
    ? `\nContrôles du worker : tous passés.`
    : `\n${failures} contrôle(s) en échec.`,
);
process.exit(failures === 0 ? 0 : 1);
