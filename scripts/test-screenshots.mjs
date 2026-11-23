/**
 * Captures d'écran par phase : du worker au rapport et à l'archive signée.
 *
 * Trois propriétés : une capture valide arrive dans le résultat et dans
 * l'archive (couverte par SHA256SUMS) ; une valeur qui n'est pas un JPEG
 * base64 est écartée (elle finirait dans un attribut `src`) ; un rapport
 * partagé est stocké sans les images.
 */
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { assembleHeadlessScan } from "../lib/engine/scan-headless.ts";
import { withoutScreenshots } from "../lib/engine/types.ts";
import { buildEvidenceBundle } from "../lib/evidence/bundle.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

// Plus petit JPEG valide (1 × 1), en base64 : commence par « /9j/ ».
const JPEG =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

const snap = (phase, screenshot) => ({
  phase,
  requests: [],
  cookies: [],
  localStorage: {},
  sessionStorage: {},
  serviceWorkers: [],
  fingerprinting: {},
  consentMode: null,
  tcString: null,
  ...(screenshot === undefined ? {} : { screenshot }),
});

const output = {
  url: "https://exemple.fr/",
  mode: "headless",
  scannedAt: new Date(0).toISOString(),
  bannerResolution: "API",
  refusalClicked: true,
  banner: { resolution: "API", clicksToAccept: 1, clicksToReject: 1, hasRejectAtFirstLevel: true },
  snapshots: [snap("A", JPEG), snap("B", '"><script>alert(1)</script>'), snap("C", JPEG)],
};

const scan = await assembleHeadlessScan(output, { withStaticContext: false });

console.log("Captures dans le résultat");
check(
  "captures valides retenues (A et C)",
  scan.screenshots?.map((s) => s.phase).join("") === "AC",
  JSON.stringify(scan.screenshots?.map((s) => s.phase)),
);
check("valeur qui n'est pas un JPEG écartée (B)", !scan.screenshots?.some((s) => s.phase === "B"));

console.log("\nCaptures dans l'archive de preuve");
const bundle = buildEvidenceBundle(scan);

/** Lecture minimale des entrées du ZIP (en-têtes locaux, méthode 8 ou 0). */
function unzip(buf) {
  const entries = new Map();
  let i = 0;
  while (i + 30 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) {
    const method = buf.readUInt16LE(i + 8);
    const size = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const name = buf.toString("utf8", i + 30, i + 30 + nameLen);
    const start = i + 30 + nameLen + extraLen;
    const raw = buf.subarray(start, start + size);
    entries.set(name, method === 8 ? inflateRawSync(raw) : raw);
    i = start + size;
  }
  return entries;
}
const files = unzip(Buffer.from(bundle.bytes));
const sums = files.get("SHA256SUMS")?.toString("utf8") ?? "";
const jpeg = files.get("captures/phase-a.jpg");
check("captures/phase-a.jpg présente et identique", jpeg?.equals(Buffer.from(JPEG, "base64")));
check("captures/phase-c.jpg présente", files.has("captures/phase-c.jpg"));
check(
  "empreinte de la capture dans SHA256SUMS (donc signée)",
  jpeg && sums.includes(`${createHash("sha256").update(jpeg).digest("hex")}  captures/phase-a.jpg`),
);

console.log("\nStockage");
const stored = withoutScreenshots(scan);
check("rapport partagé stocké sans images", stored.screenshots === undefined && JSON.stringify(stored).length < JSON.stringify(scan).length);

const statique = { ...scan, screenshots: undefined };
check("résultat sans capture inchangé", withoutScreenshots(statique) === statique);

console.log(`\n${failures} échec(s).`);
process.exit(failures === 0 ? 0 : 1);
