import { runStaticScan } from "../lib/engine/static.ts";
const obs = await runStaticScan("https://" + process.argv[2]);
for (const p of obs.legalPages) {
  console.log(`${p.kind.padEnd(8)} reachable=${p.reachable} len=${p.textLength ?? "-"} signals=[${(p.signals ?? []).join(",")}]`);
  console.log(`         ${p.url}`);
}
