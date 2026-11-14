/**
 * Vérification d'une archive de preuve Konsent, entièrement dans le navigateur.
 *
 * Format produit par `lib/evidence/bundle.ts` et `lib/evidence/zip.ts` :
 *  - ZIP classique, entrées compressées en deflate (méthode 8), noms UTF-8 ;
 *  - `SHA256SUMS` liste l'empreinte de chaque fichier de contenu et du
 *    manifeste, au format de `sha256sum` (« empreinte, deux espaces, nom ») ;
 *  - `SHA256SUMS.sig` contient la signature Ed25519 de `SHA256SUMS`, en base64 ;
 *  - `public-key.pem` et `manifest.signature.publicKeyPem` portent la clé
 *    publique SPKI correspondante.
 *
 * N'utilise que des API standard : DecompressionStream, crypto.subtle,
 * TextDecoder. Aucune dépendance, aucun envoi réseau.
 */

export const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;
const MAX_ENTRIES = 64;
const MAX_ENTRY_BYTES = 50 * 1024 * 1024;

export interface ZipEntry {
  name: string;
  method: number;
  crc32: number;
  compressedSize: number;
  size: number;
  data: Uint8Array;
  crcOk: boolean;
}

export type FileStatus = "ok" | "altered" | "missing" | "unlisted" | "unreadable";

export interface FileVerdict {
  name: string;
  status: FileStatus;
  expected: string | null;
  actual: string | null;
  note: string;
}

export type SignatureStatus =
  | "valid"
  | "invalid"
  | "unsupported"
  | "missing"
  | "error";

export interface VerificationReport {
  files: FileVerdict[];
  signature: { status: SignatureStatus; note: string };
  manifest: {
    format: string | null;
    scanId: string | null;
    target: string | null;
    scannedAtUtc: string | null;
    productionKey: boolean | null;
    /** Les empreintes du manifeste concordent-elles avec SHA256SUMS ? */
    checksumsConsistent: boolean | null;
    /** La clé du manifeste est-elle identique à public-key.pem ? */
    keyConsistent: boolean | null;
  };
  /** Empreinte SHA-256 de la clé publique (DER SPKI), pour comparaison. */
  keyFingerprint: string | null;
  /** Résultat de la comparaison avec une clé de référence fournie. */
  referenceKeyMatch: boolean | null;
  archiveSha256: string;
  /** Verdict global. */
  verdict: "authentic" | "altered" | "incomplete";
}

export class ArchiveError extends Error {}

function u16(b: Uint8Array, o: number): number {
  return b[o]! | (b[o + 1]! << 8);
}
function u32(b: Uint8Array, o: number): number {
  return (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function inflateRaw(data: Uint8Array, limit: number): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new ArchiveError(
      "Ce navigateur ne sait pas décompresser l'archive (DecompressionStream indisponible).",
    );
  }
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new ArchiveError("Fichier décompressé plus volumineux que déclaré.");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

/** Lit le répertoire central puis chaque entrée. */
export async function readZip(bytes: Uint8Array): Promise<ZipEntry[]> {
  if (bytes.length > MAX_ARCHIVE_BYTES) throw new ArchiveError("Archive trop volumineuse (25 Mo au plus).");
  if (bytes.length < 22 || u32(bytes, 0) !== 0x04034b50) {
    throw new ArchiveError("Ce fichier n'est pas une archive ZIP.");
  }

  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65_535); i -= 1) {
    if (u32(bytes, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ArchiveError("Fin d'archive introuvable : le fichier est tronqué ou corrompu.");

  const count = u16(bytes, eocd + 10);
  const cdOffset = u32(bytes, eocd + 16);
  if (count > MAX_ENTRIES) throw new ArchiveError("Trop de fichiers dans l'archive.");

  const decoder = new TextDecoder("utf-8", { fatal: false });
  const entries: ZipEntry[] = [];
  let p = cdOffset;
  for (let i = 0; i < count; i += 1) {
    if (p + 46 > bytes.length || u32(bytes, p) !== 0x02014b50) {
      throw new ArchiveError("Répertoire central illisible.");
    }
    const method = u16(bytes, p + 10);
    const crc = u32(bytes, p + 16);
    const compressedSize = u32(bytes, p + 20);
    const size = u32(bytes, p + 24);
    const nameLen = u16(bytes, p + 28);
    const extraLen = u16(bytes, p + 30);
    const commentLen = u16(bytes, p + 32);
    const localOffset = u32(bytes, p + 42);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;

    if (size > MAX_ENTRY_BYTES) throw new ArchiveError(`Fichier ${name} trop volumineux.`);
    if (localOffset + 30 > bytes.length || u32(bytes, localOffset) !== 0x04034b50) {
      throw new ArchiveError(`En-tête local de ${name} illisible.`);
    }
    const start = localOffset + 30 + u16(bytes, localOffset + 26) + u16(bytes, localOffset + 28);
    const raw = bytes.subarray(start, start + compressedSize);
    if (raw.length !== compressedSize) throw new ArchiveError(`Contenu de ${name} tronqué.`);

    let data: Uint8Array;
    if (method === 0) data = raw.slice();
    else if (method === 8) {
      try {
        data = await inflateRaw(raw, size);
      } catch (error) {
        if (error instanceof ArchiveError && typeof DecompressionStream === "undefined") throw error;
        // Flux compressé altéré : le fichier est signalé, la vérification continue.
        data = new Uint8Array(0);
      }
    } else throw new ArchiveError(`Méthode de compression ${method} non prise en charge (${name}).`);

    entries.push({
      name,
      method,
      crc32: crc,
      compressedSize,
      size,
      data,
      crcOk: data.length === size && crc32(data) === crc,
    });
  }
  return entries;
}

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", data as BufferSource));
}

/** Lignes « empreinte  nom » de SHA256SUMS. */
export function parseSums(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const m = /^([0-9a-f]{64})\s+\*?(.+)$/i.exec(line.trim());
    if (m) out.set(m[2]!, m[1]!.toLowerCase());
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s+/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** Contenu DER d'une clé PEM, ou null si le texte n'en est pas une. */
export function pemToDer(pem: string): Uint8Array | null {
  const m = /-----BEGIN PUBLIC KEY-----([\s\S]+?)-----END PUBLIC KEY-----/.exec(pem);
  if (!m) return null;
  try {
    return base64ToBytes(m[1]!);
  } catch {
    return null;
  }
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

/** Fichiers qui, par construction, ne figurent pas dans SHA256SUMS. */
const OUTSIDE_SUMS: Record<string, string> = {
  SHA256SUMS: "Fichier signé lui-même : son intégrité est établie par la signature.",
  "SHA256SUMS.sig": "Signature détachée.",
  "public-key.pem": "Clé publique de vérification, comparée au manifeste.",
  "LISEZ-MOI.txt": "Notice lisible, hors du périmètre signé.",
};

async function verifySignature(
  sums: Uint8Array,
  sigText: string,
  der: Uint8Array,
): Promise<{ status: SignatureStatus; note: string }> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return { status: "unsupported", note: "WebCrypto indisponible (la page doit être servie en HTTPS)." };
  }
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey("spki", der as BufferSource, { name: "Ed25519" }, false, ["verify"]);
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotSupportedError" || name === "") {
      return {
        status: "unsupported",
        note: "Ce navigateur ne prend pas en charge Ed25519 dans WebCrypto. Les empreintes restent vérifiées ; pour la signature, utilisez un navigateur récent ou la commande OpenSSL indiquée plus bas.",
      };
    }
    return { status: "error", note: "La clé publique de l'archive est illisible." };
  }
  let signature: Uint8Array;
  try {
    signature = base64ToBytes(sigText.trim());
  } catch {
    return { status: "invalid", note: "La signature n'est pas un base64 valide." };
  }
  try {
    const ok = await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      signature as BufferSource,
      sums as BufferSource,
    );
    return ok
      ? {
          status: "valid",
          note: "La signature Ed25519 de SHA256SUMS est valide pour la clé publique jointe.",
        }
      : {
          status: "invalid",
          note: "La signature ne correspond pas à SHA256SUMS : le fichier a été modifié, ou signé par une autre clé.",
        };
  } catch {
    return { status: "error", note: "La vérification de la signature a échoué." };
  }
}

export async function verifyArchive(
  bytes: Uint8Array,
  referencePem: string | null,
): Promise<VerificationReport> {
  const archiveSha256 = await sha256Hex(bytes);
  const entries = await readZip(bytes);
  const byName = new Map(entries.map((e) => [e.name, e]));
  const text = (name: string) => {
    const e = byName.get(name);
    return e ? new TextDecoder().decode(e.data) : null;
  };

  const sumsEntry = byName.get("SHA256SUMS");
  const sums = sumsEntry ? parseSums(new TextDecoder().decode(sumsEntry.data)) : new Map<string, string>();

  const files: FileVerdict[] = [];
  for (const [name, expected] of sums) {
    const entry = byName.get(name);
    if (!entry) {
      files.push({ name, status: "missing", expected, actual: null, note: "Listé dans SHA256SUMS mais absent de l'archive." });
      continue;
    }
    const actual = await sha256Hex(entry.data);
    files.push({
      name,
      status: actual === expected ? "ok" : "altered",
      expected,
      actual,
      note:
        actual === expected
          ? "Empreinte identique à celle déclarée."
          : "Empreinte différente : le contenu a été modifié après la génération.",
    });
  }
  for (const entry of entries) {
    if (sums.has(entry.name)) continue;
    const known = OUTSIDE_SUMS[entry.name];
    files.push({
      name: entry.name,
      status: known ? (entry.crcOk ? "ok" : "unreadable") : "unlisted",
      expected: null,
      actual: await sha256Hex(entry.data),
      note: known ?? "Fichier ajouté : il ne figure pas dans SHA256SUMS et n'est couvert par aucune signature.",
    });
  }
  for (const f of files) {
    const e = byName.get(f.name);
    if (e && !e.crcOk && f.status === "ok") {
      f.status = "unreadable";
      f.note = "Somme CRC32 du ZIP incorrecte : fichier corrompu.";
    }
  }

  // ── Manifeste ──
  let manifest: Record<string, unknown> | null = null;
  try {
    const m = text("manifest.json");
    manifest = m ? (JSON.parse(m) as Record<string, unknown>) : null;
  } catch {
    manifest = null;
  }
  const sig = (manifest?.["signature"] ?? null) as Record<string, unknown> | null;
  const target = (manifest?.["target"] ?? null) as Record<string, unknown> | null;
  const manifestChecksums = (manifest?.["checksums"] ?? null) as Record<string, unknown> | null;
  const checksumsConsistent = manifestChecksums
    ? Object.entries(manifestChecksums).every(([n, h]) => sums.get(n) === String(h).toLowerCase())
    : null;

  const pemFile = text("public-key.pem");
  const pemManifest = typeof sig?.["publicKeyPem"] === "string" ? (sig["publicKeyPem"] as string) : null;
  const derFile = pemFile ? pemToDer(pemFile) : null;
  const derManifest = pemManifest ? pemToDer(pemManifest) : null;
  const keyConsistent = derFile && derManifest ? sameBytes(derFile, derManifest) : null;
  const der = derManifest ?? derFile;

  let referenceKeyMatch: boolean | null = null;
  if (referencePem && referencePem.trim() !== "" && der) {
    const ref = pemToDer(referencePem);
    const refHex = referencePem.replace(/[\s:]/g, "").toLowerCase();
    const fp = await sha256Hex(der);
    referenceKeyMatch = ref ? sameBytes(ref, der) : refHex === fp;
  }

  // ── Signature ──
  const sigText = text("SHA256SUMS.sig");
  let signature: { status: SignatureStatus; note: string };
  if (!sumsEntry || !sigText) {
    signature = { status: "missing", note: "SHA256SUMS ou sa signature est absent de l'archive." };
  } else if (!der) {
    signature = { status: "missing", note: "Aucune clé publique lisible dans l'archive." };
  } else {
    signature = await verifySignature(sumsEntry.data, sigText, der);
  }

  const anyBad = files.some((f) => f.status === "altered" || f.status === "missing" || f.status === "unreadable");
  const unlisted = files.some((f) => f.status === "unlisted");
  const verdict: VerificationReport["verdict"] =
    anyBad ||
    signature.status === "invalid" ||
    checksumsConsistent === false ||
    keyConsistent === false ||
    referenceKeyMatch === false
      ? "altered"
      : signature.status === "valid" && sums.size > 0 && !unlisted
        ? "authentic"
        : "incomplete";

  return {
    files,
    signature,
    manifest: {
      format: typeof manifest?.["format"] === "string" ? (manifest["format"] as string) : null,
      scanId: typeof manifest?.["scanId"] === "string" ? (manifest["scanId"] as string) : null,
      target: typeof target?.["url"] === "string" ? (target["url"] as string) : null,
      scannedAtUtc: typeof manifest?.["scannedAtUtc"] === "string" ? (manifest["scannedAtUtc"] as string) : null,
      productionKey: typeof sig?.["productionKey"] === "boolean" ? (sig["productionKey"] as boolean) : null,
      checksumsConsistent,
      keyConsistent,
    },
    keyFingerprint: der ? await sha256Hex(der) : null,
    referenceKeyMatch,
    archiveSha256,
    verdict,
  };
}
