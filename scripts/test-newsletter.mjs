/**
 * Contrôles de la lettre mensuelle de la veille et du résumé envoyé depuis
 * l'espace client : empreinte du jeton de confirmation, jeton de
 * désabonnement HMAC (vérifiable, non forgeable), calendrier « 1er du mois,
 * heure de Paris », et gabarits strictement en texte brut.
 */
import { createHash } from "node:crypto";

process.env.KONSENT_AUTH_SECRET = "secret-de-test-newsletter";

const {
  hashToken,
  isFirstOfMonthParis,
  monthLabel,
  newToken,
  parisMonthKey,
  previousMonthKey,
  sendMonthlyDigest,
  unsubscribeToken,
  verifyUnsubscribeToken,
} = await import("../lib/newsletter/index.ts");
const { newsletterConfirmEmail, newsletterDigestEmail, reportEmail } = await import(
  "../lib/email/index.ts"
);

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

/* ═════════════════════════ 1. Jeton de confirmation ═════════════════════════ */

console.log("Jeton de confirmation");
const token = newToken();
check("jeton aléatoire de 256 bits en base64url", /^[A-Za-z0-9_-]{43}$/.test(token), token);
check("deux jetons diffèrent", newToken() !== token);
check(
  "empreinte = SHA-256 hexadécimal du jeton",
  hashToken(token) === createHash("sha256").update(token).digest("hex"),
);
check("l'empreinte ne contient pas le jeton", !hashToken(token).includes(token));

/* ═════════════════════════ 2. Jeton de désabonnement ═════════════════════════ */

console.log("Jeton de désabonnement (HMAC)");
const id = "3f2b8c1e-6a4d-4e2f-9b1a-7c5d3e2f1a0b";
const other = "00000000-0000-4000-8000-000000000000";
const unsub = unsubscribeToken(id);
check("jeton produit avec un secret", typeof unsub === "string" && unsub.startsWith(`${id}.`), unsub);
check("jeton authentique vérifié", verifyUnsubscribeToken(unsub) === id);
const mac = unsub.slice(id.length + 1);
check("MAC d'un autre identifiant refusé", verifyUnsubscribeToken(`${other}.${mac}`) === null);
const flipped = mac.slice(0, -1) + (mac.at(-1) === "A" ? "B" : "A");
check("MAC altéré refusé", verifyUnsubscribeToken(`${id}.${flipped}`) === null);
check("jeton sans MAC refusé", verifyUnsubscribeToken(id) === null);
check("identifiant mal formé refusé", verifyUnsubscribeToken(`abc.${mac}`) === null);
const sha = createHash("sha256").update(id).digest("base64url");
check("simple SHA-256 de l'identifiant refusé", verifyUnsubscribeToken(`${id}.${sha}`) === null);
process.env.KONSENT_AUTH_SECRET = "un-autre-secret";
check("jeton signé avec un autre secret refusé", verifyUnsubscribeToken(unsub) === null);
process.env.KONSENT_AUTH_SECRET = "secret-de-test-newsletter";

/* ═════════════════════════ 3. Calendrier de Paris ═════════════════════════ */

console.log("« 1er du mois », heure de Paris");
// 31 octobre 23 h 30 UTC = 1er novembre 0 h 30 à Paris (UTC+1).
check("31/10 23:30 UTC est le 1er à Paris", isFirstOfMonthParis(new Date("2026-10-31T23:30:00Z")));
check("mois courant à Paris : 2026-11", parisMonthKey(new Date("2026-10-31T23:30:00Z")) === "2026-11");
// 1er novembre 23 h 30 UTC = 2 novembre 0 h 30 à Paris.
check("01/11 23:30 UTC n'est plus le 1er à Paris", !isFirstOfMonthParis(new Date("2026-11-01T23:30:00Z")));
// Heure d'été : 31 mai 22 h 30 UTC = 1er juin 0 h 30 à Paris (UTC+2).
check("31/05 22:30 UTC est le 1er juin à Paris", isFirstOfMonthParis(new Date("2026-05-31T22:30:00Z")));
check("31/05 21:30 UTC est encore le 31 mai à Paris", !isFirstOfMonthParis(new Date("2026-05-31T21:30:00Z")));
check("06:00 UTC le 1er (cron) est le 1er à Paris", isFirstOfMonthParis(new Date("2026-12-01T06:00:00Z")));
check("mois écoulé au 1er janvier : décembre précédent", previousMonthKey(new Date("2027-01-01T06:00:00Z")) === "2026-12");
check("mois écoulé au 1er novembre : octobre", previousMonthKey(new Date("2026-11-01T06:00:00Z")) === "2026-10");
check("libellé du mois en français", monthLabel("2026-10") === "octobre 2026", monthLabel("2026-10"));

const notFirst = await sendMonthlyDigest(new Date("2026-11-15T06:00:00Z"));
check("pas d'envoi hors du 1er", "skipped" in notFirst, JSON.stringify(notFirst));
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
const noDb = await sendMonthlyDigest(new Date("2026-12-01T06:00:00Z"));
check("sans base : envoi sauté, sans lever", "skipped" in noDb, JSON.stringify(noDb));

/* ═════════════════════════ 4. Gabarits en texte brut ═════════════════════════ */

console.log("Gabarits sans HTML");
const templates = {
  newsletterConfirmEmail: newsletterConfirmEmail({
    url: "https://konsent.example/api/veille/confirmer?t=abc",
    expiresDays: 7,
  }),
  newsletterDigestEmail: newsletterDigestEmail({
    monthLabel: "octobre 2026",
    entries: [{ title: "[En vigueur] Texte", url: "https://konsent.example/veille#x", text: "Résumé." }],
    veilleUrl: "https://konsent.example/veille",
    unsubscribeUrl: "https://konsent.example/api/veille/desabonner?t=x.y",
  }),
  reportEmail: reportEmail({
    hostname: "exemple.fr",
    score: 62,
    grade: "C",
    scannedAt: "01/11/2026 07:00:00",
    fresh: false,
    priorities: [{ title: "Dépôt avant consentement", severityLabel: "Critique" }],
    scanUrl: "https://konsent.example/scan?url=exemple.fr",
    synthesisUrl: "https://konsent.example/scan/synthese?url=exemple.fr",
  }),
};
for (const [name, message] of Object.entries(templates)) {
  const all = `${message.subject}\n${message.text}`;
  check(`${name} : aucune balise HTML`, !/<\/?[a-z][^>]*>/i.test(all));
  check(`${name} : aucune image ni pixel`, !/<img|\.gif\b|pixel/i.test(all));
  check(`${name} : pas de fausse urgence`, !/urgent|immédiatement|dernier rappel|sanction imminente/i.test(all));
  check(`${name} : destinataire laissé à l'appelant`, message.to === "");
}
check(
  "la lettre porte son lien de désabonnement",
  templates.newsletterDigestEmail.text.includes("/api/veille/desabonner?t=x.y"),
);
check(
  "le résumé porte les liens rapport et synthèse",
  templates.reportEmail.text.includes("/scan?url=exemple.fr") &&
    templates.reportEmail.text.includes("/scan/synthese?url=exemple.fr"),
);

if (failures > 0) {
  console.error(`\n${failures} contrôle(s) en échec.`);
  process.exit(1);
}
console.log("\nLettre de la veille : tous les contrôles passent.");
