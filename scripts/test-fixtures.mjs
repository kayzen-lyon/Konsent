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
import { evaluatePhases, PHASE_RULE_IDS } from "../lib/engine/evaluate-phases.ts";
import { comparePhases } from "../lib/engine/headless-adapter.ts";
import { FIXTURES, neutralObservation } from "../lib/engine/fixtures.ts";
import { PHASE_FIXTURES, neutralWorkerOutput } from "../lib/engine/fixtures-phases.ts";
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

  // Effets de bord. Certaines mises en scène impliquent légitimement plusieurs
  // constats — un site qui charge un pixel publicitaire enfreint réellement
  // plusieurs règles. Mais la cascade doit être DÉCLARÉE : c'est la différence
  // entre un effet connu et un faux positif qu'on n'a jamais regardé.
  const declared = new Set(fixture.alsoExpected ?? []);
  const undeclared = [...raisedPos].filter((id) => id !== fixture.ruleId && !declared.has(id));
  if (undeclared.length > 0) {
    fail(
      `${fixture.ruleId} — effet(s) de bord non déclaré(s) : ${undeclared.join(", ")}. ` +
        `Soit la mise en scène les implique et il faut les inscrire dans « alsoExpected », ` +
        `soit c'est un faux positif. Scénario : ${fixture.scenario}`,
    );
  } else {
    pass();
  }

  // Une déclaration qui ne se vérifie plus est pire qu'absente : elle autorise
  // en silence un constat que le moteur ne produit plus, et masquerait sa
  // réapparition pour une autre raison.
  const stale = [...declared].filter((id) => !raisedPos.has(id));
  if (stale.length > 0) {
    fail(
      `${fixture.ruleId} — « alsoExpected » périmé : ${stale.join(", ")} n'est plus déclenché. ` +
        `Retirer l'entrée, sinon elle couvre un constat que plus personne ne surveille.`,
    );
  } else {
    pass();
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

// Toute règle que le moteur statique décide doit avoir sa fixture.
//
// Ce contrôle a longtemps été un simple affichage de dette, le temps de la
// combler. La dette est à zéro : il bloque désormais. Une règle décidable sans
// fixture est une règle dont personne ne sait si elle se déclenche à tort, et
// c'est précisément le risque n°1 du §20 du PRD.
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
  fail(
    `${uncovered.length} règle(s) décidable(s) sans fixture : ${uncovered.map((r) => r.id).join(", ")}. ` +
      `Écrire un cas positif et un cas négatif, ou retirer le détecteur.`,
  );
}

/* ═══════════════ 5. le protocole en trois phases ═══════════════ */

// Mêmes contrôles, sur l'autre moteur. Le worker étant désormais branché sur
// le rapport public, ses 15 règles décident du verdict qu'un client lit — les
// laisser sans harnais reviendrait à n'avoir testé que la moitié du produit.
//
// On part de la sortie BRUTE du worker, pas de la comparaison déjà faite :
// l'adaptateur qui rapproche un cookie de sa fiche est un endroit au moins
// aussi propice à l'erreur que les règles elles-mêmes.

console.log("\n── Protocole en trois phases ──");

const neutralPhases = evaluatePhases(comparePhases(neutralWorkerOutput()));
if (neutralPhases.length > 0) {
  fail(
    `Le site témoin produit ${neutralPhases.length} constat(s) de phase : ` +
      `${neutralPhases.map((f) => f.ruleId).join(", ")}. ` +
      `Un site au bandeau symétrique, sans traceur avant consentement et qui respecte le refus, doit sortir vierge.`,
  );
} else {
  pass();
  console.log("Témoin : le site conforme ne produit aucun constat de phase.");
}

const phaseCovered = new Set();

for (const fixture of PHASE_FIXTURES) {
  phaseCovered.add(fixture.ruleId);

  const raisedPos = new Set(
    evaluatePhases(comparePhases(fixture.positive(neutralWorkerOutput()))).map((f) => f.ruleId),
  );

  if (!raisedPos.has(fixture.ruleId)) {
    fail(`${fixture.ruleId} — cas positif non détecté. Scénario : ${fixture.scenario}`);
  } else {
    pass();
  }

  const declared = new Set(fixture.alsoExpected ?? []);
  const undeclared = [...raisedPos].filter((id) => id !== fixture.ruleId && !declared.has(id));
  if (undeclared.length > 0) {
    fail(
      `${fixture.ruleId} — effet(s) de bord non déclaré(s) : ${undeclared.join(", ")}. ` +
        `Scénario : ${fixture.scenario}`,
    );
  } else {
    pass();
  }

  const stale = [...declared].filter((id) => !raisedPos.has(id));
  if (stale.length > 0) {
    fail(`${fixture.ruleId} — « alsoExpected » périmé : ${stale.join(", ")} n'est plus déclenché.`);
  } else {
    pass();
  }

  const raisedNeg = new Set(
    evaluatePhases(comparePhases((fixture.negative ?? ((o) => o))(neutralWorkerOutput()))).map(
      (f) => f.ruleId,
    ),
  );
  if (raisedNeg.has(fixture.ruleId)) {
    fail(
      `${fixture.ruleId} — cas négatif déclenché à tort. ` +
        `La règle ne distingue pas la situation conforme de la situation en écart.`,
    );
  } else {
    pass();
  }
}

const phaseUncovered = PHASE_RULE_IDS.filter((id) => !phaseCovered.has(id));
console.log(
  `\nCouverture des phases : ${phaseCovered.size} règles avec fixture, ` +
    `sur ${PHASE_RULE_IDS.length} décidées par le worker ` +
    `(${Math.round((phaseCovered.size / PHASE_RULE_IDS.length) * 100)} %).`,
);
if (phaseUncovered.length > 0) {
  fail(
    `${phaseUncovered.length} règle(s) de phase sans fixture : ${phaseUncovered.join(", ")}. ` +
      `Toute règle listée dans PHASE_RULE_IDS doit avoir son cas positif et son cas négatif.`,
  );
}

/* ------------------------------------------------------------- verdict */

console.log(`\n${checks} contrôle(s) passé(s), ${failures} échec(s).`);
if (failures > 0) process.exit(1);
