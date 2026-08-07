/**
 * Vérification du normaliseur lexical. Les apostrophes typographiques et les
 * espaces insécables sont les deux causes les plus fréquentes de lexique
 * manqué — donc de constat faussement négatif.
 */
import { normalize } from "../lib/engine/html.ts";

const CASES = [
  ["Droit d’accès", "droit d'acces"],
  ["POLITIQUE DE CONFIDENTIALITÉ", "politique de confidentialite"],
  ["durée de conservation", "duree de conservation"],
  ["Mentions légales", "mentions legales"],
  ["Données personnelles", "donnees personnelles"],
  ["clauses contractuelles types", "clauses contractuelles types"],
];

let failures = 0;
for (const [input, expected] of CASES) {
  const got = normalize(input);
  const pass = got === expected;
  if (!pass) failures += 1;
  process.stdout.write(
    `${pass ? "PASS" : "FAIL"}  ${JSON.stringify(input)} -> ${JSON.stringify(got)}\n`,
  );
}

process.stdout.write(failures === 0 ? "\nTous les cas passent.\n" : `\n${failures} echec(s).\n`);
process.exitCode = failures === 0 ? 0 : 1;
