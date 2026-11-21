#!/usr/bin/env node
/**
 * Construit les archives téléchargeables des extensions :
 *
 *   public/telechargements/konsent-navigateur.zip  (manifest.json à la racine)
 *   public/telechargements/konsent-wordpress.zip   (dossier konsent/ à la racine)
 *
 * Le dépôt est privé : ces archives sont la seule voie de distribution, elles
 * sont donc servies par le site et commitées.
 *
 * Aucune dépendance : le format ZIP est écrit à la main (compression deflate
 * de zlib, CRC32 calculé ici car `zlib.crc32` n'existe pas dans toutes les
 * versions de Node). Les entrées sont triées et datées d'une date fixe : deux
 * constructions du même contenu produisent le même fichier, octet pour octet.
 *
 * Les icônes de l'extension navigateur sont régénérées depuis public/icons/icon-512.png
 * quand `sharp` est installé (il l'est avec Next) ; sinon, les PNG déjà
 * présents dans le dossier sont utilisés tels quels.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "public", "telechargements");
const BROWSER = join(ROOT, "extensions", "navigateur");
const WORDPRESS = join(ROOT, "extensions", "wordpress");

/* ── icônes ─────────────────────────────────────────────────────────────── */

async function buildIcons() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.warn("  sharp indisponible : icônes existantes conservées.");
    return;
  }
  const source = readFileSync(join(ROOT, "public", "icons", "icon-512.png"));
  mkdirSync(join(BROWSER, "icons"), { recursive: true });
  for (const size of [16, 32, 48, 128]) {
    const png = await sharp(source)
      .resize(size, size, { kernel: "lanczos3" })
      .png()
      .toBuffer();
    writeFileSync(join(BROWSER, "icons", `icon-${size}.png`), png);
    console.log(`  icons/icon-${size}.png (${png.length} o)`);
  }
}

/* ── ZIP ────────────────────────────────────────────────────────────────── */

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// 1er janvier 2026, 00:00, au format DOS.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

/** @param {{ name: string, data: Buffer }[]} entries */
function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const deflated = deflateRawSync(data, { level: 9 });
    const stored = deflated.length >= data.length;
    const body = stored ? data : deflated;
    const method = stored ? 0 : 8;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version requise
    local.writeUInt16LE(0x0800, 6); // noms en UTF-8
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4); // créé par : Unix, v2.0
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // commentaire
    central.writeUInt16LE(0, 34); // disque
    central.writeUInt16LE(0, 36); // attributs internes
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38); // -rw-r--r--
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + body.length;
  }

  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

/** Fichiers d'un dossier, chemins relatifs à `base`, séparateur « / ». */
function collect(dir, base) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collect(full, base));
    else files.push({ name: relative(base, full).split(sep).join("/"), data: readFileSync(full) });
  }
  return files.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/* ── construction ───────────────────────────────────────────────────────── */

console.log("Icônes de l'extension navigateur");
await buildIcons();

mkdirSync(OUT, { recursive: true });
for (const [file, entries] of [
  ["konsent-navigateur.zip", collect(BROWSER, BROWSER)],
  ["konsent-wordpress.zip", collect(join(WORDPRESS, "konsent"), WORDPRESS)],
]) {
  const archive = zip(entries);
  writeFileSync(join(OUT, file), archive);
  console.log(`\n${file} — ${archive.length} o, ${entries.length} fichiers`);
  for (const e of entries) console.log(`  ${e.name}`);
}
