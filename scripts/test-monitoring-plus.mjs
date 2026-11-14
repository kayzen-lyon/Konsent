/**
 * Surveillance, volet 3 : export CSV agence, webhooks, double opt-in de
 * l'adresse d'alerte, plan d'action.
 *
 * Contrôles statiques et unitaires, sans base ni réseau. Un oubli de session,
 * d'origine ou de propriété ne se voit pas à l'usage — la route marche très
 * bien pour son titulaire, et tout aussi bien pour un tiers. De même, un
 * webhook envoyé par `fetch` au lieu de `safeFetch` fonctionne parfaitement,
 * jusqu'au jour où l'URL vise 169.254.169.254.
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { CSV_BOM, csvCell, toCsv } from "../lib/monitoring/csv.ts";
import { buildActionPlan, entryState, isValidRuleId } from "../lib/monitoring/action-plan.ts";
import { buildWebhookBody, deliverWebhook, signBody, validateWebhookUrl } from "../lib/webhooks/index.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const routes = {
  "agence/export": code(read("app/api/agence/export/route.ts")),
  "surveillance/webhook": code(read("app/api/surveillance/webhook/route.ts")),
  "surveillance/plan": code(read("app/api/surveillance/plan/route.ts")),
};
const confirmer = code(read("app/api/surveillance/confirmer/route.ts"));
const cron = code(read("app/api/cron/monitor/route.ts"));
const monitors = code(read("app/api/monitors/route.ts"));
const webhooksLib = code(read("lib/webhooks/index.ts"));
const storage = code(read("lib/storage/index.ts"));
const schema = read("db/schema.sql");

/* ------------------------------------------------- session, origine, propriété */

console.log("Session, origine et propriété");

for (const [name, src] of Object.entries(routes)) {
  check(`${name} : contrôle sameOrigin`, /if \(!sameOrigin\(request\)\)/.test(src));
  check(`${name} : lit le cookie de session`, /cookies\(\)\)\.get\(SESSION_COOKIE\)/.test(src));
  check(`${name} : résout le compte par la session`, /accountForSession\(token\)/.test(src));
  check(`${name} : refuse sans session`, /if \(!token\)/.test(src) && /if \(!account\)/.test(src));
  check(`${name} : aucun identifiant de compte lu dans la requête`, !/body\??\.?\[?["']?accountId|get\("accountId"\)/.test(src));
}
for (const name of ["surveillance/webhook", "surveillance/plan"]) {
  const src = routes[name];
  check(
    `${name} : propriété du domaine (canAccessResource) avant tout traitement`,
    /if \(!domain \|\| !canAccessResource\(actor, domain\)\) return refuse\("Domaine inconnu\.", 404\)/.test(src),
  );
  check(`${name} : POST uniquement`, /export async function POST/.test(src) && !/export async function (GET|PUT|DELETE)/.test(src));
}
check(
  "agence/export : réservé aux agences, liste issue de visibleAccountIds",
  /if \(!isAgency\(asActor\(account\)\)\)/.test(routes["agence/export"]) &&
    /visibleAccountIds\(/.test(routes["agence/export"]) &&
    /domainsForAccounts\(visible\)/.test(routes["agence/export"]),
);
check("agence/export : GET uniquement", /export async function GET/.test(routes["agence/export"]) && !/export async function (POST|PUT|DELETE)/.test(routes["agence/export"]));
check("agence/export : téléchargement non mis en cache", /attachment;/.test(routes["agence/export"]) && /"Cache-Control": "no-store"/.test(routes["agence/export"]));
check("plan : seuls les constats de la dernière analyse", /latestScan\(domain\.id\)/.test(routes["surveillance/plan"]) && /ruleId in \(latest\.baseline\.f/.test(routes["surveillance/plan"]));
check("plan : note bornée à 500 caractères", /NOTE_MAX/.test(routes["surveillance/plan"]) && /char_length\(note\) <= 500/.test(schema));
check("webhook : envoi de test limité en débit", /hit\(TEST_RULE, account\.id\)/.test(routes["surveillance/webhook"]));

/* --------------------------------------------------------------- webhooks */

console.log("\nWebhooks : anti-SSRF");

check("lib/webhooks : envoi par safeFetch", /await safeFetch\(/.test(webhooksLib));
check("lib/webhooks : aucun fetch nu", !/(^|[^A-Za-z])fetch\(/.test(webhooksLib.replace(/safeFetch\(/g, "")));
check("lib/webhooks : délai de 5 s", /WEBHOOK_TIMEOUT_MS = 5_000/.test(webhooksLib) && /AbortSignal\.timeout\(WEBHOOK_TIMEOUT_MS\)/.test(webhooksLib));
check("lib/webhooks : URL revalidée à l'envoi", /deliverWebhook[\s\S]*?validateWebhookUrl\(hook\.url\)/.test(webhooksLib));
for (const [name, src] of [["route webhook", routes["surveillance/webhook"]], ["cron", cron]]) {
  check(`${name} : aucun fetch direct`, !/(^|[^A-Za-z])fetch\(/.test(src));
  check(`${name} : passe par deliverWebhook`, /deliverWebhook\(/.test(src));
}
check("webhook : le secret n'est jamais exporté (webhooksFor ne le sélectionne pas)", (() => {
  const body = storage.slice(storage.indexOf("async webhooksFor"), storage.indexOf("async setWebhook"));
  return body.length > 50 && !/secret/.test(body);
})());

const refused = [
  ["http://hooks.slack.com/x", "http refusé"],
  ["https://127.0.0.1/hook", "boucle locale refusée"],
  ["https://localhost/hook", "localhost refusé"],
  ["https://10.0.0.5/hook", "réseau privé refusé"],
  ["https://169.254.169.254/latest", "métadonnées cloud refusées"],
  ["https://[::1]/hook", "IPv6 locale refusée"],
  ["https://user:pass@example.com/hook", "identifiants refusés"],
  ["ftp://example.com/hook", "autre protocole refusé"],
  ["javascript:alert(1)", "javascript: refusé"],
];
for (const [url, label] of refused) check(`validation : ${label}`, !validateWebhookUrl(url).ok);
check("validation : https public accepté", validateWebhookUrl("https://hooks.slack.com/services/T/B/X").ok);

const delivery = await deliverWebhook(
  { url: "https://127.0.0.1:9/hook", kind: "generic", secret: "s" },
  { hostname: "exemple.fr", summary: "x", regressions: 1, observedAt: "", reportUrl: "https://k/" },
);
check("envoi vers 127.0.0.1 : bloqué sans lever", delivery.sent === false, JSON.stringify(delivery));

console.log("\nWebhooks : formats");

const alert = {
  hostname: "exemple.fr",
  summary: "Un traceur <script> & co est apparu.",
  regressions: 2,
  observedAt: "14/11/2026",
  reportUrl: "https://konsent.example/surveillance?domaine=exemple.fr",
};
const slack = buildWebhookBody("slack", alert);
check("Slack : champ text + blocks", typeof slack.text === "string" && Array.isArray(slack.blocks) && slack.blocks.length > 0);
check("Slack : mrkdwn échappé", !/<script>/.test(JSON.stringify(slack.blocks)) && /&lt;script&gt;/.test(slack.text));
const teams = buildWebhookBody("teams", alert);
check("Teams : MessageCard", teams["@type"] === "MessageCard" && typeof teams.text === "string");
const generic = buildWebhookBody("generic", alert);
check("générique : événement et domaine", generic.event === "konsent.alert" && generic.hostname === "exemple.fr");
check("générique : test distinguable", buildWebhookBody("generic", { ...alert, test: true }).event === "konsent.test");
const raw = JSON.stringify(generic);
check(
  "signature : sha256=<HMAC hex du corps>",
  signBody("secret", raw) === `sha256=${createHmac("sha256", "secret").update(raw).digest("hex")}`,
);
check("signature : en-tête X-Konsent-Signature posé", /"X-Konsent-Signature": signBody\(hook\.secret, body\)/.test(webhooksLib));

/* ------------------------------------------------------------ double opt-in */

console.log("\nDouble opt-in de l'adresse d'alerte");

const sendAt = cron.indexOf("sendEmail(");
const guardAt = cron.lastIndexOf("if (domain.alertEmailConfirmedAt) {", sendAt);
check("cron : un seul envoi de courriel", (cron.match(/sendEmail\(/g) ?? []).length === 1);
// Le bloc ouvert par la garde n'est pas refermé avant l'envoi.
const between = guardAt > -1 ? cron.slice(guardAt, sendAt) : "";
const depth = (between.match(/\{/g) ?? []).length - (between.match(/\}/g) ?? []).length;
check("cron : l'envoi est gardé par alertEmailConfirmedAt", guardAt > -1 && sendAt > guardAt && depth >= 1);
check("cron : l'envoi ne vise que domain.alertEmail", /sendEmail\(\{ \.\.\.message, to: domain\.alertEmail \}\)/.test(cron));
check("storage : alertEmailConfirmedAt lu depuis la base", /alertEmailConfirmedAt: isoOrNull\(row\["alert_email_confirmed_at"\]\)/.test(storage));
check("storage : seule l'empreinte SHA-256 du jeton est stockée", /alert_confirm_hash = \$\{confirmFingerprint\(token\)\}/.test(storage) && /createHash\("sha256"\)/.test(storage));
check("storage : jeton à usage unique et expirant", /alert_confirm_expires_at > now\(\)[\s\S]*?returning \*/.test(storage) && /alert_confirm_hash = null/.test(storage));
check("storage : expiration 48 h", /ALERT_CONFIRM_TTL_HOURS = 48/.test(storage));
check("monitors : adresse du compte connecté réputée confirmée", /alertEmailConfirmed: emailIsOwners/.test(monitors));
check("monitors : e-mail non configuré annoncé honnêtement", /if \(!emailConfigured\(\)\)/.test(monitors) && /n'est pas configuré sur cette instance/.test(monitors));
check("monitors : pas de relance tant qu'un lien est valable", /hasPendingConfirmation\(domain\.id\)/.test(monitors));
check("monitors : le lien est construit depuis siteOrigin, jamais l'en-tête Host", /confirmationUrl\(siteOrigin\(\), token\)/.test(monitors));
check("confirmer : GET qui consomme le jeton", /export async function GET/.test(confirmer) && /confirmAlertEmail\(token\)/.test(confirmer));
check("confirmer : format du jeton contrôlé avant la base", /\[A-Za-z0-9_-\]\{20,100\}/.test(confirmer));

/* ------------------------------------------------------------ plan d'action */

console.log("\nPlan d'action");

const scan = { scannedAt: "2026-11-10T10:00:00.000Z", baseline: { f: { "KZC-DEPOT-001": 2, "INCONNU-1": 1 } } };
check("constat sans état : à traiter", entryState(undefined, scan.scannedAt) === "open");
check(
  "corrigé APRÈS la dernière analyse : en attente",
  entryState({ status: "fixed", fixedAt: "2026-11-12T00:00:00.000Z" }, scan.scannedAt) === "fixed_pending",
);
check(
  "corrigé AVANT la dernière analyse qui l'observe encore : toujours observé",
  entryState({ status: "fixed", fixedAt: "2026-11-01T00:00:00.000Z" }, scan.scannedAt) === "still_observed",
);
const plan = buildActionPlan(scan, [
  { domainId: "d", ruleId: "INCONNU-1", status: "fixed", note: "fait", fixedAt: "2026-11-01T00:00:00.000Z", updatedAt: "" },
]);
check("plan : un constat par règle de la dernière analyse", plan.length === 2);
check("plan : note restituée", plan.find((p) => p.ruleId === "INCONNU-1")?.note === "fait");
check("plan : aucune analyse, aucun plan", buildActionPlan(null, []).length === 0);
check("identifiant de règle : forme contrôlée", isValidRuleId("KZC-DEPOT-001") && !isValidRuleId("x'; drop") && !isValidRuleId(""));

/* --------------------------------------------------------------------- CSV */

console.log("\nCSV anti-formules");

for (const lead of ["=", "+", "-", "@"]) {
  check(`cellule commençant par « ${lead} » neutralisée`, csvCell(`${lead}HYPERLINK("x")`).replace(/^"/, "").startsWith(`'${lead}`));
}
check("tabulation en tête neutralisée", csvCell("\tcmd").startsWith("'"));
check("texte ordinaire inchangé", csvCell("exemple.fr") === "exemple.fr");
check("séparateur et guillemets échappés", csvCell('a;b"c') === '"a;b""c"');
const csv = toCsv([["Client", "Domaine"], ["=cmd|' /C calc'!A0", "exemple.fr"]]);
check("BOM UTF-8 en tête", csv.startsWith(CSV_BOM));
check("séparateur « ; »", csv.includes("Client;Domaine"));
check("route export : passe par toCsv", /toCsv\(\[/.test(routes["agence/export"]));

/* ------------------------------------------------------------------ schéma */

console.log("\nSchéma et effacement");

check("alert_webhooks : cascade depuis le domaine", /alert_webhooks \([\s\S]*?domain_id\s+uuid primary key references monitored_domains \(id\) on delete cascade/.test(schema));
check("alert_webhooks : https imposé par la base", /url like 'https:\/\/%'/.test(schema));
check("action_items : cascade depuis le domaine", /action_items \([\s\S]*?domain_id\s+uuid not null references monitored_domains \(id\) on delete cascade/.test(schema));
check("monitored_domains : colonnes de confirmation", /alert_email_confirmed_at timestamptz/.test(schema) && /alert_confirm_hash text/.test(schema));
check("export RGPD : webhooks et plan d'action inclus", /webhooks,\s*actionItems,/.test(storage.slice(storage.indexOf("async exportForAccount"))));

console.log(failures === 0 ? "\n✓ Tous les contrôles passent." : `\n✗ ${failures} contrôle(s) en échec.`);
process.exit(failures === 0 ? 0 : 1);
