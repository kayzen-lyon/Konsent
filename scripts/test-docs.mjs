/**
 * Contrôles de la Doc Factory.
 *
 * Deux familles de défauts, toutes deux invisibles à la relecture d'un
 * document isolé :
 *
 *  1. **La dérive du catalogue.** La route `/api/documents` annonce ce qui est
 *     disponible ; `lib/docs` sait ce qui est réellement écrit. Un gabarit
 *     annoncé mais absent fait perdre son temps à tout intégrateur — et à tout
 *     agent — qui l'appelle. C'est la même faute que l'OpenAPI qui décrit une
 *     route disparue.
 *
 *  2. **Le document qui invente.** Le §9.3 du PRD l'interdit sans réserve :
 *     toute variable inconnue apparaît en clair, jamais remplie au jugé. Un
 *     document juridique qui comble un trou par une valeur plausible est pire
 *     qu'un document absent, parce qu'il sera publié tel quel.
 */
import { readFileSync } from "node:fs";
import { generateDocument, hasGenerator } from "../lib/docs/index.ts";
import { TEMPLATES, renderMarkdown } from "../lib/docs/types.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

/* ─────────────────── un scan de référence, sans mystère ────────────────── */

const SCAN = {
  id: "doc-fixture",
  url: "https://exemple.fr/",
  finalUrl: "https://exemple.fr/",
  hostname: "exemple.fr",
  mode: "static",
  rulepackVersion: "0.0.0-test",
  scannedAt: new Date(0).toISOString(),
  durationMs: 1,
  score: 60,
  grade: "C",
  gradeLabel: "test",
  findings: [],
  notEvaluatedRuleIds: [],
  vendors: [
    {
      slug: "fixture-us",
      name: "Service américain (fixture)",
      entity: "Fixture Inc.",
      hqJurisdiction: "US",
      effectiveJurisdiction: "US",
      adequacy: "DPF_CONDITIONAL",
      categories: ["advertising"],
      domains: ["fixture.example"],
      exemptEligible: false,
      purposeFr: "Fixture.",
      riskNotesFr: "Fixture.",
      sources: ["fixture"],
    },
  ],
  outsideEea: [],
  observation: {
    url: "https://exemple.fr/",
    finalUrl: "https://exemple.fr/",
    hostname: "exemple.fr",
    mode: "static",
    httpStatus: 200,
    durationMs: 1,
    requests: [],
    cookies: [],
    cmp: { detected: true, name: "Fixture CMP", method: "api_signature", confidence: "high" },
    legalPages: [],
    dns: [],
    headers: {
      hsts: "max-age=63072000",
      csp: null,
      referrerPolicy: "strict-origin-when-cross-origin",
      permissionsPolicy: null,
      xContentTypeOptions: "nosniff",
    },
    consentMode: {
      gtagPresent: false,
      defaultCallPresent: false,
      grantedByDefault: [],
      handlesAdUserData: false,
    },
    sensitiveTopics: [],
    formsInsecure: [],
    pagesAnalyzed: 1,
  },
};
SCAN.outsideEea = SCAN.vendors;

/* ════════════════════ 1. dérive catalogue ↔ générateurs ═════════════════ */

console.log("Concordance entre le catalogue annoncé et les gabarits écrits");

const routeSrc = readFileSync(new URL("../app/api/documents/route.ts", import.meta.url), "utf8");
const catalogue = [...routeSrc.matchAll(/\{ id: "(D\d+)", slug: "([a-z-]+)".*?available: (true|false) \}/g)].map(
  (m) => ({ id: m[1], slug: m[2], available: m[3] === "true" }),
);

check("le catalogue de la route est lisible", catalogue.length >= 20, `${catalogue.length} entrées`);

for (const entry of catalogue) {
  if (entry.available) {
    check(
      `${entry.id} annoncé disponible et réellement écrit`,
      hasGenerator(entry.slug),
      "gabarit annoncé sans générateur : tout appel échouera",
    );
  } else {
    // L'inverse compte aussi : un gabarit écrit mais annoncé indisponible est
    // du travail livré que personne ne peut appeler.
    check(
      `${entry.id} annoncé indisponible et effectivement absent`,
      !hasGenerator(entry.slug),
      "gabarit écrit mais caché du catalogue",
    );
  }
}

const declared = new Set(TEMPLATES.map((t) => t.slug));
for (const entry of catalogue.filter((e) => e.available)) {
  check(`${entry.id} figure dans TEMPLATES`, declared.has(entry.slug));
}

/* ══════════════════════ 2. chaque gabarit produit ═══════════════════════ */

console.log("\nGénération");

const INTERDITS = [
  // Garde-fou n°1 du §3.2 : le produit constate un écart, il ne qualifie pas.
  /vous êtes en infraction/i,
  /vous êtes hors la loi/i,
  /illégal/i,
  /vous risquez une amende de/i,
];

for (const template of TEMPLATES) {
  const doc = generateDocument(template.slug, SCAN);
  if (!doc) {
    check(`${template.id} — génération`, false, "aucun document produit");
    continue;
  }
  check(`${template.id} — génération`, true);

  check(`${template.id} — identifiant cohérent`, doc.templateId === template.id);
  check(`${template.id} — au moins une section`, doc.sections.length > 0);

  // Le pied de page porte l'obligation de validation. Un modèle diffusé sans
  // elle engage la responsabilité de l'éditeur (§22).
  // La formulation est libre — « faire valider », « relire et adapter » — mais
  // le professionnel du droit doit être nommé. « À compléter avant
  // publication » laisse croire qu'une relecture attentive suffit.
  check(
    `${template.id} — mention de validation en pied`,
    /professionnel du droit/i.test(doc.footer),
  );

  const markdown = renderMarkdown(doc);

  // Tout marqueur présent dans le corps doit être remonté dans `todos` :
  // c'est cette liste que le lecteur voit en tête, et qui l'empêche de
  // publier un document troué sans s'en apercevoir.
  const markers = [...markdown.matchAll(/\[\[À COMPLÉTER : ([^\]]+)\]\]/g)].map((m) => m[1]);
  const unlisted = markers.filter((m) => !doc.todos.includes(m));
  check(
    `${template.id} — tout champ manquant est annoncé en tête`,
    unlisted.length === 0,
    unlisted.join(" · "),
  );

  // Et réciproquement : une entrée de `todos` qui n'apparaît nulle part dans
  // le document est une alarme sans objet.
  const orphans = doc.todos.filter((t) => !markers.includes(t));
  check(`${template.id} — aucun champ annoncé sans emplacement`, orphans.length === 0, orphans.join(" · "));

  const forbidden = INTERDITS.filter((re) => re.test(markdown));
  check(
    `${template.id} — aucune qualification juridique`,
    forbidden.length === 0,
    "un gabarit ne qualifie pas : il constate",
  );
}

/* ═══════════════════════════ 3. l'écart annoncé ═════════════════════════ */

console.log("\nPérimètre");

const available = catalogue.filter((e) => e.available).length;
console.log(`\n  ${available} gabarits écrits sur ${catalogue.length} annoncés au catalogue.`);
console.log(
  `  Restent à écrire : ${catalogue
    .filter((e) => !e.available)
    .map((e) => e.id)
    .join(", ")}`,
);

check(
  "le catalogue expose l'écart plutôt que de le taire",
  routeSrc.includes("ne sont pas écrits"),
  "un catalogue qui n'annonce que le disponible laisse croire que le reste n'existe pas",
);

/* ────────────────────────────────────────────────────────────────────────── */

console.log(
  failures === 0
    ? "\nContrôles de la Doc Factory : tous passés."
    : `\n${failures} contrôle(s) en échec.`,
);
process.exit(failures === 0 ? 0 : 1);
