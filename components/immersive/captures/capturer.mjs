/**
 * Captures des écrans réels de Konsent, pour l'aperçu immersif.
 *
 * Usage : serveur de développement lancé, puis
 *   node components/immersive/captures/capturer.mjs [http://localhost:3000]
 *
 * Chaque page est photographiée telle qu'elle est servie (1440 × 810, thème
 * clair, animations réduites), puis déclinée en deux formats WebP :
 *   <nom>.webp      960 × 540 — scène fixe
 *   mur/<nom>.webp  480 × 270 — mur en perspective
 * Rien n'est retouché ni composé : ce sont les pages du produit.
 */
import { cpSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const BASE = process.argv[2] ?? "http://localhost:3000";
const DEST = dirname(fileURLToPath(import.meta.url));
// Écrire dans app/ fait recompiler le serveur de développement à chaque
// image : on travaille dans un dossier temporaire, copié d'un coup à la fin.
const OUT = mkdtempSync(join(tmpdir(), "konsent-captures-"));

const PAGES = {
  "generateur-bandeau": "/outils/generateur-bandeau",
  "generateur-mentions-legales": "/outils/generateur-mentions-legales",
  "generateur-confidentialite": "/outils/generateur-confidentialite",
  "en-tetes-securite": "/outils/en-tetes-securite",
  "testeur-cookie": "/outils/testeur-cookie",
  "duree-conservation": "/outils/duree-conservation",
  "reponse-droits": "/outils/reponse-droits",
  "registre-traitements": "/outils/registre-traitements",
  "procedure-cnil": "/outils/procedure-cnil",
  comparer: "/comparer",
  "auto-evaluation": "/auto-evaluation",
  badge: "/badge",
  "decodeur-tcf": "/outils/decodeur-tcf",
  "verificateur-preuve": "/outils/verificateur-preuve",
  simulateur: "/simulateur",
  regles: "/regles",
  traceurs: "/traceurs",
  cookies: "/cookies",
  glossaire: "/glossaire",
  fonctionnalites: "/fonctionnalites",
  methodologie: "/methodologie",
  surveillance: "/surveillance",
  comparatif: "/comparatif",
  tarifs: "/tarifs",
  "analyse-en-lot": "/analyse-en-lot",
};

mkdirSync(join(OUT, "mur"), { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 810 },
  locale: "fr-FR",
  colorScheme: "light",
  reducedMotion: "reduce",
});
const page = await context.newPage();

for (const [name, path] of Object.entries(PAGES)) {
  const response = await page.goto(BASE + path, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`${path} : HTTP ${response?.status()}`);
  // L'indicateur du serveur de développement n'appartient pas au produit.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(400);
  const png = await page.screenshot({ type: "png" });
  await sharp(png).resize(960, 540).webp({ quality: 80 }).toFile(join(OUT, `${name}.webp`));
  await sharp(png).resize(480, 270).webp({ quality: 68 }).toFile(join(OUT, "mur", `${name}.webp`));
  console.log(`✓ ${path}`);
}

await browser.close();
cpSync(OUT, DEST, { recursive: true });
