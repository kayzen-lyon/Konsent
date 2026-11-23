/**
 * Contrôles du décodeur et de l'audit TCF.
 *
 * Le décodeur est vérifié en aller-retour sur une chaîne fabriquée, ce qui
 * prouve la disposition des champs — l'essentiel des erreurs de ce genre de
 * code. Il est aussi vérifié sur des chaînes volontairement abîmées : une
 * chaîne illisible doit produire un CONSTAT, jamais une exception qui ferait
 * tomber le scan entier.
 */
import { auditTcf, specViolations } from "../lib/tcf/audit.ts";
import { evaluatePhases, phaseUndecided } from "../lib/engine/evaluate-phases.ts";
import { evaluateTcfPhases } from "../lib/engine/evaluate-tcf.ts";
import { comparePhases } from "../lib/engine/headless-adapter.ts";
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

/* ------------------------------------------- validité de spécification */

console.log("\nValidité au regard de la spécification");

const now = new Date("2026-11-23T12:00:00Z");
const valid = specViolations(decodeTcString(encodeTcStringForTests({})).core, now);
check("chaîne conforme : aucun écart", valid.length === 0, JSON.stringify(valid));

const oldPolicy = specViolations(
  decodeTcString(encodeTcStringForTests({ tcfPolicyVersion: 2 })).core,
  now,
);
check("politique TCF antérieure à 2.2 signalée", oldPolicy.length === 1);

// L'intérêt légitime interdit est porté par TCF-006 seul : pas de double
// comptage dans TCF-002. Les textes non standard sont prévus par la spec.
const liString = encodeTcStringForTests({ purposesLegitimateInterest: [2, 3, 7], useNonStandardTexts: true });
check(
  "ni l'intérêt légitime ni les textes non standard ne sont des invalidités TCF-002",
  specViolations(decodeTcString(liString).core, now).length === 0,
);
const liAudit = auditTcf({ tcString: liString, apiPresent: true, vendorsContacted: [], observedBeforeInteraction: false });
const li006 = liAudit.findings.find((f) => f.ruleId === "KZC-TCF-006");
check(
  "TCF-006 distingue la finalité 3 (interdite par la spec) de la 2 (admise, contestée)",
  li006 &&
    li006.evidence.some((e) => e.label.includes("3") && e.detail.includes("interdit")) &&
    li006.evidence.some((e) => e.label.includes("2") && e.detail.includes("CJUE")),
  li006?.evidence.map((e) => e.detail).join(" | "),
);
check(
  "TCF-007 levée seulement quand du ciblage reste en intérêt légitime sans restriction",
  liAudit.findings.some((f) => f.ruleId === "KZC-TCF-007") &&
    !auditTcf({ tcString: encodeTcStringForTests({}), apiPresent: true, vendorsContacted: [], observedBeforeInteraction: false })
      .findings.some((f) => f.ruleId === "KZC-TCF-007"),
);

const future = specViolations(
  decodeTcString(encodeTcStringForTests({ created: "2027-06-01T00:00:00Z" })).core,
  now,
);
check("date de création dans le futur signalée", future.length === 1);

/* ------------------------------------------ branchement sur les phases */

console.log("\nBranchement sur le protocole en trois phases");

const snap = (phase, tcString, tcfApiPresent) => ({
  phase,
  requests: [],
  cookies: [],
  localStorage: {},
  sessionStorage: {},
  serviceWorkers: [],
  fingerprinting: {},
  consentMode: null,
  tcString,
  // Une CMP présente répond, sauf indication contraire (`"muette"`).
  ...(tcfApiPresent === undefined
    ? {}
    : tcfApiPresent === "muette"
      ? { tcfApiPresent: true, tcfResponded: false }
      : { tcfApiPresent, tcfResponded: tcfApiPresent }),
});
const workerOutput = (a, b, c, refusalClicked = true) => ({
  url: "https://exemple.fr/",
  mode: "headless",
  scannedAt: new Date(0).toISOString(),
  bannerResolution: "API",
  refusalClicked,
  banner: { resolution: "API", clicksToAccept: 1, clicksToReject: 1, hasRejectAtFirstLevel: true },
  snapshots: [a, b, c],
});

// Site sans CMP TCF : la famille reste entièrement « non évaluée ».
const noTcf = evaluateTcfPhases(workerOutput(snap("A", null), snap("B", null), snap("C", null)));
check("sans CMP TCF : aucun constat", noTcf.findings.length === 0);
check("sans CMP TCF : les 8 règles restent non évaluées", noTcf.undecided.length === 8, noTcf.undecided.join(","));

// CMP TCF propre : refus vide, acceptation après clic, restrictions posées.
const clean = workerOutput(
  snap("A", null, true),
  snap("B", encodeTcStringForTests({}), true),
  snap(
    "C",
    encodeTcStringForTests({
      purposesConsent: [1, 2, 3, 4],
      vendorConsents: [1, 5],
      publisherRestrictions: [{ purposeId: 2, restrictionType: 1, vendorIds: [5] }],
    }),
    true,
  ),
);
const cleanEval = evaluateTcfPhases(clean);
check("CMP TCF propre : aucun constat TCF", cleanEval.findings.length === 0, cleanEval.findings.map((f) => f.ruleId).join(","));
check(
  "CMP TCF propre : TCF-008 et TCF-002 décidées",
  !cleanEval.undecided.includes("KZC-TCF-008") && !cleanEval.undecided.includes("KZC-TCF-002"),
  cleanEval.undecided.join(","),
);
check(
  "refus propre : KZC-REFUS-006 ne se déclenche pas",
  !evaluatePhases(comparePhases(clean)).some((f) => f.ruleId === "KZC-REFUS-006"),
);

// Consentement présent avant toute interaction, en phase A.
const early = evaluateTcfPhases(
  workerOutput(snap("A", encodeTcStringForTests({ purposesConsent: [1] }), true), snap("B", null, true), snap("C", null, true)),
);
check(
  "consentement avant interaction : TCF-008 en phase A",
  early.findings.some((f) => f.ruleId === "KZC-TCF-008" && f.phase === "A"),
  early.findings.map((f) => `${f.ruleId}/${f.phase}`).join(","),
);

// Refus mal enregistré, et chaîne de refus illisible.
const badRefusal = workerOutput(
  snap("A", null, true),
  snap("B", encodeTcStringForTests({ purposesConsent: [1, 4] }), true),
  snap("C", null, true),
);
check(
  "refus ignoré : KZC-REFUS-006 se déclenche",
  evaluatePhases(comparePhases(badRefusal)).some((f) => f.ruleId === "KZC-REFUS-006"),
);
const garbled = evaluateTcfPhases(workerOutput(snap("A", null, true), snap("B", "ceci-nest-pas-une-chaine", true), snap("C", null, true)));
check(
  "chaîne de refus illisible : TCF-002, et REFUS-006 non évaluée",
  garbled.findings.some((f) => f.ruleId === "KZC-TCF-002") && garbled.undecided.includes("KZC-REFUS-006"),
);

/* --------------------------- ce qui n'a pas été regardé n'est pas conforme */

console.log("\nNon regardé = non évalué");

// Interface présente mais muette (stub seul, CMP bloquée) : impossible de
// conclure qu'aucun consentement n'a été transmis avant interaction.
const mute = evaluateTcfPhases(workerOutput(snap("A", null, "muette"), snap("B", null, "muette"), snap("C", null, "muette")));
check("CMP muette : TCF-008 reste non évaluée", mute.undecided.includes("KZC-TCF-008"), mute.undecided.join(","));

// Chaîne lue dans le cookie, interface absente : TCF-001 ne doit pas être
// réputée satisfaite par une présence d'API déduite de la chaîne.
const cookieOnly = evaluateTcfPhases(
  workerOutput(snap("A", null, false), snap("B", null, false), snap("C", encodeTcStringForTests({ purposesConsent: [1] }), false)),
);
check("chaîne sans interface : TCF-001 non évaluée", cookieOnly.undecided.includes("KZC-TCF-001"), cookieOnly.undecided.join(","));

// Refus non cliqué : la phase B n'est pas « après refus ».
const notClicked = workerOutput(
  snap("A", null, true),
  snap("B", encodeTcStringForTests({ purposesConsent: [1, 4] }), true),
  snap("C", null, true),
  false,
);
const notClickedCmp = comparePhases(notClicked);
check(
  "refus non cliqué : pas de REFUS-006, déclarée non évaluée",
  !evaluatePhases(notClickedCmp).some((f) => f.ruleId === "KZC-REFUS-006") &&
    phaseUndecided(notClickedCmp).includes("KZC-REFUS-006"),
);

// Site en HTTP : l'attribut Secure n'a pas de sens, la règle n'est pas regardée.
const httpCmp = comparePhases({ ...clean, url: "http://exemple.fr/" });
check("site en HTTP : STORAGE-009 non évaluée", phaseUndecided(httpCmp).includes("KZC-STORAGE-009"));
check("site en HTTPS avec refus cliqué : rien de non évalué", phaseUndecided(comparePhases(clean)).length === 0);

console.log(`\n${failures} échec(s).`);
if (failures > 0) process.exit(1);
