/**
 * Contrôles du cloisonnement des sous-comptes agence.
 *
 * Ce fichier ne vérifie pas que la fonctionnalité marche : il vérifie qu'elle
 * ne fuit pas. La différence compte, parce qu'un cloisonnement se teste
 * naturellement par ce qu'il AUTORISE, alors que le seul défaut qui importe
 * est ce qu'il laisse passer.
 *
 * Une agence qui voit le portefeuille d'une autre, ou un client qui voit ses
 * concurrents dans la même agence, est une violation de données à notifier au
 * titre de l'article 33 — commise par un produit vendu pour prévenir
 * exactement cela. Les cas ci-dessous sont donc écrits du point de vue de
 * quelqu'un qui cherche à traverser la cloison.
 */
import { readFileSync } from "node:fs";
import {
  DOMAIN_QUOTA,
  SUB_ACCOUNT_QUOTA,
  canAccessAccount,
  canAccessResource,
  canAddDomain,
  canAttach,
  canCreateSubAccount,
  canDetach,
  domainQuotaFor,
  isAgency,
  isSubAccount,
  visibleAccountIds,
} from "../lib/agency/tenancy.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

/* ─────────────────────────────── le décor ──────────────────────────────── */

const agence = { id: "ag-1", plan: "agence", parentId: null };
const autreAgence = { id: "ag-2", plan: "agence", parentId: null };

const clientA = { id: "cl-a", plan: "libre", parentId: "ag-1" };
const clientB = { id: "cl-b", plan: "libre", parentId: "ag-1" };
const clientTiers = { id: "cl-c", plan: "libre", parentId: "ag-2" };

const isole = { id: "solo", plan: "pro", parentId: null };

const enfantsAg1 = [clientA, clientB];
const enfantsAg2 = [clientTiers];
const tous = [clientA, clientB, clientTiers];

const domaine = (id, accountId) => ({ id, accountId });

/* ══════════════════════════ 1. qui est quoi ═══════════════════════════════ */

console.log("Qualification des comptes");

check("un compte agence de premier niveau est une agence", isAgency(agence));
check("un compte pro n'est pas une agence", !isAgency(isole));
check("un client est un sous-compte", isSubAccount(clientA));
check("une agence n'est pas un sous-compte", !isSubAccount(agence));

// Le piège central : un sous-compte dont le champ « plan » porterait « agence »
// — héritage, erreur de saisie, écriture directe en base — ne doit pas devenir
// une agence. Le plan seul ne fait pas l'autorité.
const sousCompteQuiSeCroitAgence = { id: "cl-x", plan: "agence", parentId: "ag-1" };
check(
  "un sous-compte au plan « agence » n'est pas une agence",
  !isAgency(sousCompteQuiSeCroitAgence),
  "sans cela, une chaîne de privilèges s'ouvre",
);

/* ═══════════════════════ 2. la cloison, par l'attaque ════════════════════ */

console.log("\nTentatives de traversée");

check(
  "un client ne voit pas son frère",
  !canAccessAccount(clientA, clientB, tous),
  "deux concurrents chez la même agence",
);
check("un client ne voit pas son agence", !canAccessAccount(clientA, agence, tous));
check(
  "une agence ne voit pas le client d'une autre agence",
  !canAccessAccount(agence, clientTiers, tous),
);
check("une agence ne voit pas une autre agence", !canAccessAccount(agence, autreAgence, tous));
check("un compte isolé ne voit personne d'autre", !canAccessAccount(isole, clientA, tous));

// Le cas qui compte le plus : la liste d'enfants vient d'une requête, pas
// d'une preuve. Fournir les enfants d'autrui ne doit rien ouvrir.
check(
  "fournir la liste d'enfants d'une autre agence n'ouvre rien",
  !canAccessAccount(agence, clientTiers, enfantsAg2),
  "la liste est filtrée sur le parent réel, pas prise au mot",
);
check(
  "un enfant falsifié, qui ne nous désigne pas, est ignoré",
  !canAccessAccount(agence, clientTiers, [{ ...clientTiers, parentId: "ag-2" }]),
);

/* ─────────────────────────── ce qui est permis ─────────────────────────── */

console.log("\nAccès légitimes");

check("une agence voit ses propres clients", canAccessAccount(agence, clientA, enfantsAg1));
check("un compte se voit lui-même", canAccessAccount(clientA, clientA, tous));
check("une agence se voit elle-même", canAccessAccount(agence, agence, enfantsAg1));
check(
  "la visibilité d'une agence est elle-même plus ses enfants",
  visibleAccountIds(agence, tous).sort().join() === ["ag-1", "cl-a", "cl-b"].sort().join(),
);
check(
  "la visibilité d'un client se limite à lui-même",
  visibleAccountIds(clientA, tous).join() === "cl-a",
);

/* ═════════════════════════ 3. ressources détenues ═══════════════════════ */

console.log("\nRessources");

check(
  "une agence lit un domaine de son client",
  canAccessResource(agence, domaine("d1", "cl-a"), enfantsAg1),
);
check(
  "un client ne lit pas le domaine de son frère",
  !canAccessResource(clientA, domaine("d2", "cl-b"), tous),
);
check(
  "une agence ne lit pas le domaine du client d'une autre",
  !canAccessResource(agence, domaine("d3", "cl-c"), tous),
);
// Le réflexe « pas de propriétaire, donc pas de restriction » est la manière
// la plus courante de laisser fuir des données par une ligne mal migrée.
check(
  "un domaine orphelin n'est accessible à personne",
  !canAccessResource(agence, domaine("d4", null), tous) &&
    !canAccessResource(clientA, domaine("d4", null), tous),
);

/* ════════════════════════ 4. création de sous-comptes ═══════════════════ */

console.log("\nOuverture de sous-comptes");

check("une agence peut ouvrir un sous-compte", canCreateSubAccount(agence, enfantsAg1).allowed);
check(
  "une offre Pro ne le peut pas",
  canCreateSubAccount(isole, []).refusal === "NOT_AN_AGENCY",
);
check(
  "un sous-compte ne peut pas déléguer à son tour",
  canCreateSubAccount(sousCompteQuiSeCroitAgence, []).refusal === "SUB_ACCOUNT_CANNOT_DELEGATE",
  "le cloisonnement s'arrête à un niveau, sinon la chaîne est sans fin",
);

const pleine = Array.from({ length: SUB_ACCOUNT_QUOTA.agence }, (_, i) => ({
  id: `cl-${i}`,
  plan: "libre",
  parentId: "ag-1",
}));
check("au quota, la création est refusée", canCreateSubAccount(agence, pleine).refusal === "QUOTA_REACHED");
check("juste sous le quota, elle passe", canCreateSubAccount(agence, pleine.slice(1)).allowed);

// Compter la liste telle qu'elle arrive laisserait l'appelant choisir son quota.
check(
  "des enfants d'autrui ne remplissent pas notre quota",
  canCreateSubAccount(agence, [...pleine.slice(1), ...enfantsAg2, ...enfantsAg2]).allowed,
);

/* ──────────────────────── rattachement et détachement ──────────────────── */

console.log("\nRattachement");

check("un compte ne peut pas être son propre parent", canAttach(agence, agence, []).refusal === "SELF_PARENT");
check(
  "un compte déjà rattaché ne se rattache pas ailleurs",
  canAttach(autreAgence, clientA, []).refusal === "ALREADY_ATTACHED",
  "sans cela, une agence capte le client d'une autre",
);
check("un compte libre peut être rattaché", canAttach(agence, isole, enfantsAg1).allowed);

check("une agence détache son propre client", canDetach(agence, clientA));
check("une agence ne détache pas le client d'une autre", !canDetach(agence, clientTiers));
check("un client ne se détache pas lui-même", !canDetach(clientA, clientA));

/* ══════════════════════════ 5. quotas de domaines ═══════════════════════ */

console.log("\nQuotas de domaines");

check("l'offre Agence porte 25 domaines", domainQuotaFor(agence) === DOMAIN_QUOTA.agence);
check("l'offre Pro en porte 5", domainQuotaFor(isole) === DOMAIN_QUOTA.pro);
// Sans cette règle, un seul client consomme les 25 domaines de l'agence et
// prive les 24 autres.
check(
  "un sous-compte n'hérite pas du quota de son agence",
  domainQuotaFor(clientA) === 1,
);

const cinq = Array.from({ length: 5 }, () => ({ accountId: "solo" }));
check("au quota, aucun domaine de plus", !canAddDomain(isole, cinq));
check("sous le quota, l'ajout passe", canAddDomain(isole, cinq.slice(1)));
check(
  "les domaines d'autrui ne consomment pas notre quota",
  canAddDomain(isole, [...cinq.slice(1), { accountId: "cl-a" }, { accountId: "cl-b" }]),
);

/* ═══════════════ 6. le portefeuille dérive du modèle, pas d'une requête ══ */

console.log("\nComposition avec le stockage");

// Le portefeuille est la lecture des domaines des comptes visibles. On rejoue
// cette composition sur un stockage factice : c'est elle qui décide ce qu'une
// agence lit, et une erreur ici annulerait tout ce qui précède.
const TOUS_DOMAINES = [
  { id: "d1", hostname: "agence.fr", accountId: "ag-1" },
  { id: "d2", hostname: "client-a.fr", accountId: "cl-a" },
  { id: "d3", hostname: "client-b.fr", accountId: "cl-b" },
  { id: "d4", hostname: "concurrent.fr", accountId: "cl-c" },
  { id: "d5", hostname: "orphelin.fr", accountId: null },
];

const lire = (ids) =>
  ids.length === 0 ? [] : TOUS_DOMAINES.filter((d) => d.accountId && ids.includes(d.accountId));

const vueAgence = lire(visibleAccountIds(agence, tous)).map((d) => d.hostname);
check(
  "une agence lit ses domaines et ceux de ses clients",
  vueAgence.sort().join() === ["agence.fr", "client-a.fr", "client-b.fr"].sort().join(),
);
check("le domaine du client d'une autre agence n'y est pas", !vueAgence.includes("concurrent.fr"));
check("le domaine orphelin n'y est pas", !vueAgence.includes("orphelin.fr"));

const vueClient = lire(visibleAccountIds(clientA, tous)).map((d) => d.hostname);
check("un client ne lit que le sien", vueClient.join() === "client-a.fr");

// Le piège du filtre vide : `in.()` sans identifiant rend la table ENTIÈRE
// sous PostgREST. Le cas se produit dès qu'un compte sans domaine consulte sa
// vue, c'est-à-dire au premier usage.
check("une liste vide ne rend rien", lire([]).length === 0);

const storageSrc = readFileSync(new URL("../lib/storage/index.ts", import.meta.url), "utf8");
check(
  "le stockage se protège du filtre vide",
  /accountIds\.length === 0\)\s*return \[\]/.test(storageSrc),
  "sans ce garde, un filtre `in.()` vide rend le portefeuille de toutes les agences",
);
check(
  "un domaine sans propriétaire est lisible comme tel",
  /accountId: \(row\["account_id"\] as string \| null\) \?\? null/.test(storageSrc),
);

/* ────────────────────────────────────────────────────────────────────────── */

console.log(
  failures === 0
    ? "\nContrôles du cloisonnement : tous passés."
    : `\n${failures} contrôle(s) en échec.`,
);
process.exit(failures === 0 ? 0 : 1);
