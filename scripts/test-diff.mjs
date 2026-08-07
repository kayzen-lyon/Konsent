/**
 * Vérifie que le moteur de différentiel détecte réellement une régression.
 *
 * Méthode : on scanne un site, puis on fabrique une référence ANTÉRIEURE
 * artificiellement plus propre (moins d'écarts, moins de destinataires). Le
 * diff doit alors signaler l'apparition de tout ce qui manque à la référence.
 */
import { runScan } from "../lib/engine/scan.ts";
import { createBaseline, decodeBaseline, encodeBaseline } from "../lib/monitoring/baseline.ts";
import { alertSummary, diffAgainstBaseline } from "../lib/monitoring/diff.ts";

const target = process.argv[2] ?? "cnil.fr";
const scan = await runScan(target);

const real = createBaseline(scan);
const ruleIds = Object.keys(real.f);
const vendorSlugs = [...real.d];

// Référence « d'hier » : deux écarts et un destinataire de moins.
const cleaner = {
  ...real,
  t: new Date(Date.now() - 30 * 86_400_000).toISOString(),
  s: Math.min(100, real.s + 12),
  f: Object.fromEntries(Object.entries(real.f).slice(2)),
  d: vendorSlugs.slice(1),
  j: real.j,
  p: [...real.p, "cookies"].filter((v, i, a) => a.indexOf(v) === i),
};

const diff = diffAgainstBaseline(cleaner, scan);

console.log(`=== ${scan.hostname} ===`);
console.log(`référence simulée : score ${cleaner.s}, ${Object.keys(cleaner.f).length} écarts, ${cleaner.d.length} destinataires`);
console.log(`analyse actuelle  : score ${scan.score}, ${ruleIds.length} écarts, ${vendorSlugs.length} destinataires`);
console.log("");
console.log(`régressions détectées : ${diff.regressions}`);
console.log(`améliorations         : ${diff.improvements}`);
console.log("");
for (const c of diff.changes) {
  console.log(`  ${c.regression ? "REGRESSION" : "amélioration"}  [${c.kind}] ${c.title}`);
}
console.log("");
console.log("alerte :", alertSummary(diff) ?? "(aucune)");

// Contrôle d'intégrité du jeton.
const token = encodeBaseline(real);
const roundTrip = decodeBaseline(token);
const tampered = decodeBaseline(token.slice(0, -1) + "X");

console.log("");
console.log("aller-retour du jeton :", roundTrip?.h === real.h ? "OK" : "ECHEC");
console.log("jeton altéré rejeté   :", tampered === null ? "OK" : "ECHEC");

const expected = diff.regressions > 0 && roundTrip?.h === real.h && tampered === null;
process.exitCode = expected ? 0 : 1;
