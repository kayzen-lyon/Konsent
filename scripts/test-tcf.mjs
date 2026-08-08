/**
 * Contrôles du décodeur et de l'audit TCF.
 *
 * Le décodeur est vérifié en aller-retour sur une chaîne fabriquée, ce qui
 * prouve la disposition des champs — l'essentiel des erreurs de ce genre de
 * code. Il est aussi vérifié sur des chaînes volontairement abîmées : une
 * chaîne illisible doit produire un CONSTAT, jamais une exception qui ferait
 * tomber le scan entier.
 */
import { auditTcf } from "../lib/tcf/audit.ts";
import { decodeTcString, encodeTcStringForTests } from "../lib/tcf/decode.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

/* ------------------------------------------------------ aller-retour */

console.log("Aller-retour d'encodage");

const sample = {
  created: "2026-08-08T10:00:00Z",
  cmpId: 42,
  cmpVersion: 3,
  consentScreen: 1,
  consentLanguage: "FR",
  vendorListVersion: 312,
  tcfPolicyVersion: 4,
  publisherCC: "FR",
  specialFeatureOptIns: [1],
  purposesConsent: [1, 3, 4, 7],
  purposesLegitimateInterest: [2, 7, 8],
  vendorConsents: [1, 5, 9],
  vendorLegitimateInterests: [5],
  publisherRestrictions: [{ purposeId: 3, restrictionType: 1, vendorIds: [5] }],
};

const encoded = encodeTcStringForTests(sample);
const round = decodeTcString(encoded);

check("la chaîne fabriquée se décode", round.ok, round.ok ? "" : round.reason);

if (round.ok) {
  const c = round.core;
  check("version", c.version === 2);
  check("identifiant de CMP", c.cmpId === 42, `lu ${c.cmpId}`);
  check("langue", c.consentLanguage === "FR", c.consentLanguage);
  check("pays éditeur", c.publisherCC === "FR", c.publisherCC);
  check("version de liste des vendors", c.vendorListVersion === 312, String(c.vendorListVersion));
  check(
    "finalités consenties",
    JSON.stringify(c.purposesConsent) === JSON.stringify([1, 3, 4, 7]),
    JSON.stringify(c.purposesConsent),
  );
  check(
    "finalités en intérêt légitime",
    JSON.stringify(c.purposesLegitimateInterest) === JSON.stringify([2, 7, 8]),
    JSON.stringify(c.purposesLegitimateInterest),
  );
  check(
    "vendors consentis",
    JSON.stringify(c.vendorConsents) === JSON.stringify([1, 5, 9]),
    JSON.stringify(c.vendorConsents),
  );
  check("fonctionnalités spéciales", JSON.stringify(c.specialFeatureOptIns) === JSON.stringify([1]));
  check("restrictions éditeur", c.publisherRestrictions.length === 1);
  check("horodatage", c.created.startsWith("2026-08-08T10:00:00"), c.created);
}

/* ------------------------------------------------- robustesse aux abus */

console.log("\nChaînes abîmées : un constat, jamais une exception");

const broken = [
  ["chaîne vide", ""],
  ["caractère hors alphabet", "CO!!!invalide"],
  ["chaîne tronquée", encoded.slice(0, 4)],
  ["version 1 retirée", "BOSSuwYOSSuwYABABBENC-AAAAAdl"],
  ["texte quelconque", "ceci-nest-pas-une-chaine"],
];

for (const [label, value] of broken) {
  let threw = false;
  let result;
  try {
    result = decodeTcString(value);
  } catch {
    threw = true;
  }
  check(`${label} : pas d'exception`, !threw);
  check(`${label} : échec explicite`, !threw && result && result.ok === false, JSON.stringify(result));
}

/* -------------------------------------------------------------- audit */

console.log("\nAudit");

// Consentement émis avant toute action : le constat le plus grave de la famille.
const before = auditTcf({
  tcString: encoded,
  apiPresent: true,
  vendorsContacted: [1, 5, 9],
  observedBeforeInteraction: true,
  tMs: 240,
});
const beforeIds = before.findings.map((f) => f.ruleId);
check("consentement avant action détecté", beforeIds.includes("KZC-TCF-008"), beforeIds.join(","));
check(
  "intérêt légitime sur finalité de ciblage détecté",
  beforeIds.includes("KZC-TCF-006"),
  beforeIds.join(","),
);

// Même chaîne, mais après une action réelle : le constat le plus grave tombe.
const after = auditTcf({
  tcString: encoded,
  apiPresent: true,
  vendorsContacted: [1, 5, 9],
  observedBeforeInteraction: false,
});
check(
  "après action, plus de constat de consentement anticipé",
  !after.findings.map((f) => f.ruleId).includes("KZC-TCF-008"),
);

// Vendor contacté hors chaîne.
const extra = auditTcf({
  tcString: encoded,
  apiPresent: true,
  vendorsContacted: [1, 5, 9, 755],
  observedBeforeInteraction: false,
});
check(
  "partenaire hors consentement détecté",
  extra.findings.map((f) => f.ruleId).includes("KZC-TCF-005"),
);

// Sans chaîne ni contexte, l'audit doit AVOUER son ignorance et non conclure.
const blind = auditTcf({
  tcString: "",
  apiPresent: true,
  vendorsContacted: [],
  observedBeforeInteraction: false,
});
check("sans chaîne, aucun constat inventé", blind.findings.length === 0);
check(
  "sans chaîne, les règles sont déclarées non évaluées",
  blind.notEvaluated.length >= 7,
  `${blind.notEvaluated.length} règles`,
);

// Contrôles conditionnels : sans registre de CMP fourni, la règle n'est pas
// décidée — elle ne doit surtout pas être réputée satisfaite.
check(
  "sans registre de CMP, la règle correspondante reste non évaluée",
  after.notEvaluated.includes("KZC-TCF-003"),
  after.notEvaluated.join(","),
);

console.log(`\n${failures} échec(s).`);
if (failures > 0) process.exit(1);
