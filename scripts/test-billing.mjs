/**
 * Contrôles de la facturation.
 *
 * Deux sujets, tous deux à conséquence directe :
 *
 *  1. La vérification de signature du webhook. Sans elle, quiconque connaît
 *     l'URL peut déclarer un paiement réussi. C'est le seul endroit du produit
 *     où une comparaison de chaînes mal faite coûte de l'argent.
 *
 *  2. La sincérité de la grille. Une offre ne doit pas pouvoir être vendue en
 *     ligne tant qu'elle promet une fonctionnalité absente.
 */
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "../lib/billing/stripe.ts";
import { PLANS } from "../lib/billing/plans.ts";
import { allReadiness, isSellable } from "../lib/billing/readiness.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

/* --------------------------------------------------- signature du webhook */

console.log("Signature du webhook");

const SECRET = "whsec_fixture_seulement_pour_les_tests";
const PAYLOAD = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
const NOW = 1_786_000_000;

const sign = (payload, ts, secret = SECRET) =>
  `t=${ts},v1=${createHmac("sha256", secret).update(`${ts}.${payload}`).digest("hex")}`;

check(
  "une signature légitime est acceptée",
  verifyWebhookSignature({
    payload: PAYLOAD,
    signatureHeader: sign(PAYLOAD, NOW),
    secret: SECRET,
    nowSeconds: NOW,
  }).ok,
);

const rejects = (label, header, opts = {}) => {
  const result = verifyWebhookSignature({
    payload: opts.payload ?? PAYLOAD,
    signatureHeader: header,
    secret: SECRET,
    nowSeconds: NOW,
    ...opts,
  });
  check(label, result.ok === false, result.ok ? "acceptée à tort" : "");
};

rejects("en-tête absent", null);
rejects("en-tête vide", "");
rejects("en-tête mal formé", "n'importe quoi");
rejects("signature falsifiée", `t=${NOW},v1=${"0".repeat(64)}`);
rejects("secret différent", sign(PAYLOAD, NOW, "whsec_autre"));

// Le corps modifié après signature : c'est l'attaque que la signature existe
// pour empêcher.
rejects("charge utile modifiée après signature", sign(PAYLOAD, NOW), {
  payload: JSON.stringify({ id: "evt_1", type: "invoice.paid" }),
});

// Rejeu : une signature authentique mais ancienne doit être refusée.
rejects("signature authentique rejouée une heure plus tard", sign(PAYLOAD, NOW - 3600));

check(
  "une signature dans la tolérance reste acceptée",
  verifyWebhookSignature({
    payload: PAYLOAD,
    signatureHeader: sign(PAYLOAD, NOW - 120),
    secret: SECRET,
    nowSeconds: NOW,
  }).ok,
);

/* ------------------------------------------------- sincérité de la grille */

console.log("\nSincérité de la grille");

for (const state of allReadiness()) {
  const { plan, sellable, unmet } = state;
  if (plan.amountCents === null) continue;
  if (sellable) {
    console.log(`  ✓ ${plan.name} — toutes les promesses sont tenues, vente ouverte`);
  } else {
    console.log(`  · ${plan.name} — vente fermée, ${unmet.length} promesse(s) non tenue(s) :`);
    for (const u of unmet) console.log(`      · ${u.label}`);
  }
  check(
    `${plan.name} — l'ouverture de la vente suit l'état réel`,
    isSellable(plan.id) === sellable,
  );
}

check(
  "chaque promesse non tenue documente ce qui manque",
  PLANS.every((p) => p.features.every((f) => f.delivered || (f.gap && f.gap.length > 20))),
);

check(
  "toute offre payante porte une variable de tarif",
  PLANS.every((p) => p.amountCents === null || Boolean(p.priceEnvVar)),
);

check(
  "aucun identifiant de tarif n'est écrit en dur dans le code",
  PLANS.every((p) => !JSON.stringify(p).includes("price_1")),
);

console.log(`\n${failures} échec(s).`);
if (failures > 0) process.exit(1);
