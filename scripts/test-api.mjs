/**
 * Contrôles de l'API publique : dérive, clés, quotas, journal.
 *
 * Le contrôle de dérive est le plus important du fichier. Une description
 * OpenAPI qui annonce une route disparue, tait une route ajoutée ou nomme mal
 * un paramètre est un mensonge de la même famille que ceux que Konsent relève
 * chez les autres — sauf qu'il est de notre fait, et qu'un intégrateur le
 * découvre en production.
 *
 * Ce contrôle a immédiatement servi : le registre annonçait `?token=` là où
 * `/api/diff` lit `?ref=`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  API_ROUTES,
  INTERNAL_ROUTES,
  SCOPES,
  SCOPE_LABELS,
} from "../lib/api/registry.ts";
import { buildOpenApiDocument } from "../lib/api/openapi.ts";
import {
  KEY_PREFIX,
  extractKey,
  fingerprintKey,
  generateKey,
  hasScope,
  isActive,
  matches,
} from "../lib/api/keys.ts";
import { authenticate, journal, quotaHeaders } from "../lib/api/auth.ts";
import { inMemoryApiKeyStore } from "../lib/api/store.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

/* ═══════════════════════ 1. dérive registre ↔ code ═══════════════════════ */

console.log("Concordance entre le registre et les routes réelles");

const ROOT = new URL("../app/api", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function findRoutes(dir, prefix = "/api") {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...findRoutes(full, `${prefix}/${entry}`));
    } else if (entry === "route.ts") {
      out.push({ path: prefix, file: full, source: readFileSync(full, "utf8") });
    }
  }
  return out;
}

const onDisk = findRoutes(ROOT);
const declared = new Map(API_ROUTES.map((r) => [r.path, r]));
const internal = new Set(INTERNAL_ROUTES);

// Le fichier de description n'est pas une route au sens du registre.
const OPENAPI_PATH = "/api/openapi.json";

for (const route of onDisk) {
  if (route.path === OPENAPI_PATH) continue;
  check(
    `${route.path} est déclarée (publique ou interne)`,
    declared.has(route.path) || internal.has(route.path),
    "toute route servie doit être décidée, pas oubliée",
  );
}

const onDiskPaths = new Set(onDisk.map((r) => r.path));
for (const route of API_ROUTES) {
  check(`${route.path} existe sur le disque`, onDiskPaths.has(route.path));
}
for (const path of INTERNAL_ROUTES) {
  check(`${path} (interne) existe sur le disque`, onDiskPaths.has(path));
}

/* ─────────────── méthodes, enrobage et paramètres réellement lus ────────── */

console.log("\nMéthodes, contrôle d'accès et paramètres");

for (const route of API_ROUTES) {
  const file = onDisk.find((r) => r.path === route.path);
  if (!file) continue;

  check(
    `${route.path} expose ${route.method}`,
    new RegExp(`export const ${route.method}\\b|export async function ${route.method}\\b`).test(
      file.source,
    ),
  );

  // Une route publique non enrobée n'est ni comptée ni journalisée, et sa clé
  // révoquée continuerait de passer. C'est exactement la route qu'on oublie.
  check(`${route.path} passe par withApiAuth`, file.source.includes("withApiAuth("));

  const readParams = new Set(
    [...file.source.matchAll(/(?:searchParams|params)\.get\("([a-zA-Z_]+)"\)/g)].map((m) => m[1]),
  );
  const declaredParams = new Set((route.params ?? []).map((p) => p.name));

  for (const name of declaredParams) {
    check(
      `${route.path} lit bien « ${name} »`,
      readParams.has(name),
      "paramètre annoncé que la route ignore",
    );
  }
  for (const name of readParams) {
    check(
      `${route.path} déclare « ${name} »`,
      declaredParams.has(name),
      "paramètre lu mais absent de la description",
    );
  }
}

/* ══════════════════════════ 2. document OpenAPI ══════════════════════════ */

console.log("\nDocument OpenAPI");

const doc = buildOpenApiDocument("https://konsent.fr");

check("version 3.1.0", doc.openapi === "3.1.0");
check(
  "toutes les routes déclarées y figurent",
  API_ROUTES.every((r) => doc.paths[r.path]?.[r.method.toLowerCase()]),
);
check(
  "aucune route interne n'y figure",
  INTERNAL_ROUTES.every((p) => !doc.paths[p]),
  "décrire un webhook de paiement revient à inviter à le sonder",
);
check(
  "le schéma d'authentification est en en-tête, jamais en URL",
  doc.components.securitySchemes.apiKey.type === "http" &&
    doc.components.securitySchemes.apiKey.scheme === "bearer",
);
check(
  "chaque opération admet l'appel anonyme",
  Object.values(doc.paths).every((methods) =>
    Object.values(methods).every((op) => op.security.some((s) => Object.keys(s).length === 0)),
  ),
  "fermer une route serait un arbitrage commercial, pas un effet de bord",
);
check(
  "l'ouverture actuelle est dite dans chaque description",
  Object.values(doc.paths).every((methods) =>
    Object.values(methods).every((op) => op.description.includes("ouvertes sans clé")),
  ),
);
check("l'avertissement figure dans les composants", Boolean(doc.components.schemas.Disclaimer));
check(
  "les portées sont documentées",
  SCOPES.every((s) => doc["x-scopes"][s] === SCOPE_LABELS[s]),
);
check("le document est sérialisable", (() => {
  try {
    JSON.parse(JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
})());

/* ═════════════════════════════ 3. les clés ══════════════════════════════ */

console.log("\nClés d'API");

const generated = generateKey();
check("le secret porte le préfixe reconnaissable", generated.secret.startsWith(KEY_PREFIX));
check("le secret a une entropie de 32 octets", generated.secret.length >= 40);
check("l'indice est un préfixe court", generated.hint.length === 12 && generated.secret.startsWith(generated.hint));
// L'empreinte ne doit pas permettre de reconstituer le secret, ni l'inverse.
check("l'empreinte n'est pas le secret", generated.fingerprint !== generated.secret);
check("l'empreinte est stable", fingerprintKey(generated.secret) === generated.fingerprint);
check(
  "deux clés successives diffèrent",
  generateKey().secret !== generateKey().secret,
);

const req = (headers = {}, url = "https://konsent.fr/api/scan?url=exemple.fr") =>
  new Request(url, { headers });

check("une clé en en-tête est extraite", extractKey(req({ authorization: `Bearer ${generated.secret}` })) === generated.secret);
check("aucune clé sans en-tête", extractKey(req()) === null);
check("un schéma autre que Bearer est ignoré", extractKey(req({ authorization: `Basic ${generated.secret}` })) === null);
// Une clé en chaîne de requête se retrouve dans les journaux, l'historique et
// l'en-tête Referer. La refuser est le point du garde-fou.
check(
  "une clé en paramètre d'URL n'est jamais lue",
  extractKey(req({}, `https://konsent.fr/api/scan?key=${generated.secret}`)) === null,
);

/* ═══════════════════ 4. authentification de bout en bout ═══════════════ */

console.log("\nAuthentification, portées et quota");

const store = inMemoryApiKeyStore();
const record = await store.create({
  orgId: "org-1",
  label: "Intégration continue",
  hint: generated.hint,
  fingerprint: generated.fingerprint,
  scopes: ["scan:read"],
  monthlyQuota: 2,
});

const bearer = (secret) => req({ authorization: `Bearer ${secret}` });

const anon = await authenticate(req(), "scan:read", store);
check("sans clé : anonyme, et la route reste ouverte", anon.kind === "anonymous");

const ok = await authenticate(bearer(generated.secret), "scan:read", store);
check("clé valide et portée présente : accepté", ok.kind === "accepted");
check("le quota est renvoyé à l'appelant", ok.kind === "accepted" && ok.usage.quota === 2);
check(
  "les en-têtes de quota anticipent le mur",
  quotaHeaders(ok)["X-Konsent-Quota-Limit"] === "2",
);

const wrongScope = await authenticate(bearer(generated.secret), "evidence:read", store);
check("portée absente : refusé en 403", wrongScope.kind === "refused" && wrongScope.status === 403);

const unknown = await authenticate(bearer(`${KEY_PREFIX}inexistante`), "scan:read", store);
check("clé inconnue : refusé en 401", unknown.kind === "refused" && unknown.status === 401);

const noStore = await authenticate(bearer(generated.secret), "scan:read", { available: false });
check(
  "clé présentée sans base : refusé plutôt qu'ignoré",
  noStore.kind === "refused",
  "ignorer laisserait l'appelant croire qu'il est authentifié",
);

// Le quota se consomme par le journal : deux appels réussis l'épuisent.
await journal(bearer(generated.secret), ok, 200, store);
await journal(bearer(generated.secret), ok, 200, store);
const exhausted = await authenticate(bearer(generated.secret), "scan:read", store);
check("quota épuisé : refusé en 429", exhausted.kind === "refused" && exhausted.status === 429);

check(
  "le journal porte le motif, pas seulement le statut",
  store.calls.length === 2 && store.calls.every((c) => c.refusal === null && c.orgId === "org-1"),
);
check(
  "le journal ne contient jamais le secret ni son empreinte",
  !JSON.stringify(store.calls).includes(generated.secret) &&
    !JSON.stringify(store.calls).includes(generated.fingerprint),
);

// Un appel anonyme ne laisse aucune trace : c'est ce qu'annonce la politique
// de confidentialité pour l'audit libre.
const before = store.calls.length;
await journal(req(), anon, 200, store);
check("un appel anonyme n'est pas journalisé", store.calls.length === before);

/* ─────────────────────────────── révocation ───────────────────────────── */

console.log("\nRévocation");

await store.revoke(record.id);
const revoked = await authenticate(bearer(generated.secret), "scan:read", store);
check("une clé révoquée ne passe plus", revoked.kind === "refused" && revoked.reason === "REVOKED");
check("isActive reflète la révocation", !isActive({ ...record, revokedAt: new Date(0).toISOString() }));
check(
  "la révocation prime sur la route ouverte",
  revoked.kind === "refused",
  "laisser passer viderait la révocation de son sens",
);

/* ──────────────────────── comparaisons et portées ─────────────────────── */

console.log("\nComparaisons");

check("une empreinte concordante est reconnue", matches(record, generated.secret));
check("une autre clé n'est pas reconnue", !matches(record, generateKey().secret));
check("une portée absente est refusée", !hasScope(record, "evidence:read"));
check("une route sans portée exigée accepte toute clé active", hasScope(record, null));

/* ────────────────────────────────────────────────────────────────────────── */

console.log(
  failures === 0
    ? "\nContrôles de l'API : tous passés."
    : `\n${failures} contrôle(s) en échec.`,
);
process.exit(failures === 0 ? 0 : 1);
