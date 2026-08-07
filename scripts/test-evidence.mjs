import { runScan } from "../lib/engine/scan.ts";
import { buildEvidenceBundle } from "../lib/evidence/bundle.ts";
const scan = await runScan(process.argv[2] ?? "cnil.fr");
const b = buildEvidenceBundle(scan);
console.log("clé de production :", b.production);
console.log("taille de l'archive :", b.bytes.length, "octets");
console.log("empreinte :", b.archiveSha256.slice(0, 32) + "…");
process.exitCode = b.production ? 0 : 1;
