/**
 * Client de test du serveur MCP.
 *
 * Démarre le serveur en sous-processus, dialogue en JSON-RPC sur stdio, et
 * vérifie les deux garanties de conception : l'avertissement présent dans
 * chaque réponse, et la couverture systématiquement renvoyée.
 *
 *   node test-client.mjs [url-de-l-api]
 */
import { spawn } from "node:child_process";

const API = process.argv[2] ?? "http://localhost:3114";

const child = spawn("node", ["--experimental-strip-types", "src/index.ts"], {
  stdio: ["pipe", "pipe", "pipe"],
  env: { ...process.env, KONSENT_API_URL: API },
});

child.stderr.on("data", (d) => process.stderr.write(`[serveur] ${d}`));

let buffer = "";
const pending = new Map();

child.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  let index;
  while ((index = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      const resolve = pending.get(msg.id);
      if (resolve) {
        pending.delete(msg.id);
        resolve(msg);
      }
    } catch {
      // Ligne non JSON : ignorée.
    }
  }
});

let nextId = 1;
function call(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, resolve);
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    setTimeout(() => reject(new Error(`Délai dépassé sur ${method}`)), 90_000);
  });
}

let failures = 0;
const check = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
};

try {
  await call("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "konsent-test", version: "0" },
  });
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);

  const tools = await call("tools/list", {});
  const names = tools.result.tools.map((t) => t.name);
  console.log(`\noutils exposés (${names.length}) : ${names.join(", ")}\n`);
  check("six outils exposés", names.length === 6);

  const scan = await call("tools/call", {
    name: "konsent_scan_url",
    arguments: { url: "cnil.fr" },
  });
  const payload = JSON.parse(scan.result.content[0].text);
  console.log(
    `scan : ${payload.scan.hostname} — score ${payload.scan.score} (${payload.scan.grade}), ` +
      `${payload.findingCount} écarts, ${payload.vendors.length} destinataires\n`,
  );
  check("avertissement présent dans la réponse", typeof payload.disclaimer === "string");
  check("couverture renvoyée", Array.isArray(payload.coverage?.notEvaluated));
  check(
    "règles non évaluées listées",
    payload.coverage.notEvaluated.length > 0 && payload.coverage.notEvaluated.length < 96,
  );

  const transfers = await call("tools/call", {
    name: "konsent_transfer_analysis",
    arguments: { url: "cnil.fr" },
  });
  const tp = JSON.parse(transfers.result.content[0].text);
  console.log(`transferts hors EEE : ${tp.outsideEeaCount} — ${JSON.stringify(tp.byJurisdiction)}\n`);
  check("analyse des transferts avec avertissement", typeof tp.disclaimer === "string");

  const filtered = await call("tools/call", {
    name: "konsent_list_findings",
    arguments: { url: "cnil.fr", severity: "MAJOR" },
  });
  const fp = JSON.parse(filtered.result.content[0].text);
  check(
    "filtre par gravité appliqué",
    fp.findings.every((f) => f.severity === "MAJOR"),
  );

  const resources = await call("resources/list", {});
  check("deux ressources exposées", resources.result.resources.length === 2);

  const rulepack = await call("resources/read", { uri: "konsent://rulepack" });
  const rp = JSON.parse(rulepack.result.contents[0].text);
  console.log(`\nréférentiel lu : version ${rp.version}, ${rp.rules.length} règles`);
  check("référentiel lisible en ressource", rp.rules.length > 50);

  const bad = await call("tools/call", {
    name: "konsent_scan_url",
    arguments: { url: "domaine-qui-nexiste-pas-du-tout-xyzzy.invalid" },
  });
  const bp = JSON.parse(bad.result.content[0].text);
  check("erreur porteuse de l'avertissement", typeof bp.disclaimer === "string" && bp.error);
} catch (error) {
  console.error("Échec :", error.message);
  failures += 1;
} finally {
  child.kill();
}

console.log(failures === 0 ? "\nTous les contrôles passent." : `\n${failures} échec(s).`);
process.exit(failures === 0 ? 0 : 1);
