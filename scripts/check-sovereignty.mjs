#!/usr/bin/env node
/**
 * Contrôle de cohérence de souveraineté.
 *
 * Konsent vend un audit qui relève les transferts hors Union européenne et
 * fait de l'hébergement européen un argument commercial explicite (PRD §16,
 * différenciateur n°113). Ses propres fonctions ont pourtant tourné à
 * Washington — région `iad1` par défaut — pendant seize déploiements.
 *
 * Ce n'est pas une faute technique : le site fonctionnait. C'est une faute de
 * cohérence, et c'est plus grave, parce que le produit tout entier repose sur
 * le droit d'exiger des autres ce qu'on s'applique à soi-même. Un concurrent
 * ou un journaliste qui le remarque n'a plus qu'une phrase à écrire.
 *
 * Le contrôle est donc en CI, au même titre que les tests.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/** Régions Vercel situées dans l'Union européenne ou l'EEE. */
const EEA_REGIONS = new Set([
  "cdg1", // Paris
  "fra1", // Francfort
  "arn1", // Stockholm
  "dub1", // Dublin
]);

const errors = [];

let config;
try {
  config = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
} catch (error) {
  console.error(`✗ vercel.json illisible : ${error.message}`);
  process.exit(1);
}

const regions = config.regions;

if (!Array.isArray(regions) || regions.length === 0) {
  errors.push(
    "Aucune région déclarée dans vercel.json : les fonctions retomberaient sur `iad1` " +
      "(Washington). Le produit affirme un hébergement européen.",
  );
} else {
  for (const region of regions) {
    if (!EEA_REGIONS.has(region)) {
      errors.push(
        `Région « ${region} » hors EEE. Régions admises : ${[...EEA_REGIONS].join(", ")}.`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error("Cohérence de souveraineté :");
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(`Cohérence de souveraineté : exécution en ${regions.join(", ")}.`);
