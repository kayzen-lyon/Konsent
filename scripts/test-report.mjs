/**
 * Contrôles des niveaux de lecture.
 *
 * L'invariant qui compte n'est pas cosmétique : les trois vues doivent
 * montrer les MÊMES écarts. Un niveau qui masquerait un constat produirait
 * trois vérités différentes sur le même site — un dirigeant rassuré par une
 * vue que son DPO lit comme alarmante. C'est exactement le reproche que
 * Konsent adresse au marché, et il serait ici de notre fait.
 *
 * Ce que les niveaux modulent est l'APPAREILLAGE : référence normative,
 * message technique, preuve brute. Jamais le fond.
 */
import { readFileSync } from "node:fs";
import {
  DEFAULT_READING_LEVEL,
  READING_LEVELS,
  parseReadingLevel,
  readingLevel,
} from "../lib/report/levels.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

/* ─────────────────────────────── lecture du paramètre ─────────────────── */

console.log("Lecture du paramètre d'URL");

check("un niveau connu est retenu", parseReadingLevel("dpo") === "dpo");
check("un niveau inconnu retombe sur le défaut", parseReadingLevel("expert") === DEFAULT_READING_LEVEL);
check("l'absence de paramètre retombe sur le défaut", parseReadingLevel(undefined) === DEFAULT_READING_LEVEL);
// Un paramètre d'URL est saisi par n'importe qui : il ne doit jamais servir
// de sélecteur d'objet sans validation.
check("une valeur fabriquée ne passe pas", parseReadingLevel("__proto__") === DEFAULT_READING_LEVEL);
check("le défaut est le niveau le moins technique", DEFAULT_READING_LEVEL === "dirigeant");

/* ──────────────────────────────── l'échelle est monotone ──────────────── */

console.log("\nProgression des niveaux");

// Chaque niveau doit contenir tout ce que montre le précédent. Une case
// décochée en remontant l'échelle signifierait qu'un développeur voit moins
// qu'un dirigeant sur un aspect — une régression invisible à la relecture.
const FLAGS = ["showNormative", "showTechnical", "showRawEvidence"];
for (let i = 1; i < READING_LEVELS.length; i += 1) {
  const previous = READING_LEVELS[i - 1];
  const current = READING_LEVELS[i];
  for (const flag of FLAGS) {
    check(
      `${current.id} ne retire pas « ${flag} » à ${previous.id}`,
      !previous[flag] || current[flag],
    );
  }
}

check(
  "le niveau dirigeant n'affiche aucun appareillage",
  FLAGS.every((f) => readingLevel("dirigeant")[f] === false),
);
check(
  "le niveau développeur affiche tout",
  FLAGS.every((f) => readingLevel("developpeur")[f] === true),
);
check("chaque niveau porte un libellé et une explication", READING_LEVELS.every((l) => l.label && l.hint));

/* ─────────────────── aucun niveau ne filtre les constats ──────────────── */

console.log("\nLe fond ne dépend pas du niveau");

// Contrôle par lecture du composant plutôt que par rendu : il s'agit de
// vérifier qu'aucun filtre n'a été introduit sur la LISTE des constats. Le
// jour où quelqu'un écrira `findings.filter(... level ...)`, ce test le dira.
const findingsSrc = readFileSync(new URL("../components/Findings.tsx", import.meta.url), "utf8");

const filtersFindingsByLevel =
  /findings[\s\S]{0,80}\.filter\([^)]*\b(level|spec)\b/.test(findingsSrc) ||
  /\.filter\([^)]*\b(level|spec)\b[^)]*\)[\s\S]{0,40}findings/.test(findingsSrc);
check(
  "la liste des constats n'est jamais filtrée par le niveau",
  !filtersFindingsByLevel,
  "un niveau qui masque un écart fabrique une seconde vérité sur le même site",
);

check(
  "la sévérité est affichée dans tous les niveaux",
  /<SeverityBadge/.test(findingsSrc) && !/spec\.\w+\s*\?\s*<SeverityBadge/.test(findingsSrc),
);

// Le message dirigeant est le seul texte présent partout : c'est lui qui
// porte le constat quand tout le reste est retiré.
check(
  "le message dirigeant n'est conditionné par aucun niveau",
  /\{rule\.messageExec\}/.test(findingsSrc) &&
    !/spec\.\w+\s*\?[^:]{0,60}rule\.messageExec/.test(findingsSrc),
);

/* ───────────────────────────────── impression ─────────────────────────── */

console.log("\nFeuille d'impression");

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const printBlock = css.slice(css.indexOf("@media print"));

check("une feuille d'impression existe", css.includes("@media print"));
check(
  "les preuves repliées s'ouvrent sur le papier",
  /details\s*>\s*\*:not\(summary\)/.test(printBlock) && printBlock.includes("display: block !important"),
);
check("un constat n'est pas coupé entre deux pages", /break-inside:\s*avoid/.test(printBlock));
check("les fonds sombres repassent en blanc", /\.bg-ink\s*\{[\s\S]{0,80}background:\s*#fff/.test(printBlock));
check("la destination des liens est restituée", /a\[href\^="http"\]::after/.test(printBlock));

// Le bouton d'impression ne doit pas figurer sur la feuille imprimée.
const buttonSrc = readFileSync(
  new URL("../components/PrintReportButton.tsx", import.meta.url),
  "utf8",
);
check("le bouton d'impression disparaît à l'impression", buttonSrc.includes("print:hidden"));

// Et le rapport papier doit dire dans quelle vue il a été produit, sans quoi
// une vue dirigeant imprimée passerait pour un rapport complet.
const pickerSrc = readFileSync(
  new URL("../components/ReadingLevelPicker.tsx", import.meta.url),
  "utf8",
);
check(
  "le niveau retenu est écrit sur le papier",
  pickerSrc.includes("print:block") && pickerSrc.includes("PrintedLevelNotice"),
);

/* ────────────────────────────────────────────────────────────────────────── */

console.log(
  failures === 0
    ? "\nContrôles des niveaux de lecture : tous passés."
    : `\n${failures} contrôle(s) en échec.`,
);
process.exit(failures === 0 ? 0 : 1);
