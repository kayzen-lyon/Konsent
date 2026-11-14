/**
 * Contrôles des pages légales, du formulaire et de l'accessibilité.
 *
 * Un mot sur ce que ce fichier NE fait pas. Il ne certifie pas les 106
 * critères du RGAA : la majorité d'entre eux — pertinence d'une alternative
 * textuelle, ordre de lecture, cohérence d'un intitulé de lien avec sa
 * destination — supposent un jugement humain et ne sont pas automatisables.
 * Aucun outil ne les couvre, et prétendre le contraire sur un site qui
 * reproche aux autres d'affirmer plus qu'ils ne savent serait déplacé.
 *
 * Ce qu'il fait : vérifier mécaniquement les critères qui LE SONT, et lister
 * à découvert ceux qui restent à contrôler à la main.
 */
import { readFileSync, readdirSync } from "node:fs";
import {
  HONEYPOT_FIELD,
  MAX_AGE_MS,
  MIN_FILL_MS,
  TIMESTAMP_FIELD,
  evaluateSubmission,
  issueToken,
  refusalMessage,
} from "../lib/contact/antispam.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

/* ══════════════════════════ 1. anti-robot ═══════════════════════════════ */

console.log("Filtrage anti-robot");

const now = 1_000_000_000_000;
const fresh = issueToken(now);

check(
  "une soumission normale passe",
  evaluateSubmission({ honeypot: "", token: fresh }, now + MIN_FILL_MS + 1_000).accepted,
);
check(
  "le champ leurre rempli écarte l'envoi",
  evaluateSubmission({ honeypot: "ACME", token: fresh }, now + 10_000).reason === "HONEYPOT",
);
check(
  "un leurre rempli d'espaces ne compte pas",
  evaluateSubmission({ honeypot: "   ", token: fresh }, now + 10_000).accepted,
  "un navigateur peut insérer un espace ; punir cela bloquerait un humain",
);
check(
  "une soumission instantanée est écartée",
  evaluateSubmission({ honeypot: "", token: fresh }, now + 500).reason === "TOO_FAST",
);
check(
  "juste au-dessus du seuil, elle passe",
  evaluateSubmission({ honeypot: "", token: fresh }, now + MIN_FILL_MS + 1).accepted,
);
check(
  "un formulaire trop ancien est écarté",
  evaluateSubmission({ honeypot: "", token: fresh }, now + MAX_AGE_MS + 1).reason === "STALE",
);

// Le jeton est signé : l'antidater doit échouer, sinon le contrôle de délai
// ne vaut rien puisqu'un robot poserait l'horodatage de son choix.
check(
  "un horodatage fabriqué est rejeté",
  evaluateSubmission({ honeypot: "", token: `${now - 60_000}.signaturebidon` }, now).reason ===
    "BAD_TOKEN",
);
check(
  "un jeton sans signature est rejeté",
  evaluateSubmission({ honeypot: "", token: String(now) }, now + 10_000).reason === "BAD_TOKEN",
);
check(
  "un jeton absent est rejeté",
  evaluateSubmission({ honeypot: "" }, now + 10_000).reason === "BAD_TOKEN",
);
// Une horloge client en avance ne doit pas ouvrir une porte.
check(
  "un jeton daté du futur est rejeté",
  evaluateSubmission({ honeypot: "", token: issueToken(now + 60_000) }, now).reason === "BAD_TOKEN",
);

// Le message de refus ne doit jamais expliquer au robot ce qui l'a trahi.
for (const reason of ["HONEYPOT", "TOO_FAST", "BAD_TOKEN"]) {
  const msg = refusalMessage(reason).toLowerCase();
  check(
    `le refus « ${reason} » ne divulgue pas le motif`,
    !msg.includes("leurre") && !msg.includes("rapide") && !msg.includes("jeton"),
  );
}
check(
  "le seul cas qui concerne un humain est expliqué",
  refusalMessage("STALE").toLowerCase().includes("rechargez"),
);

/* ═════════════════ 2. le formulaire, côté accessibilité ═════════════════ */

console.log("\nFormulaire — accessibilité et RGPD");

const form = read("components/ContactForm.tsx");

check("le champ leurre est retiré de l'arbre d'accessibilité", form.includes('aria-hidden="true"'));
check("le champ leurre est hors tabulation", form.includes("tabIndex={-1}"));
check(
  "le champ leurre échappe au remplissage automatique",
  form.includes('autoComplete="off"'),
  "un gestionnaire de mots de passe le remplirait et bloquerait un humain",
);
check(
  "le leurre est déporté hors écran, pas masqué par display:none",
  form.includes("-left-[9999px]") && !form.includes("hidden md:hidden"),
  "beaucoup de robots ignorent les champs en display:none",
);
check(
  "aucune case n'est pré-cochée",
  !/defaultChecked|checked=\{true\}/.test(form),
  "un consentement pré-coché n'est pas un consentement (considérant 32)",
);
check("chaque champ porte un label lié par htmlFor", (form.match(/htmlFor=/g) ?? []).length >= 4);
check(
  "l'obligation est annoncée aux lecteurs d'écran",
  form.includes("(obligatoire)") && form.includes("sr-only"),
  "un astérisque seul n'est pas annoncé",
);
check(
  "le résultat est annoncé sans déplacer le focus",
  form.includes('role="status"') && form.includes('aria-live="polite"'),
);
check(
  "les champs déclarent leur finalité de saisie",
  form.includes('autoComplete="name"') && form.includes('autoComplete="email"'),
  "critère RGAA 11.13",
);

const route = read("app/api/contact/route.ts");
check(
  "le consentement est revérifié côté serveur",
  route.includes("consentement"),
  "une case peut être contournée par un envoi fabriqué",
);
check(
  "aucune adresse IP n'est collectée",
  !/x-forwarded-for|request\.ip|remoteAddress/i.test(route),
);
check("le courriel part en texte brut", route.includes("text:") && !route.includes("html:"));

/* ═════════════════════ 3. pages légales — présence ══════════════════════ */

console.log("\nPages légales");

const PAGES = {
  "app/mentions-legales/page.tsx": ["LCEN", "hébergeur|Hébergeur", "directeur de la publication|Directeur de la publication"],
  "app/cgu/page.tsx": ["Objet", "Responsabilité", "Droit applicable"],
  "app/cgv/page.tsx": ["rétractation|Rétractation", "L221-18", "médiation|Médiation", "L441-10"],
  "app/contact/page.tsx": ["CNIL", "consentement|Consentement", "responsable de traitement"],
};

for (const [page, needles] of Object.entries(PAGES)) {
  const src = read(page);
  for (const needle of needles) {
    check(
      `${page.split("/")[1]} mentionne « ${needle.split("|")[0]} »`,
      new RegExp(needle).test(src),
    );
  }
}

// Les champs qu'aucun générateur ne peut deviner doivent rester visibles,
// comme dans la Doc Factory : un texte légal qui invente une donnée est pire
// qu'un texte incomplet.
const pending = Object.keys(PAGES)
  .flatMap((p) => [...read(p).matchAll(/\[\[À COMPLÉTER : ([^\]]+)\]\]/g)].map((m) => m[1]));
check("les informations manquantes sont signalées, pas inventées", pending.length > 0);
console.log(`\n  ${pending.length} information(s) à fournir avant publication :`);
for (const p of pending) console.log(`    · ${p}`);

/* ════════════════ 4. accessibilité — ce qui est automatisable ═══════════ */

console.log("\nAccessibilité — contrôles mécanisables");

const pages = [];
const walk = (dir) => {
  for (const entry of readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })) {
    if (entry.isDirectory()) walk(`${dir}/${entry.name}`);
    else if (entry.name === "page.tsx") pages.push(`${dir}/${entry.name}`);
  }
};
walk("app");

const layout = read("app/layout.tsx");
check("la langue de la page est déclarée", /<html\s+lang="fr"/.test(layout), "critère RGAA 8.3");
check("un lien d'évitement existe", /["']#contenu["']/.test(layout), "critère RGAA 12.7");
check("le contenu principal est identifiable", /id="contenu"/.test(layout), "critère RGAA 12.6");

/**
 * L'analyse porte sur du CODE, pas sur du rendu — d'où deux précautions.
 *
 * Les commentaires sont retirés avant toute recherche : un `<svg>` cité dans
 * une explication n'est pas un `<svg>` rendu. Sans cela, `QrCode.tsx` était
 * signalé à tort parce que son en-tête décrit le balisage qu'il produit.
 *
 * Et certaines situations légitimes ressemblent à des défauts. Elles sont
 * DÉCLARÉES avec leur raison, sur le modèle des fixtures du moteur : ce qui
 * est exempté doit être écrit et relisible, jamais toléré en silence.
 */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Pages portant plusieurs <h1> dans des branches MUTUELLEMENT EXCLUSIVES. */
const H1_EXEMPTIONS = {
  "app/devis/page.tsx": "panneau d'erreur ou devis — jamais les deux à la fois",
  "app/documents/[slug]/page.tsx": "panneau d'erreur ou document — jamais les deux à la fois",
};

const multipleH1 = pages.filter(
  (p) => (stripComments(read(p)).match(/<h1[ >]/g) ?? []).length > 1 && !H1_EXEMPTIONS[p],
);
check(
  "aucune page ne rend deux titres de niveau 1",
  multipleH1.length === 0,
  multipleH1.join(", "),
);
// Une exemption qui ne correspond plus à rien masquerait un vrai défaut.
const staleH1 = Object.keys(H1_EXEMPTIONS).filter(
  (p) => (stripComments(read(p)).match(/<h1[ >]/g) ?? []).length <= 1,
);
check("aucune exemption de titre n'est périmée", staleH1.length === 0, staleH1.join(", "));

/**
 * Une image décorative doit être masquée aux lecteurs d'écran ; une image
 * porteuse d'information doit porter une alternative.
 *
 * Un `<svg>` peut être couvert par un ancêtre `aria-hidden` : le contrôle
 * examine donc les 300 caractères qui précèdent, ce qui couvre l'enveloppe
 * immédiate sans prétendre remonter l'arbre — une analyse statique ne le peut
 * pas, et faire semblant serait pire que de le dire.
 */
const svgFiles = pages.concat([
  "components/Logo.tsx",
  "components/QrCode.tsx",
  "components/Faq.tsx",
  "components/ContactCard.tsx",
]);
const bareSvg = [];
for (const file of svgFiles) {
  let src;
  try {
    src = stripComments(read(file));
  } catch {
    continue;
  }
  for (const match of src.matchAll(/<svg[^>]*>/g)) {
    const tag = match[0];
    if (/aria-hidden|role="img"|aria-label/.test(tag)) continue;
    const context = src.slice(Math.max(0, match.index - 300), match.index);
    if (/aria-hidden="true"/.test(context)) continue;
    bareSvg.push(file);
  }
}
check(
  "chaque SVG est soit décoratif, soit nommé",
  bareSvg.length === 0,
  [...new Set(bareSvg)].join(", "),
);

check(
  "l'animation respecte la préférence de mouvement réduit",
  read("app/globals.css").includes("prefers-reduced-motion"),
  "critère RGAA 13.8",
);
check(
  "la prise de focus est visible",
  read("app/globals.css").includes(":focus-visible"),
  "critère RGAA 10.7",
);

/* ── ce que ce contrôle ne couvre PAS ── */

console.log("\n  Non automatisable — à contrôler à la main avant toute déclaration RGAA :");
for (const item of [
  "pertinence des alternatives textuelles (critères 1.1 à 1.9)",
  "ordre de lecture et de tabulation réel (12.8, 12.9)",
  "cohérence entre intitulé de lien et destination (6.1, 6.2)",
  "contraste des textes sur images et des composants d'interface (3.2, 3.3)",
  "parcours complet au clavier seul, sans piège au focus (12.11)",
  "restitution par un lecteur d'écran réel (NVDA, VoiceOver)",
  "sous-titres et transcriptions des médias, s'il en est ajouté (4.1 à 4.13)",
]) {
  console.log(`    · ${item}`);
}
console.log(
  "\n  Une déclaration de conformité RGAA suppose un audit des 106 critères par\n" +
    "  une personne qualifiée. Ce fichier n'en tient pas lieu.",
);

/* ────────────────────────────────────────────────────────────────────────── */

console.log(
  failures === 0
    ? "\nContrôles juridiques et d'accessibilité : tous passés."
    : `\n${failures} contrôle(s) en échec.`,
);
process.exit(failures === 0 ? 0 : 1);
