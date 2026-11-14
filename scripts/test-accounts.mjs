/**
 * Contrôles des comptes.
 *
 * Les invariants vérifiés ici sont ceux dont la violation ne se voit pas à
 * l'usage : un jeton stocké en clair fonctionne parfaitement jusqu'au jour où
 * la base fuit, et une comparaison naïve d'empreintes authentifie tout le monde
 * pendant des mois sans que personne s'en aperçoive.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { normalizeEmail, sameFingerprint, MAGIC_LINK_TTL_MINUTES } from "../lib/accounts/index.ts";
import { isPlausibleAddress } from "../lib/email/index.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

/* -------------------------------------------------- comparaison d'empreintes */

console.log("Comparaison d'empreintes");

const h = (s) => createHash("sha256").update(s).digest("hex");

check("deux empreintes identiques concordent", sameFingerprint(h("jeton"), h("jeton")));
check("deux empreintes différentes ne concordent pas", !sameFingerprint(h("a"), h("b")));
check("une empreinte tronquée ne concorde pas", !sameFingerprint(h("a"), h("a").slice(0, 32)));
check("une chaîne vide ne concorde avec rien", !sameFingerprint(h("a"), ""));

// Le préfixe commun est le piège classique : une comparaison qui s'arrête au
// premier caractère différent fuit de l'information par le temps de réponse,
// et une comparaison par `startsWith` authentifierait ceci.
const base = h("jeton");
check("un préfixe valide ne suffit pas", !sameFingerprint(base, base.slice(0, 60)));

/* ------------------------------------------------------ normalisation e-mail */

console.log("\nNormalisation des adresses");

check("la casse est ramenée en minuscules", normalizeEmail("Jean.Dupont@Exemple.FR") === "jean.dupont@exemple.fr");
check("les espaces sont retirés", normalizeEmail("  a@b.fr  ") === "a@b.fr");
check(
  "deux écritures de la même adresse convergent",
  normalizeEmail(" Contact@Kayzen-Lyon.FR ") === normalizeEmail("contact@kayzen-lyon.fr"),
);

console.log("\nPlausibilité des adresses");
for (const good of ["a@b.fr", "contact@kayzen-lyon.fr", "jean.dupont+tag@sous.domaine.example"]) {
  check(`acceptée : ${good}`, isPlausibleAddress(good));
}
for (const bad of ["", "abc", "a@b", "a b@c.fr", "a@@b.fr", "a@.fr", "a@b."]) {
  check(`rejetée : ${JSON.stringify(bad)}`, !isPlausibleAddress(bad));
}

/* ------------------------------------- aucun secret en clair dans le stockage */

console.log("\nAucun secret en clair");

const source = readFileSync(new URL("../lib/accounts/index.ts", import.meta.url), "utf8");

// Toute écriture de jeton en base doit passer par `fingerprint(...)`. On
// vérifie qu'aucun corps de requête ne transporte la variable brute.
check(
  "aucun jeton brut n'est envoyé en base",
  !/token_hash:\s*(token|sessionToken)\b/.test(source),
);
check(
  "les colonnes de jeton sont alimentées par une empreinte",
  (source.match(/\$\{fingerprint\((token|sessionToken)\)\}/g) ?? []).length >= 4,
);
check("le mot « password » n'apparaît nulle part", !/password/i.test(source));

const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");

check("le schéma est rejouable (create … if not exists)", !/create table (?!if not exists)/i.test(schema));
check("aucune fonction SECURITY DEFINER (pas d'élévation de droits)", !/security definer/i.test(schema));
check("les fonctions sont retirées au rôle public", /revoke all on function[\s\S]*from public/i.test(schema));
check("aucune politique permissive n'est créée", !/create policy/i.test(schema));
check(
  "les sous-comptes passent par une invitation (parent_id jamais écrit à l'invitation)",
  /set invited_parent_id = \$\{parentId\}/.test(source),
);

/* -------------------------------------------------------------- durées de vie */

console.log("\nDurées de vie");
check(
  "le lien de connexion expire en moins d'une heure",
  MAGIC_LINK_TTL_MINUTES > 0 && MAGIC_LINK_TTL_MINUTES <= 60,
  `${MAGIC_LINK_TTL_MINUTES} min`,
);
check("les jetons portent une expiration en base", /expires_at/.test(source));
check("une purge des jetons expirés existe", /purgeExpired/.test(source));

console.log(`\n${failures} échec(s).`);
if (failures > 0) process.exit(1);
