import { deflateRawSync } from "node:zlib";

/**
 * Écrivain ZIP minimal, sans dépendance.
 *
 * Un archiveur tiers introduirait une dépendance de plus dans un produit
 * dont l'argument est précisément de ne rien charger d'inutile. Le format
 * ZIP est simple : en-tête local par entrée, répertoire central, puis
 * enregistrement de fin. On implémente la méthode 8 (deflate).
 */

interface Entry {
  name: string;
  data: Buffer;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Horodatage MS-DOS. Le format ZIP ne stocke que la date locale, sans
 * fuseau : la date faisant foi est celle du manifeste, en UTC.
 */
function dosDateTime(date: Date): { time: number; date: number } {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | (Math.floor(date.getSeconds() / 2) & 0x1f);
  const d =
    (((date.getFullYear() - 1980) & 0x7f) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: d };
}

export class ZipBuilder {
  private readonly entries: Entry[] = [];

  add(name: string, content: string | Buffer): this {
    this.entries.push({
      name,
      data: typeof content === "string" ? Buffer.from(content, "utf8") : content,
    });
    return this;
  }

  build(at: Date): Buffer {
    const { time, date } = dosDateTime(at);
    const chunks: Buffer[] = [];
    const central: Buffer[] = [];
    let offset = 0;

    for (const entry of this.entries) {
      const nameBuf = Buffer.from(entry.name, "utf8");
      const crc = crc32(entry.data);
      const compressed = deflateRawSync(entry.data, { level: 9 });

      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0); // signature d'en-tête local
      local.writeUInt16LE(20, 4); // version minimale
      local.writeUInt16LE(0x0800, 6); // drapeau : noms en UTF-8
      local.writeUInt16LE(8, 8); // méthode : deflate
      local.writeUInt16LE(time, 10);
      local.writeUInt16LE(date, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(compressed.length, 18);
      local.writeUInt32LE(entry.data.length, 22);
      local.writeUInt16LE(nameBuf.length, 26);
      local.writeUInt16LE(0, 28);

      chunks.push(local, nameBuf, compressed);

      const cd = Buffer.alloc(46);
      cd.writeUInt32LE(0x02014b50, 0); // signature de répertoire central
      cd.writeUInt16LE(20, 4);
      cd.writeUInt16LE(20, 6);
      cd.writeUInt16LE(0x0800, 8);
      cd.writeUInt16LE(8, 10);
      cd.writeUInt16LE(time, 12);
      cd.writeUInt16LE(date, 14);
      cd.writeUInt32LE(crc, 16);
      cd.writeUInt32LE(compressed.length, 20);
      cd.writeUInt32LE(entry.data.length, 24);
      cd.writeUInt16LE(nameBuf.length, 28);
      cd.writeUInt16LE(0, 30);
      cd.writeUInt16LE(0, 32);
      cd.writeUInt16LE(0, 34);
      cd.writeUInt16LE(0, 36);
      cd.writeUInt32LE(0, 38);
      cd.writeUInt32LE(offset, 42);

      central.push(cd, nameBuf);
      offset += local.length + nameBuf.length + compressed.length;
    }

    const centralBuf = Buffer.concat(central);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // signature de fin
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(this.entries.length, 8);
    eocd.writeUInt16LE(this.entries.length, 10);
    eocd.writeUInt32LE(centralBuf.length, 12);
    eocd.writeUInt32LE(offset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...chunks, centralBuf, eocd]);
  }
}
