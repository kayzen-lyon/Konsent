/**
 * Harnais de fixtures du moteur.
 *
 * Trois contrôles, par ordre d'importance décroissante :
 *
 *  1. L'observation NEUTRE ne déclenche rien. Si un constat sort d'un site
 *     irréprochable, ce constat ne dépend pas de ce qu'il prétend observer,
 *     et il sortira chez tous les clients.
 *  2. Chaque cas positif déclenche bien la règle visée.
 *  3. Chaque cas négatif ne la déclenche pas.
 *
 * Le contrôle 1 est le seul qui attrape la classe de bug la plus coûteuse du
 * produit — le faux positif systématique. Les fixtures qui ne testent que le
 * cas positif donnent l'illusion de la couverture.
 */
import { evaluate } from "../lib/engine/evaluate.ts";
import { FIXTURES, neutralObservation } from "../lib/engine/fixtures.ts";
import { RULES } from "../lib/rulepack/index.ts";

let failures = 0;
let checks = 0;

const fail = (msg) => {
  failures += 1;
  console.error(`  ✗ ${msg}`);
};
const pass = () => {
  checks += 1;
};

/* ------------------------------------------- 1. le témoin ne déclenche rien */

const neutral = evaluate(neutralObservation());
if (neutral.findings.length > 0) {
  fail(
    `L'observation neutre produit ${neutral.findings.length} constat(s) : ` +
      `${neutral.findings.map((f) => f.ruleId).join(", ")}. ` +
      `Un site irréprochable doit sortir vierge, sinon le constat est un faux positif systématique.`,
  );
} else {
  pass();
  console.log("Témoin : l'observation neutre ne produit aucun constat.");
}

/* ----------------------------------------------- 2 et 3. positifs, négatifs */

const covered = new Set();

for (const fixture of FIXTURES) {
  covered.add(fixture.ruleId);

  const positive = evaluate(fixture.positive(neutralObservation()));
  const raisedPos = new Set(positive.findings.map((f) => f.ruleId));

  if (!raisedPos.has(fixture.ruleId)) {
    fail(`${fixture.ruleId} — cas positif non détecté. Scénario : ${fixture.scenario}`);
  } else {
    pass();
  }

  // Effets de bord : le cas positif ne devrait rien déclencher d'autre que ce
  // que le scénario met en scène. On avertit sans échouer — certaines mises en
  // scène impliquent légitimement plusieurs constats (un traceur chargé sans
  // bandeau déclenche à la fois le dépôt et l'absence de bandeau).
  const sideEffects = [...raisedPos].filter((id) => id !== fixture.ruleId);
  if (sideEffects.length > 0) {
    console.warn(`  · ${fixture.ruleId} — effets de bord : ${sideEffects.join(", ")}`);
  }

  const negativeObs = (fixture.negative ?? ((o) => o))(neutralObservation());
  const negative = evaluate(negativeObs);
  const raisedNeg = new Set(negative.findings.map((f) => f.ruleId));

  if (raisedNeg.has(fixture.ruleId)) {
    fail(
      `${fixture.ruleId} — cas négatif déclenché à tort. ` +
        `La règle ne distingue pas la situation conforme de la situation en écart.`,
    );
  } else {
    pass();
  }
}

/* -------------------------------------------------------- 4. couverture */

// Toute règle que le moteur statique décide devrait finir par avoir sa fixture.
// On ne bloque pas la CI là-dessus aujourd'hui — on affiche la dette, à découvert.
const evaluateSrc = await import("node:fs").then((fs) =>
  fs.readFileSync(new URL("../lib/engine/evaluate.ts", import.meta.url), "utf8"),
);
const referenced = new Set(evaluateSrc.match(/KZC-[A-Z0-9]+-\d+/g) ?? []);
const decidable = RULES.filter((r) => r.engine === "static" && referenced.has(r.id));
const uncovered = decidable.filter((r) => !covered.has(r.id));

console.log(
  `\nCouverture : ${covered.size} règles avec fixture, sur ${decidable.length} décidables ` +
    `(${Math.round((covered.size / decidable.length) * 100)} %).`,
);
if (uncovered.length > 0) {
  console.log(`Sans fixture : ${uncovered.map((r) => r.id).join(", ")}`);
}

/* ------------------------------------------------------------- verdict */

console.log(`\n${checks} contrôle(s) passé(s), ${failures} échec(s).`);
if (failures > 0) process.exit(1);
