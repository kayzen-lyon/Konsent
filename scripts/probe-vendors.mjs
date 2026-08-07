import { runStaticScan } from "../lib/engine/static.ts";
const obs = await runStaticScan("https://" + process.argv[2]);
console.log("page host:", obs.hostname);
for (const r of obs.requests.filter(r => r.tracker)) {
  console.log(`  ${(r.tracker.name).padEnd(28)} ${r.origin.padEnd(7)} ${r.url.slice(0,95)}`);
}
