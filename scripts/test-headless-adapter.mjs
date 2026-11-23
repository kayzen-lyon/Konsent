/**
 * Vérifie que la sortie du worker navigateur alimente réellement
 * l'évaluateur, et que la couverture progresse.
 *
 * On construit une sortie de worker représentative — traceurs déposés en
 * phase A, survivants en phase B, empreinte du terminal, refus au second
 * niveau — et on contrôle que les constats attendus apparaissent.
 */
import { evaluate } from "../lib/engine/evaluate.ts";
import { assembleHeadlessScan } from "../lib/engine/scan-headless.ts";
import { RULEPACK } from "../lib/rulepack/index.ts";

const now = Math.floor(Date.now() / 1000);

/** Instantané de phase, avec des requêtes et cookies plausibles. */
function snapshot(phase, { withAds = true, withFp = true } = {}) {
  const requests = [
    { url: "https://exemple.fr/", hostname: "exemple.fr", resourceType: "document", tMs: 0 },
    {
      url: "https://www.googletagmanager.com/gtm.js?id=GTM-XXXX",
      hostname: "www.googletagmanager.com",
      resourceType: "script",
      tMs: 180,
    },
  ];

  const cookies = [];

  if (withAds) {
    requests.push(
      {
        url: "https://connect.facebook.net/en_US/fbevents.js",
        hostname: "connect.facebook.net",
        resourceType: "script",
        tMs: 310,
      },
      {
        url: "https://www.google-analytics.com/g/collect?v=2",
        hostname: "www.google-analytics.com",
        resourceType: "xhr",
        tMs: 480,
      },
    );
    cookies.push(
      {
        name: "_fbp",
        domain: ".exemple.fr",
        path: "/",
        expires: now + 90 * 86400,
        secure: true,
        httpOnly: false,
        sameSite: "Lax",
      },
      {
        name: "_ga",
        domain: ".exemple.fr",
        path: "/",
        expires: now + 400 * 86400,
        secure: true,
        httpOnly: false,
        sameSite: "Lax",
      },
    );
  }

  return {
    phase,
    requests,
    cookies,
    localStorage: withAds
      ? { "_hj_user": "a7f3c2e918bd4455", theme: "sombre" }
      : { theme: "sombre" },
    sessionStorage: {},
    serviceWorkers: phase === "A" && withAds ? ["https://exemple.fr/"] : [],
    fingerprinting: withFp
      ? {
          "canvas.toDataURL": 2,
          "webgl.getParameter": 11,
          "audio.createOscillator": 1,
          "navigator.plugins": 3,
          "navigator.hardwareConcurrency": 1,
          "navigator.deviceMemory": 1,
          "webrtc.createDataChannel": 1,
        }
      : {},
    consentMode: {
      dataLayer: [{ 0: "consent", 1: "default", 2: { ad_storage: "granted" } }],
    },
    tcString: phase === "B" ? "CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA" : null,
  };
}

const output = {
  url: "https://exemple.fr/",
  mode: "headless",
  scannedAt: new Date().toISOString(),
  bannerResolution: "API",
  banner: {
    resolution: "API",
    cmpName: "Plateforme compatible IAB TCF v2.2",
    // Refuser demande deux clics, accepter un seul : asymétrie caractérisée.
    clicksToReject: 2,
    clicksToAccept: 1,
    hasRejectAtFirstLevel: false,
  },
  snapshots: [
    snapshot("A"),
    // Phase B : le refus a été cliqué, mais les traceurs survivent.
    snapshot("B"),
    snapshot("C"),
  ],
};

// Pas de contexte statique : le domaine exemple.fr n'existe pas.
const scan = await assembleHeadlessScan(output, { withStaticContext: false });

console.log(`mode : ${scan.mode}`);
console.log(`score : ${scan.score}/100 (${scan.grade})`);
console.log(`plafonné : ${scan.cappedBy ?? "non"}`);
console.log(`destinataires : ${scan.vendors.map((v) => v.name).join(", ")}`);
console.log("");
console.log(`constats (${scan.findings.length}) :`);
for (const f of scan.findings) {
  console.log(`  [${f.severity.padEnd(8)}] ${f.ruleId} x${f.occurrences} — ${f.title}`);
}
console.log("");
console.log(
  `non évalué : ${scan.notEvaluatedRuleIds.length} règles sur ${RULEPACK.total} ` +
    `(hors ligne : sans pages légales ni en-têtes)`,
);

// Contrôles : les constats qui n'existent QUE grâce aux trois phases.
const ids = new Set(scan.findings.map((f) => f.ruleId));
const expected = [
  ["KZC-DEPOT-001", "cookie publicitaire déposé en phase A"],
  ["KZC-REFUS-001", "traceur survivant au refus"],
  ["KZC-BANNER-002", "aucun refus au premier niveau"],
  ["KZC-BANNER-003", "refuser coûte plus de clics qu'accepter"],
  ["KZC-STORAGE-001", "identifiant en localStorage avant consentement"],
  ["KZC-FP-001", "empreinte par canvas"],
  ["KZC-FP-008", "empreinte maintenue après refus"],
];

let failures = 0;
console.log("");
for (const [id, label] of expected) {
  const ok = ids.has(id);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${id} — ${label}`);
}

// Comparaison à observation égale : le mode statique appliqué à la même
// observation. Un seuil écrit en dur comparait un scan en ligne (avec pages
// légales) à ce JSON hors ligne, et ne mesurait rien.
const staticOnly = evaluate(scan.observation).notEvaluatedRuleIds.length;
const improved = scan.notEvaluatedRuleIds.length < staticOnly;
console.log(
  `${improved ? "PASS" : "FAIL"}  couverture améliorée par rapport au mode statique ` +
    `(${scan.notEvaluatedRuleIds.length} non évaluées contre ${staticOnly})`,
);
if (!improved) failures += 1;

process.exitCode = failures === 0 ? 0 : 1;
