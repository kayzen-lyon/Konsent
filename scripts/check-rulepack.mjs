#!/usr/bin/env node
/**
 * Garde-fou du rulepack, exécuté en CI.
 *
 * Il vérifie la propriété qui fait tenir tout le produit : une règle que le
 * moteur ne sait pas décider ne doit JAMAIS pouvoir être comptée comme
 * satisfaite. Cette propriété reposait jusqu'ici sur la discipline du
 * développeur — donc sur rien.
 *
 * Le fichier est volontairement sans dépendance et lit les sources comme du
 * texte : un contrôle d'intégrité ne doit pas dépendre de la chaîne de build
 * qu'il est censé surveiller.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const FAMILIES_DIR = join(ROOT, "lib", "rulepack", "families");
const EVALUATE = join(ROOT, "lib", "engine", "evaluate.ts");

const errors = [];
const warnings = [];

/* ---------------------------------------------------- lecture des règles */

/** Effectifs attendus par famille, repris des tableaux du PRD §6. */
const EXPECTED_BY_FAMILY = {
  DEPOT: 14,
  REFUS: 10,
  BANNER: 22,
  EXEMPT: 6,
  STORAGE: 9,
  FP: 8,
  CONSENT: 7,
  TRANSFER: 12,
  VENDOR: 7,
  TCF: 8,
  CMV2: 6,
  DOC: 18,
  SPECIAL: 6,
  SEC: 6,
};

const rules = [];
for (const file of readdirSync(FAMILIES_DIR).filter((f) => f.endsWith(".ts"))) {
  const src = readFileSync(join(FAMILIES_DIR, file), "utf8");
  // Un bloc de règle commence à `id:` et porte `family:` et `engine:` avant
  // le `id:` suivant. On découpe sur `id:` plutôt que d'écrire un parseur.
  const blocks = src.split(/\n\s*id:\s*"/).slice(1);
  for (const block of blocks) {
    const id = block.slice(0, block.indexOf('"'));
    const family = block.match(/family:\s*"([A-Z0-9]+)"/)?.[1];
    const engine = block.match(/engine:\s*"(static|headless)"/)?.[1];
    const weight = Number(block.match(/weight:\s*(\d+)/)?.[1] ?? NaN);
    const severity = block.match(/severity:\s*"([A-Z]+)"/)?.[1];
    if (!family || !engine) {
      errors.push(`${file} — règle ${id} : \`family\` ou \`engine\` introuvable.`);
      continue;
    }
    rules.push({ id, family, engine, weight, severity, file });
  }
}

/* -------------------------------------------------------- 1. unicité des id */

const seen = new Map();
for (const r of rules) {
  if (seen.has(r.id)) {
    errors.push(`Identifiant en double : ${r.id} (${seen.get(r.id)} et ${r.file}).`);
  }
  seen.set(r.id, r.file);
}

/* ------------------------------------------- 2. cohérence id / famille */

for (const r of rules) {
  const prefix = r.id.split("-")[1];
  if (prefix !== r.family) {
    errors.push(`${r.id} : préfixe d'identifiant « ${prefix} » ≠ famille « ${r.family} ».`);
  }
}

/* --------------------------------------------- 3. effectifs par famille */

const counts = {};
for (const r of rules) counts[r.family] = (counts[r.family] ?? 0) + 1;
for (const [family, expected] of Object.entries(EXPECTED_BY_FAMILY)) {
  const actual = counts[family] ?? 0;
  if (actual !== expected) {
    errors.push(`Famille ${family} : ${actual} règles, ${expected} attendues (PRD §6).`);
  }
}
for (const family of Object.keys(counts)) {
  if (!(family in EXPECTED_BY_FAMILY)) {
    errors.push(`Famille ${family} inconnue du PRD §6.`);
  }
}

/* ------------------------- 4. LE contrôle central : décidabilité statique */

const evaluateSrc = readFileSync(EVALUATE, "utf8");
const referenced = new Set(evaluateSrc.match(/KZC-[A-Z0-9]+-\d+/g) ?? []);

/**
 * Règles `static` que le moteur ne sait pas encore décider.
 *
 * La liste n'est pas recopiée ici : elle est LUE dans `lib/engine/coverage.ts`,
 * le fichier que le moteur utilise réellement. Une liste dupliquée finirait par
 * diverger, et le contrôle validerait alors une couverture imaginaire.
 */
const coverageSrc = readFileSync(join(ROOT, "lib", "engine", "coverage.ts"), "utf8");
const DECLARED_UNIMPLEMENTED = new Set(
  (coverageSrc.match(/"KZC-[A-Z0-9]+-\d+"/g) ?? []).map((s) => s.slice(1, -1)),
);
if (DECLARED_UNIMPLEMENTED.size === 0) {
  errors.push("lib/engine/coverage.ts : aucune règle lue. Le contrôle de couverture serait vide.");
}

const staticRules = rules.filter((r) => r.engine === "static");
for (const r of staticRules) {
  const implemented = referenced.has(r.id);
  const declared = DECLARED_UNIMPLEMENTED.has(r.id);
  if (!implemented && !declared) {
    errors.push(
      `${r.id} est \`static\` mais n'a aucun détecteur dans evaluate.ts et n'est pas déclarée ` +
        `dans DECLARED_UNIMPLEMENTED. Elle serait comptée comme satisfaite — interdit (§5.4).`,
    );
  }
  if (implemented && declared) {
    warnings.push(`${r.id} est déclarée non implémentée mais evaluate.ts la référence.`);
  }
}

/* ------------------------------------------- 5. cohérence sévérité / poids */

const MIN_WEIGHT = { CRITICAL: 15, MAJOR: 6, MODERATE: 2, MINOR: 1, INFO: 0 };
for (const r of rules) {
  if (!Number.isFinite(r.weight) || !r.severity) continue;
  const floor = MIN_WEIGHT[r.severity];
  if (floor === undefined) continue;
  if (r.severity === "INFO" && r.weight !== 0) {
    errors.push(`${r.id} : sévérité INFO mais poids ${r.weight}. Une information ne retire pas de points.`);
  } else if (r.severity !== "INFO" && r.weight < floor) {
    warnings.push(`${r.id} : sévérité ${r.severity} avec un poids de ${r.weight} (plancher ${floor}).`);
  }
}

/* ------------------------------------------------------------- rapport */

const total = rules.length;
const staticCount = staticRules.length;
const decidable = staticRules.filter((r) => referenced.has(r.id)).length;

console.log(`Rulepack : ${total} règles, ${staticCount} statiques dont ${decidable} décidables sans navigateur.`);
console.log(`Familles : ${Object.entries(counts).map(([f, n]) => `${f} ${n}`).join(" · ")}`);

for (const w of warnings) console.warn(`  avertissement — ${w}`);

if (errors.length > 0) {
  console.error(`\n${errors.length} erreur(s) :`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log("Contrôles du rulepack : conformes.");
