#!/usr/bin/env node
// Contrastes WCAG des jetons de couleur, lus dans app/globals.css.
//
// Trois blocs sont fusionnés pour reconstituer chaque thème :
//   clair              : @theme
//   sombre             : @theme + .dark (+ la règle `.dark .text-flame`)
//   contraste renforcé : @theme + html[data-contrast="high"]
//   renforcé + sombre  : les quatre blocs, dans l'ordre de la cascade
//
// Le script échoue (code 1) dès qu'une paire critique passe sous son seuil.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const css = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Corps du premier bloc dont le sélecteur correspond exactement. */
function block(selector) {
  const re = new RegExp(`(^|[}\\s])${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "m");
  const m = css.match(re);
  if (!m) throw new Error(`Bloc introuvable dans globals.css : ${selector}`);
  return m[2];
}

function tokens(body) {
  const out = {};
  for (const [, name, value] of body.matchAll(/--color-([\w-]+)\s*:\s*([^;]+);/g)) out[name] = value.trim();
  return out;
}

function prop(body, name) {
  const m = body.match(new RegExp(`(^|[;\\s])${name}\\s*:\\s*([^;]+);`));
  if (!m) throw new Error(`Propriété ${name} introuvable`);
  return m[2].trim();
}

const base = tokens(block("@theme"));
const dark = tokens(block(".dark"));
const high = tokens(block('html[data-contrast="high"]'));
const highDark = tokens(block('html[data-contrast="high"].dark'));
const darkTextFlame = prop(block(".dark .text-flame"), "color");

function hex(value, label) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (!m) throw new Error(`Couleur non hexadécimale pour ${label} : ${value}`);
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

// Luminance relative et rapport de contraste — WCAG 2.1, §1.4.3.
function luminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const themes = [
  { name: "clair", t: { ...base }, isDark: false },
  { name: "sombre", t: { ...base, ...dark }, isDark: true },
  { name: "contraste renforcé", t: { ...base, ...high }, isDark: false },
  { name: "contraste renforcé sombre", t: { ...base, ...dark, ...high, ...highDark }, isDark: true },
];

const WHITE = "#ffffff";
let failures = 0;
let checks = 0;

for (const { name, t, isDark } of themes) {
  // En sombre, `.dark .text-flame` remplace le jeton pour le texte (la
  // règle l'emporte sur la variable, contraste renforcé compris).
  const flameText = isDark ? darkTextFlame : t.flame;
  const pairs = [];
  for (const fg of ["ink-2", "muted"]) {
    for (const bg of ["paper", "surface", "surface-low", "surface-high"]) {
      pairs.push([`${fg} sur ${bg}`, t[fg], t[bg], 4.5]);
    }
  }
  for (const bg of ["paper", "surface"]) {
    pairs.push([`texte flame${isDark ? " (.dark .text-flame)" : ""} sur ${bg}`, flameText, t[bg], 4.5]);
  }
  pairs.push(["blanc sur flame", WHITE, t.flame, 4.5]);
  pairs.push(["line-2 sur paper", t["line-2"], t.paper, 3]);
  pairs.push(["crit-text sur crit-bg", t["crit-text"], t["crit-bg"], 4.5]);
  pairs.push(["warn sur warn-bg", t.warn, t["warn-bg"], 4.5]);
  pairs.push(["ok sur ok-bg", t.ok, t["ok-bg"], 4.5]);

  console.log(`\nThème ${name}`);
  for (const [label, fg, bg, min] of pairs) {
    checks++;
    const r = ratio(hex(fg, label), hex(bg, label));
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? "ok  " : "ÉCHEC"} ${r.toFixed(2).padStart(5)}:1 (≥ ${min})  ${label}  [${fg} / ${bg}]`);
  }
}

console.log(`\n${checks - failures}/${checks} paires conformes.`);
if (failures) {
  console.error(`${failures} paire(s) sous le seuil WCAG 2.1 AA.`);
  process.exit(1);
}
