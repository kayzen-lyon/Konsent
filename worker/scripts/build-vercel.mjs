#!/usr/bin/env node
/**
 * Construit le worker pour Vercel, au format Build Output API v3.
 *
 *   .vercel/output/
 *     config.json                     routes : /scan et /health → la fonction
 *     functions/scan.func/
 *       index.mjs                     src/vercel.ts regroupé par esbuild
 *       .vc-config.json               Node, 2 Go, 90 s, Paris
 *       package.json + node_modules/  playwright-core et @sparticuz/chromium
 *
 * Pourquoi ne pas laisser Vercel construire seul : le Chromium allégé est un
 * binaire compressé que l'analyse automatique des dépendances n'embarque pas
 * de façon fiable, et le code du worker importe ses modules avec l'extension
 * `.ts` (exécution directe par Node). Ici, chaque fichier de la fonction est
 * posé explicitement : ce qui part en ligne est exactement ce qui est listé.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, ".vercel", "output");
const FUNC = join(OUTPUT, "functions", "scan.func");

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const runtimeDeps = {
  "playwright-core": pkg.dependencies["playwright-core"],
  "@sparticuz/chromium": pkg.devDependencies["@sparticuz/chromium"],
};
for (const [name, version] of Object.entries(runtimeDeps)) {
  if (!version || /[\^~*]/.test(version)) {
    throw new Error(`${name} doit être épinglé à une version exacte dans package.json (lu : ${version}).`);
  }
}

rmSync(OUTPUT, { recursive: true, force: true });
mkdirSync(FUNC, { recursive: true });

// 1. Code du worker, regroupé. Les deux paquets lourds restent externes : ils
//    sont installés tels quels à côté, avec leurs fichiers binaires.
await build({
  entryPoints: [join(ROOT, "src", "vercel.ts")],
  outfile: join(FUNC, "index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: Object.keys(runtimeDeps),
  logLevel: "warning",
});

// 2. Dépendances d'exécution, installées dans la fonction elle-même.
writeFileSync(
  join(FUNC, "package.json"),
  JSON.stringify({ private: true, type: "module", dependencies: runtimeDeps }, null, 2),
);
execFileSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["install", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund", "--no-package-lock"],
  { cwd: FUNC, stdio: "inherit", shell: process.platform === "win32" },
);

// 3. Configuration de la fonction. 2 Go : plafond de l'offre Hobby, et
//    minimum conseillé pour Chromium. 90 s : une analyse en prend ~30 à 60.
writeFileSync(
  join(FUNC, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      memory: 2048,
      maxDuration: 90,
      regions: ["cdg1"],
    },
    null,
    2,
  ),
);

// 4. Routes : le contrat de l'application, rien de plus.
writeFileSync(
  join(OUTPUT, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "^/(scan|health)$", dest: "/scan" },
        { handle: "filesystem" },
        { src: "/.*", status: 404 },
      ],
    },
    null,
    2,
  ),
);

process.stdout.write(`Worker Vercel construit dans ${OUTPUT}\n`);
