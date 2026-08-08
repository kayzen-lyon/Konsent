/**
 * Contrôles de la couche d'extraction HTML.
 *
 * Ces deux bugs ont été trouvés en auditant Konsent avec Konsent. Ils étaient
 * invisibles autrement, et tous deux appartiennent à la classe que le PRD §20
 * classe en risque n°1 — le faux positif décrédibilisant.
 *
 *  1. `&#x27;` n'était pas décodé. React encode ainsi toutes les apostrophes :
 *     « droit d'accès » arrivait au lexique sous la forme « droit d&#x27;acces »
 *     et n'y correspondait jamais. Tout site rendu par React se voyait donc
 *     reprocher de ne pas énumérer les droits des personnes.
 *
 *  2. Les marqueurs de services tiers étaient cherchés dans le texte visible.
 *     Toute page PARLANT d'une plateforme de consentement était signalée comme
 *     en UTILISANT une. Konsent se détectait lui-même comme client de
 *     Cookiebot, Didomi, OneTrust et tarteaucitron.
 */
import { markerPresent, normalize, stripTags, structureOnly, usedAsIdentifier } from "../lib/engine/html.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

console.log("Décodage des entités");

const react = "<p>Vous disposez d&#x27;un droit d&#x27;acc&egrave;s et d&#x27;opposition.</p>";
const decoded = normalize(stripTags(react));
check("l'apostrophe hexadécimale est décodée", decoded.includes("droit d'acces"), decoded);
check("l'entité nommée reste gérée", !decoded.includes("&egrave;"), decoded);

check(
  "la forme décimale reste décodée",
  normalize(stripTags("<p>droit d&#39;acces</p>")).includes("droit d'acces"),
);
check(
  "&apos; reste décodée",
  normalize(stripTags("<p>droit d&apos;acces</p>")).includes("droit d'acces"),
);
check(
  "une entité invalide ne fait pas planter l'extraction",
  typeof stripTags("<p>&#xZZZZ; &#999999999;</p>") === "string",
);
check(
  "&amp;#x27; reste affiché tel quel et n'est pas doublement décodé",
  stripTags("<p>&amp;#x27;</p>").includes("&#x27;"),
);

console.log("\nMarqueurs : usage contre simple mention");

const prose = "<main><p>Nous comparons Cookiebot, Didomi et OneTrust entre eux.</p></main>";
const usage = '<script>window.Cookiebot.consent = {};</script>';
const attribute = '<div id="onetrust-banner-sdk" class="optanon"></div>';

check("une simple mention en prose ne compte pas", !markerPresent(structureOnly(prose), "Cookiebot"));
check("un usage réel compte", markerPresent(usage, "Cookiebot"));
check("un appel compte", markerPresent("<script>Didomi(1)</script>", "Didomi"));
check("un accès membre compte", markerPresent("<script>a=Didomi.notice</script>", "Didomi"));
check(
  "une mention en fin de phrase ne compte pas",
  !usedAsIdentifier("nous parlons de Didomi. Ensuite", "Didomi"),
);
check(
  "un identifiant plus long ne déclenche pas le marqueur court",
  !usedAsIdentifier("MonCookiebotMaison.init()", "Cookiebot"),
);

console.log("\nStructure contre texte");
check(
  "le texte visible est retiré",
  !structureOnly(prose).includes("Cookiebot"),
  structureOnly(prose),
);
check(
  "les attributs sont conservés",
  structureOnly(attribute).includes("onetrust-banner-sdk"),
);
check(
  "les fragments d'URL restent cherchés par inclusion simple",
  markerPresent("<script src=https://x/googletagmanager.com/gtm.js></script>", "googletagmanager.com/gtm.js"),
);

console.log(`\n${failures} échec(s).`);
if (failures > 0) process.exit(1);
