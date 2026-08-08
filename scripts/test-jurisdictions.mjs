/**
 * Contrôles de la couche multi-juridiction.
 *
 * Le risque propre à cette couche n'est pas le bug, c'est la contre-vérité :
 * afficher un score « international » unique, ou faire disparaître sans le
 * dire les règles hors périmètre. Les contrôles portent donc d'abord là-dessus.
 */
import { JURISDICTIONS, partitionForJurisdiction, applicability } from "../lib/jurisdictions/index.ts";
import { RULES } from "../lib/rulepack/index.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

console.log("Conservation : rien ne disparaît en silence");
for (const j of JURISDICTIONS) {
  const { applicable, outOfScope } = partitionForJurisdiction(RULES, j.code);
  check(
    `${j.code} — ${applicable.length} applicables + ${outOfScope.length} hors périmètre = ${RULES.length}`,
    applicable.length + outOfScope.length === RULES.length,
  );
  check(
    `${j.code} — chaque règle hors périmètre porte un motif`,
    outOfScope.every((o) => o.reason && o.reason.length > 20),
  );
}

console.log("\nRégimes : le constat de dépôt ne survit pas à un régime d'opposition");
for (const code of ["CH", "US_CA"]) {
  const { applicable } = partitionForJurisdiction(RULES, code);
  check(
    `${code} — aucune règle de la famille DEPOT n'est retenue`,
    !applicable.some((r) => r.family === "DEPOT"),
  );
  check(
    `${code} — les règles de consentement et d'information restent, elles`,
    applicable.some((r) => r.family === "CONSENT") && applicable.some((r) => r.family === "DOC"),
  );
}

console.log("\nRégimes d'accord préalable : le référentiel reste entier");
for (const code of ["FR", "EU"]) {
  const { applicable, outOfScope } = partitionForJurisdiction(RULES, code);
  check(`${code} — famille DEPOT conservée`, applicable.some((r) => r.family === "DEPOT"));
  if (code === "FR") {
    check("FR — aucune règle hors périmètre", outOfScope.length === 0, `${outOfScope.length}`);
  }
}

console.log("\nSpécificités françaises");
const cnilRule = RULES.find((r) => r.id === "KZC-DOC-013");
check(
  "le droit de réclamation auprès de la CNIL ne s'applique qu'en France",
  applicability(cnilRule, "FR").applies && !applicability(cnilRule, "QC").applies,
);

console.log("\nHonnêteté de la couche");
check(
  "seules FR et EU sont annoncées comme qualifiées",
  JURISDICTIONS.filter((j) => j.maturity === "qualified").map((j) => j.code).join(",") === "FR,EU",
);
check(
  "chaque juridiction porte un avertissement de lecture",
  JURISDICTIONS.every((j) => j.caveat.length > 40),
);

console.log(`\n${failures} échec(s).`);
if (failures > 0) process.exit(1);
