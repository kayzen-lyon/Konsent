/**
 * Contrôles du lien de rapport public figé.
 *
 * Ce qui est vérifié ici ne se voit pas à l'usage : un jeton trop court se
 * devine, une expiration mal calculée conserve au-delà de ce que la politique
 * annonce, et une route qui accepterait un résultat envoyé par le client
 * permettrait de publier un faux rapport sous notre nom.
 */
import { readFileSync } from "node:fs";
import {
  SHARE_TTL_DAYS,
  generateShareId,
  isShareId,
  parseShareBody,
  shareExpiry,
} from "../lib/report/shared.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

console.log("Jeton");
const ids = Array.from({ length: 200 }, () => generateShareId());
check("22 caractères base64url (16 octets)", ids.every((id) => /^[A-Za-z0-9_-]{22}$/.test(id)), ids[0]);
check("aucune collision sur 200 tirages", new Set(ids).size === ids.length);
check("isShareId accepte un jeton généré", ids.every(isShareId));
check("isShareId refuse un jeton trop court", !isShareId("abc"));
check("isShareId refuse les caractères hors base64url", !isShareId("a".repeat(21) + "/"));
check("isShareId refuse une injection", !isShareId("' or 1=1 --aaaaaaaaaaa"));

console.log("\nExpiration");
check("durée annoncée : 30 jours", SHARE_TTL_DAYS === 30);
const from = new Date("2026-11-15T10:00:00.000Z");
check(
  "expire 30 jours plus tard, à la milliseconde",
  shareExpiry(from).toISOString() === "2026-12-15T10:00:00.000Z",
  shareExpiry(from).toISOString(),
);
const delta = shareExpiry().getTime() - Date.now();
check("sans argument, part de maintenant", Math.abs(delta - 30 * 86_400_000) < 5000);

console.log("\nCorps de la requête");
check("corps nul refusé", !parseShareBody(null).ok);
check("corps sans url refusé", !parseShareBody({}).ok);
check("url vide refusée", !parseShareBody({ url: "   " }).ok);
check("url non textuelle refusée", !parseShareBody({ url: 42 }).ok);
check("url trop longue refusée", !parseShareBody({ url: "a".repeat(3000) }).ok);
const ok = parseShareBody({ url: " exemple.fr ", result: { score: 100 } });
check("url retenue et nettoyée", ok.ok && ok.url === "exemple.fr");
check("aucun autre champ n'est retenu", ok.ok && Object.keys(ok).join() === "ok,url");

console.log("\nRoute");
const route = readFileSync(new URL("../app/api/rapport/partager/route.ts", import.meta.url), "utf8");
check("contrôle d'origine", /sameOrigin\(request\)/.test(route));
check("limitation de débit dédiée", /RATE_RULES\.share/.test(route));
check("l'analyse est relancée côté serveur", /runVerdictScan\(parsed\.url/.test(route));
check("503 sans base configurée", /dbConfigured\(\)[\s\S]{0,200}503/.test(route));
check(
  "le corps n'est lu que par parseShareBody",
  (route.match(/request\.json\(\)/g) ?? []).length === 1 && /parseShareBody\(await request\.json/.test(route),
);

console.log(failures ? `\n${failures} échec(s).` : "\nTout est conforme.");
process.exit(failures ? 1 : 0);
