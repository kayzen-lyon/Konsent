/**
 * Contrôles des droits RGPD en libre-service (espace client).
 *
 * Vérifications statiques : un oubli de contrôle de session ou d'origine ne
 * se voit pas à l'usage — la route marche très bien pour son titulaire, et
 * tout aussi bien pour une page tierce. De même, un export qui laisserait
 * passer une empreinte fonctionne parfaitement, jusqu'au jour où le fichier
 * circule.
 */
import { readFileSync } from "node:fs";
import { describeSeries } from "../components/account/ScoreHistory.tsx";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
// Le code seul : les commentaires parlent légitimement des empreintes qu’ils excluent.
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const routes = {
  export: read("app/api/compte/export/route.ts"),
  supprimer: read("app/api/compte/supprimer/route.ts"),
  sessions: read("app/api/compte/sessions/route.ts"),
};
const accounts = read("lib/accounts/index.ts");
const storage = read("lib/storage/index.ts");

/* ---------------------------------------------------- session et origine */

console.log("Session et origine");

for (const [name, src] of Object.entries(routes)) {
  check(`${name} : lit le cookie de session`, /cookies\(\)\)\.get\(SESSION_COOKIE\)/.test(src));
  check(`${name} : résout le compte par la session`, /accountForSession\(token\)/.test(src));
  check(`${name} : refuse sans session`, /if \(!token\)/.test(src) && /if \(!account\)/.test(src));
  check(`${name} : contrôle sameOrigin`, /if \(!sameOrigin\(request\)\)/.test(src));
  // L'origine doit être contrôlée AVANT toute lecture de session ou écriture.
  const originAt = src.indexOf("sameOrigin(request)");
  const sessionAt = src.indexOf("accountForSession(");
  check(`${name} : origine contrôlée avant la session`, originAt > -1 && originAt < sessionAt);
  check(`${name} : aucun identifiant de compte lu dans la requête`, !/body\??\.(id|accountId)\b|get\("id"\)/.test(src));
}

check("supprimer : POST uniquement", /export async function POST/.test(routes.supprimer) && !/export async function (GET|DELETE|PUT)/.test(routes.supprimer));
check("sessions : POST uniquement", /export async function POST/.test(routes.sessions) && !/export async function (GET|DELETE|PUT)/.test(routes.sessions));
check("export : GET uniquement", /export async function GET/.test(routes.export) && !/export async function (POST|DELETE|PUT)/.test(routes.export));

/* ------------------------------------------------------------- export */

console.log("\nExport (art. 20)");

check("export : téléchargement (Content-Disposition attachment)", /Content-Disposition["']?:\s*`attachment;/.test(routes.export));
check("export : jamais mis en cache", /"Cache-Control": "no-store"/.test(routes.export));
check("export : aucune empreinte nommée dans la route", !/token_hash|fingerprint|tokenHash/i.test(code(routes.export)));

const exportBody = code(accounts).slice(
  code(accounts).indexOf("async exportAccountData"),
  code(accounts).indexOf("async deleteAccount"),
);
check("exportAccountData est présent", exportBody.length > 100);
check("exportAccountData : aucun token_hash sélectionné", !/token_hash/.test(exportBody));
check("exportAccountData : aucune empreinte de clé sélectionnée", !/fingerprint/.test(exportBody));
check("exportAccountData : pas de select *", !/select \*/.test(exportBody) && !/select a\.\*/.test(exportBody));
check("exportAccountData : sous-comptes et invitations inclus", /parent_id = \$\{accountId\}/.test(exportBody) && /invited_parent_id = \$\{accountId\}/.test(exportBody));

const exportType = accounts.slice(accounts.indexOf("export interface AccountDataExport"), accounts.indexOf("export type AccountDeletion"));
check("type d'export : aucune empreinte", !/fingerprint|tokenHash|token_hash/i.test(exportType));

const monitoringExport = storage.slice(storage.indexOf("async exportForAccount"), storage.indexOf("function toAlert"));
check("export surveillance : jeton de vérification retiré", /verificationToken: _omitted/.test(monitoringExport));
check("export surveillance : limité aux domaines du compte", (monitoringExport.match(/account_id = \$\{accountId\}/g) ?? []).length === 3);

/* ---------------------------------------------------------- suppression */

console.log("\nSuppression (art. 17)");

const deleteBody = accounts.slice(accounts.indexOf("async deleteAccount"));
const detachAt = deleteBody.search(/update accounts set parent_id = null[\s\S]*?where parent_id = \$\{accountId\}/);
const deleteAt = deleteBody.indexOf("delete from accounts where id = ${accountId}");
check("les sous-comptes sont détachés", detachAt > -1);
check("le détachement précède la suppression", detachAt > -1 && deleteAt > detachAt);
check("les sous-comptes ne sont jamais supprimés", !/delete from accounts where parent_id/.test(deleteBody));
check("une seule transaction", /this\.sql\.transaction\(\[/.test(deleteBody));
check("les jetons de connexion (sans clé étrangère) sont effacés", /delete from login_tokens where email/.test(deleteBody));
check("abonnement Stripe en cours : suppression refusée", /active_subscription/.test(deleteBody));
check("route : confirmation par l'adresse e-mail", /confirmation !== normalizeEmail\(account\.email\)/.test(routes.supprimer));
const confirmAt = routes.supprimer.indexOf("confirmation !== normalizeEmail");
check("route : confirmation vérifiée avant l'effacement", confirmAt > -1 && confirmAt < routes.supprimer.indexOf("deleteAccount("));
check("route : cookie de session effacé", /cookies\.set\(SESSION_COOKIE, "", \{ path: "\/", maxAge: 0 \}\)/.test(routes.supprimer));
check("route : redirection 303", /NextResponse\.redirect\(`\$\{siteOrigin\(\)\}\/compte-supprime`, 303\)/.test(routes.supprimer));

const schema = read("db/schema.sql");
check("schéma : sessions en cascade", /sessions[\s\S]*?account_id\s+uuid not null references accounts \(id\) on delete cascade/.test(schema));
check("schéma : api_calls anonymisé (on delete set null)", /org_id\s+uuid references accounts \(id\) on delete set null/.test(schema));
check("schéma : le déclencheur d'immuabilité admet la mise à NULL", /new\.org_id is null or new\.org_id is not distinct from old\.org_id/.test(schema));

/* ------------------------------------------------------- journal d'accès */

console.log("\nJournal d'accès");
const sessionsBody = accounts.slice(accounts.indexOf("async sessionsFor"), accounts.indexOf("async exportAccountData"));
check("aucune IP ni agent utilisateur", !/\bip\b|user_agent|useragent/i.test(sessionsBody + schema.slice(schema.indexOf("create table if not exists sessions"), schema.indexOf("create index if not exists sessions_expires_idx"))));
check("la session courante est préservée", /token_hash <> \$\{fingerprint\(currentSessionToken\)\}/.test(sessionsBody));
check("fermeture bornée au compte", /delete from sessions\s+where account_id = \$\{accountId\}/.test(sessionsBody));

/* ------------------------------------------------- description du graphique */

console.log("\nGraphique accessible");
check("série vide décrite", describeSeries([]) === "Aucune analyse enregistrée.");
const desc = describeSeries([
  { scannedAt: "2026-01-01T00:00:00Z", score: 40, grade: "D" },
  { scannedAt: "2026-02-01T00:00:00Z", score: 30, grade: "E" },
  { scannedAt: "2026-03-01T00:00:00Z", score: 70, grade: "B" },
]);
check("tendance décrite en mots", /en hausse de 30 points/.test(desc), desc);
check("extrêmes décrits", /Minimum 30, maximum 70/.test(desc), desc);

console.log(`\n${failures} échec(s).`);
if (failures > 0) process.exit(1);
