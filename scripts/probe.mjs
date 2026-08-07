/**
 * Sonde de développement : exécute un scan réel en ligne de commande et
 * affiche le résultat brut. Sert à vérifier le moteur sans passer par l'UI.
 *
 *   node scripts/probe.mjs exemple.fr
 */
import { runScan } from "../lib/engine/scan.ts";

const target = process.argv[2];
if (!target) {
  console.error("Usage : node scripts/probe.mjs <domaine>");
  process.exit(1);
}

const r = await runScan(target);

console.log(`=== ${r.hostname} ===`);
console.log(
  `score : ${r.score} ${r.grade} (${r.gradeLabel})${r.cappedBy ? ` | plafonné : ${r.cappedBy}` : ""}`,
);
console.log(`durée : ${r.durationMs} ms | pages analysées : ${r.observation.pagesAnalyzed}`);
console.log(`CMP   : ${JSON.stringify(r.observation.cmp)}`);
console.log(`vendors (${r.vendors.length}) : ${r.vendors.map((v) => v.name).join(", ") || "(aucun)"}`);
console.log(
  `hors EEE : ${r.outsideEea.map((v) => `${v.name}/${v.effectiveJurisdiction}`).join(", ") || "(aucun)"}`,
);
console.log(
  `pages légales : ${r.observation.legalPages.map((p) => p.kind + (p.reachable ? "✓" : "✗")).join(" ") || "(aucune)"}`,
);
console.log(`constats (${r.findings.length}) :`);
for (const f of r.findings) {
  console.log(`  [${f.severity.padEnd(8)}] ${f.ruleId} x${f.occurrences} — ${f.title}`);
}
console.log(`non évalué : ${r.notEvaluatedRuleIds.length} règles (moteur headless requis)`);
