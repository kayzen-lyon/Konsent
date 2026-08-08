#!/usr/bin/env node
/**
 * Vérifie que la concession faite au confort de développement ne part pas en
 * production.
 *
 * `next.config.ts` autorise `unsafe-eval` quand `NODE_ENV=development`, sans
 * quoi le rechargement à chaud casse l'hydratation et aucun composant client
 * n'est testable en local. La contrepartie de cette concession, c'est ce
 * contrôle : en production, la directive doit être exactement celle d'origine.
 *
 * L'enjeu dépasse l'hygiène. Konsent relève `unsafe-eval` chez ses clients
 * (KZC-SEC-003). Le laisser filer chez nous invaliderait l'objectif du §14.1 —
 * 100/100 sur notre propre scanner — et, plus simplement, nous rendrait
 * ridicules.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const config = readFileSync(join(ROOT, "next.config.ts"), "utf8");

const errors = [];

// La branche de production doit être littérale et sans `unsafe-eval`.
const prodBranch = config.match(/:\s*"(script-src[^"]*)"/);
if (!prodBranch) {
  errors.push("Impossible de retrouver la directive `script-src` de production dans next.config.ts.");
} else if (prodBranch[1].includes("unsafe-eval")) {
  errors.push(`La directive de production contient \`unsafe-eval\` : ${prodBranch[1]}`);
}

// Et la concession doit rester conditionnée à l'environnement.
if (config.includes("unsafe-eval") && !config.includes('process.env.NODE_ENV === "development"')) {
  errors.push("`unsafe-eval` apparaît sans être conditionné à l'environnement de développement.");
}

if (errors.length > 0) {
  console.error("Contrôle de la CSP :");
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(`Contrôle de la CSP : production sans \`unsafe-eval\` (${prodBranch[1]}).`);
