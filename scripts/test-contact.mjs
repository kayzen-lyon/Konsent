/**
 * Contrôles de la carte de contact : vCard et QR codes.
 *
 * Le contrôle qui compte est celui des QR codes, et il ne consiste PAS à
 * vérifier qu'un fichier a été produit. Un QR code faux s'affiche exactement
 * comme un QR code juste : c'est un carré de points, personne ne le relit, et
 * le défaut ne se découvre qu'imprimé sur une carte de visite ou une vitrine.
 *
 * On reconstruit donc la matrice DEPUIS LE TRACÉ SVG généré — ce qui éprouve
 * la fusion des modules contigus, seul endroit du pipeline où une erreur soit
 * plausible — puis on la donne à un décodeur indépendant. Si l'adresse
 * décodée n'est pas celle attendue, le test échoue.
 */
import { readFileSync } from "node:fs";
import jsQR from "jsqr";
import { QR_CODES } from "../lib/contact/qr-generated.ts";
import { buildVCard, escapeValue, foldLine, VCARD_FILENAME } from "../lib/contact/vcard.ts";
import { EDITOR } from "../lib/disclaimer.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

/* ═════════════════════════ 1. QR : aller-retour ═════════════════════════ */

console.log("QR codes — décodage du tracé réellement généré");

/** Reconstruit la matrice depuis le tracé SVG. Inverse exact de `toPath`. */
function matrixFromPath(path, size) {
  const grid = Array.from({ length: size }, () => new Uint8Array(size));
  for (const [, x, y, run] of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let i = 0; i < Number(run); i += 1) grid[Number(y)][Number(x) + i] = 1;
  }
  return grid;
}

/**
 * Rastérise en RGBA, avec la zone de silence de 4 modules qu'impose la
 * spécification. L'omettre ferait échouer la lecture sur un code pourtant
 * correct — et c'est l'erreur d'intégration la plus courante.
 */
function rasterise(grid, size, scale = 4, quiet = 4) {
  const side = (size + quiet * 2) * scale;
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!grid[y][x]) continue;
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const px = (x + quiet) * scale + dx;
          const py = (y + quiet) * scale + dy;
          const i = (py * side + px) * 4;
          pixels[i] = 0;
          pixels[i + 1] = 0;
          pixels[i + 2] = 0;
        }
      }
    }
  }
  return { pixels, side };
}

const generated = QR_CODES.filter((q) => q.size > 0);
check("au moins un QR code est généré", generated.length > 0);

for (const qr of generated) {
  const grid = matrixFromPath(qr.path, qr.size);
  const { pixels, side } = rasterise(grid, qr.size);
  const decoded = jsQR(pixels, side, side);

  check(`${qr.key} — le code se décode`, Boolean(decoded), "tracé illisible");
  if (decoded) {
    check(
      `${qr.key} — l'adresse décodée est la bonne`,
      decoded.data === qr.url,
      `attendu ${qr.url}, obtenu ${decoded.data}`,
    );
  }
}

/* ── ce que le générateur refuse de faire ── */

const reviews = QR_CODES.find((q) => q.key === "reviews");
check(
  "aucun QR n'est fabriqué sans adresse",
  reviews && reviews.size === 0 && reviews.url === null,
  "un QR pointant vers une adresse devinée serait pire qu'aucun QR",
);

/* ── aucune ressource externe ── */

const generatedSrc = readFileSync(new URL("../lib/contact/qr-generated.ts", import.meta.url), "utf8");
check(
  "le module généré n'appelle aucun service tiers",
  !/qrserver|api\.qrcode|chart\.googleapis|https?:\/\/[^"]*generate/i.test(generatedSrc),
  "un QR appelé à un tiers ferait fuiter l'IP de chaque visiteur",
);

/* ═══════════════════════════ 2. la fiche vCard ══════════════════════════ */

console.log("\nvCard");

const card = buildVCard();

check("commence et finit comme une vCard", card.startsWith("BEGIN:VCARD\r\n") && card.trimEnd().endsWith("END:VCARD"));
check("annonce la version 4.0", card.includes("VERSION:4.0"));
check("se termine par CRLF", card.endsWith("\r\n"));
check("n'utilise jamais de LF seul", !/[^\r]\n/.test(card));

// RFC 6350 §3.2 : 75 octets par ligne. Le compte se fait en octets.
const encoder = new TextEncoder();
const tooLong = card.split("\r\n").filter((l) => encoder.encode(l).length > 75);
check("aucune ligne ne dépasse 75 octets", tooLong.length === 0, tooLong[0]?.slice(0, 40));

// ADR a sept composantes. Une de moins et le carnet d'adresses range la ville
// dans le code postal, sans rien signaler.
const adr = card.split("\r\n").find((l) => l.startsWith("ADR"));
check("ADR porte bien sept composantes", adr && adr.split(":")[1].split(";").length === 7, adr);

check("le téléphone est en E.164", card.includes(`tel:${EDITOR.phoneE164}`));
check("le SIRET figure, distinct du SIREN", card.includes(EDITOR.siret) && card.includes(EDITOR.siren));
check("le nom de fichier est explicite", VCARD_FILENAME.endsWith(".vcf"));

// Horodatage figé : une fiche dont REV change à chaque téléchargement crée un
// doublon dans le carnet d'adresses à chaque import.
check("l'horodatage est figé", buildVCard() === card && /REV:\d{8}T\d{6}Z/.test(card));

/* ── échappement ── */

console.log("\nÉchappement");

check("la barre oblique inverse est échappée en premier", escapeValue("a\\b") === "a\\\\b");
check("le point-virgule est échappé", escapeValue("a;b") === "a\\;b");
check("la virgule est échappée", escapeValue("a,b") === "a\\,b");
check("le saut de ligne devient \\n", escapeValue("a\nb") === "a\\nb");
// Le cas qui casse tout : une virgule non échappée dans une adresse décale
// silencieusement chaque composante suivante.
check(
  "une adresse à virgule ne décale pas les composantes",
  escapeValue("6 rue Pierre Termier, Lyon").split(";").length === 1,
);

/* ── pliage ── */

console.log("\nPliage");

const long = `NOTE:${"a".repeat(200)}`;
const folded = foldLine(long);
check(
  "une ligne longue est pliée sous 75 octets",
  folded.split("\r\n").every((l) => encoder.encode(l).length <= 75),
);
check("les continuations commencent par une espace", folded.split("\r\n").slice(1).every((l) => l.startsWith(" ")));
check("le dépliage restitue l'original", folded.replace(/\r\n /g, "") === long);

// Le piège du multi-octets : couper au caractère près scinderait un « é » en
// deux et rendrait le fichier illisible sur certains téléphones.
const accented = `NOTE:${"é".repeat(100)}`;
const foldedAccented = foldLine(accented);
check(
  "un texte accentué reste sous 75 OCTETS",
  foldedAccented.split("\r\n").every((l) => encoder.encode(l).length <= 75),
);
check("aucun caractère n'est coupé en deux", foldedAccented.replace(/\r\n /g, "") === accented);

/* ────────────────────────────────────────────────────────────────────────── */

console.log(
  failures === 0
    ? "\nContrôles de la carte de contact : tous passés."
    : `\n${failures} contrôle(s) en échec.`,
);
process.exit(failures === 0 ? 0 : 1);
