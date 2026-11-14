/**
 * Contrôles de la limitation de débit (repli en mémoire).
 *
 * Ce qui est vérifié ici ne se voit pas à l'usage : un compteur qui ne se
 * réinitialise jamais bloque des clients légitimes des heures durant, et une
 * IP stockée en clair fonctionne parfaitement jusqu'au jour où la base fuit.
 */
import {
  RATE_RULES,
  clientIp,
  hashIdentifier,
  hit,
  limitAnonymousByIp,
  resetMemoryLimits,
  tooManyRequests,
  windowStartMs,
} from "../lib/security/rate-limit.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

const rule = { name: "test", limit: 3, windowSeconds: 600 };
// Début de fenêtre aligné, pour que la séquence ne chevauche pas deux fenêtres.
const t0 = windowStartMs(Date.UTC(2026, 10, 14, 12, 0, 0), rule.windowSeconds) + 1000;
const mem = (id, now) => hit(rule, id, { now, database: false });

/* ------------------------------------------------------------------ comptage */

console.log("Comptage");
resetMemoryLimits();

const a1 = await mem("203.0.113.7", t0);
const a2 = await mem("203.0.113.7", t0 + 1000);
const a3 = await mem("203.0.113.7", t0 + 2000);
check("le premier appel passe", a1.allowed && a1.remaining === 2, JSON.stringify(a1));
check("le compteur décroît", a2.remaining === 1 && a3.remaining === 0);
check("le dernier appel autorisé passe", a3.allowed);
check("le repli est bien en mémoire", a1.backend === "memory");

const other = await mem("198.51.100.1", t0 + 2000);
check("une autre IP a son propre compteur", other.allowed && other.remaining === 2);

const otherRule = await hit({ ...rule, name: "autre" }, "203.0.113.7", { now: t0, database: false });
check("une autre règle a son propre compteur", otherRule.allowed && otherRule.remaining === 2);

/* --------------------------------------------------------------- dépassement */

console.log("\nDépassement");

const a4 = await mem("203.0.113.7", t0 + 3000);
check("l'appel de trop est refusé", !a4.allowed && a4.remaining === 0);
check("le délai annoncé reste dans la fenêtre", a4.resetSeconds > 0 && a4.resetSeconds <= 600);

const response = tooManyRequests(a4);
const body = await response.json();
check("statut 429", response.status === 429);
check("Retry-After présent", response.headers.get("Retry-After") === String(a4.resetSeconds));
check(
  "en-têtes RateLimit-*",
  response.headers.get("RateLimit-Limit") === "3" &&
    response.headers.get("RateLimit-Remaining") === "0" &&
    response.headers.get("RateLimit-Reset") === String(a4.resetSeconds),
);
check("message en minutes", /^Trop de demandes\. Réessayez dans \d+ minutes?\.$/.test(body.error), body.error);
check("avertissement joint", typeof body.disclaimer === "string" && body.disclaimer.length > 0);

/* ------------------------------------------------------------ réinitialisation */

console.log("\nRéinitialisation");

const next = await mem("203.0.113.7", t0 + rule.windowSeconds * 1000);
check("la fenêtre suivante repart de zéro", next.allowed && next.remaining === 2, JSON.stringify(next));

/* ------------------------------------------------------------- identification */

console.log("\nIdentification");

const req = (headers) => new Request("http://localhost/api/scan?url=x", { headers });
check("première valeur de x-forwarded-for", clientIp(req({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })) === "203.0.113.7");
check("x-real-ip à défaut", clientIp(req({ "x-real-ip": "198.51.100.9" })) === "198.51.100.9");
check("valeur stable sans en-tête", clientIp(req({})) === "inconnue");

/* ------------------------------------------------------------------- hachage */

console.log("\nHachage");

const ip = "203.0.113.7";
const h = hashIdentifier(ip, t0);
check("l'empreinte ne contient pas l'IP", !h.includes(ip));
check("l'empreinte est stable dans la journée", h === hashIdentifier(ip, t0 + 3600_000));
check("l'empreinte change d'un jour à l'autre", h !== hashIdentifier(ip, t0 + 86_400_000));
check("deux IP donnent deux empreintes", h !== hashIdentifier("203.0.113.8", t0));
check("l'empreinte n'est pas un SHA-256 nu de l'IP", h.length === 32 && !/^[0-9a-f]{64}$/.test(h));

/* ----------------------------------------------------------- appels avec clé */

console.log("\nAppels avec clé");
resetMemoryLimits();

const keyed = req({ authorization: "Bearer kzc_test", "x-forwarded-for": ip });
// Une clé présentée est déjà contrôlée par withApiAuth : pas de limite IP.
let blocked = false;
for (let i = 0; i < RATE_RULES.scan.limit + 5; i += 1) {
  if (await limitAnonymousByIp(keyed, RATE_RULES.scan)) blocked = true;
}
check("un appel avec clé n'est jamais limité par IP", !blocked);

let anonBlocked = null;
const anon = req({ "x-forwarded-for": "192.0.2.44" });
for (let i = 0; i <= RATE_RULES.scan.limit; i += 1) {
  anonBlocked = await limitAnonymousByIp(anon, RATE_RULES.scan);
}
check("un appel anonyme est limité au-delà de 20", anonBlocked?.status === 429);

if (failures > 0) {
  console.error(`\n${failures} échec(s).`);
  process.exit(1);
}
console.log("\nLimitation de débit : tout est conforme.");
