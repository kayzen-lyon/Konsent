/**
 * Décodeur de chaîne de consentement TCF v2.
 *
 * Écrit en TypeScript pur, sans dépendance : la chaîne de consentement est une
 * pièce à conviction, et une pièce à conviction ne se délègue pas à un paquet
 * npm dont on ne relit pas le code.
 *
 * Rappel de cadrage, valable partout où ce module est utilisé. Le TCF est un
 * cadre PRIVÉ édicté par l'IAB Europe. L'autorité belge l'a jugé non conforme
 * en février 2022, décision partiellement confirmée par le Tribunal de l'Union
 * le 14 mars 2024 (T-111/23). Décoder une chaîne dit ce qu'elle CONTIENT, pas
 * si le traitement est licite.
 *
 * Structure : segments séparés par des points, chacun en base64url sans
 * remplissage, chaque caractère portant 6 bits. Seul le segment de tête (core)
 * est décodé ici — c'est lui qui porte les finalités, les vendors et le
 * moment du recueil, donc tout ce qui produit un constat.
 */

export interface PublisherRestriction {
  purposeId: number;
  /** 0 = finalité interdite · 1 = consentement requis · 2 = intérêt légitime requis. */
  restrictionType: number;
  vendorIds: readonly number[];
}

export interface TcfCore {
  version: number;
  /** Date de création du consentement, en UTC. */
  created: string;
  lastUpdated: string;
  cmpId: number;
  cmpVersion: number;
  consentScreen: number;
  consentLanguage: string;
  vendorListVersion: number;
  tcfPolicyVersion: number;
  isServiceSpecific: boolean;
  useNonStandardTexts: boolean;
  specialFeatureOptIns: readonly number[];
  /** Finalités pour lesquelles un consentement est enregistré. */
  purposesConsent: readonly number[];
  /** Finalités revendiquées au titre de l'intérêt légitime. */
  purposesLegitimateInterest: readonly number[];
  purposeOneTreatment: boolean;
  publisherCC: string;
  vendorConsents: readonly number[];
  vendorLegitimateInterests: readonly number[];
  publisherRestrictions: readonly PublisherRestriction[];
}

export type TcfDecodeResult =
  | { ok: true; core: TcfCore; segments: number }
  | { ok: false; reason: string };

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const B64_INDEX: ReadonlyMap<string, number> = new Map(
  [...B64].map((c, i) => [c, i] as const),
);

/** Lecteur de bits positionnel. Toute lecture hors limites est une erreur. */
class BitReader {
  private pos = 0;

  constructor(private readonly bits: string) {}

  read(n: number): number {
    if (this.pos + n > this.bits.length) {
      throw new RangeError(
        `lecture de ${n} bits à la position ${this.pos}, longueur ${this.bits.length}`,
      );
    }
    const slice = this.bits.slice(this.pos, this.pos + n);
    this.pos += n;
    return parseInt(slice, 2);
  }

  bool(): boolean {
    return this.read(1) === 1;
  }

  /**
   * Entier long (> 32 bits). `parseInt` sur binaire reste exact jusqu'à 53 bits,
   * ce qui couvre les 36 bits d'horodatage sans recourir à BigInt.
   */
  readLong(n: number): number {
    if (this.pos + n > this.bits.length) {
      throw new RangeError(`lecture longue de ${n} bits hors limites`);
    }
    let value = 0;
    for (let i = 0; i < n; i += 1) {
      value = value * 2 + (this.bits[this.pos + i] === "1" ? 1 : 0);
    }
    this.pos += n;
    return value;
  }

  /** Deux caractères encodés sur 6 bits chacun, A = 0. */
  readChars(count: number): string {
    let out = "";
    for (let i = 0; i < count; i += 1) {
      out += String.fromCharCode(65 + this.read(6));
    }
    return out;
  }

  /** Champ de bits : renvoie les indices à 1, numérotés à partir de 1. */
  readBitField(n: number): number[] {
    const out: number[] = [];
    for (let i = 1; i <= n; i += 1) {
      if (this.bool()) out.push(i);
    }
    return out;
  }

  get position(): number {
    return this.pos;
  }
}

function toBits(segment: string): string {
  let bits = "";
  for (const char of segment) {
    const index = B64_INDEX.get(char);
    if (index === undefined) {
      throw new SyntaxError(`caractère « ${char} » hors alphabet base64url`);
    }
    bits += index.toString(2).padStart(6, "0");
  }
  return bits;
}

/** Deciseconds depuis l'époque Unix → ISO 8601 UTC. */
function decodeTimestamp(deciseconds: number): string {
  return new Date(deciseconds * 100).toISOString();
}

/**
 * Section vendors : soit un champ de bits, soit des plages.
 * Le format à plages est celui qu'utilisent les CMP dès que la liste est
 * longue, donc le cas courant en production.
 */
function readVendorSection(r: BitReader): number[] {
  const maxVendorId = r.read(16);
  const isRangeEncoding = r.bool();

  if (!isRangeEncoding) {
    return r.readBitField(maxVendorId);
  }

  const numEntries = r.read(12);
  const vendors: number[] = [];
  for (let i = 0; i < numEntries; i += 1) {
    const isRange = r.bool();
    const start = r.read(16);
    if (isRange) {
      const end = r.read(16);
      if (end < start) {
        throw new RangeError(`plage de vendors inversée : ${start}–${end}`);
      }
      // Une plage aberrante ferait exploser la mémoire : on borne au maximum
      // déclaré, qui est lui-même contraint à 16 bits.
      for (let v = start; v <= Math.min(end, maxVendorId); v += 1) vendors.push(v);
    } else {
      vendors.push(start);
    }
  }
  return vendors;
}

function readPublisherRestrictions(r: BitReader): PublisherRestriction[] {
  const num = r.read(12);
  const out: PublisherRestriction[] = [];
  for (let i = 0; i < num; i += 1) {
    const purposeId = r.read(6);
    const restrictionType = r.read(2);
    const numEntries = r.read(12);
    const vendorIds: number[] = [];
    for (let j = 0; j < numEntries; j += 1) {
      const isRange = r.bool();
      const start = r.read(16);
      if (isRange) {
        const end = r.read(16);
        for (let v = start; v <= Math.min(end, start + 10_000); v += 1) vendorIds.push(v);
      } else {
        vendorIds.push(start);
      }
    }
    out.push({ purposeId, restrictionType, vendorIds });
  }
  return out;
}

/**
 * Décode une chaîne TCF.
 *
 * Ne lève jamais : une chaîne illisible est un CONSTAT (règle KZC-TCF-002),
 * pas un incident technique. Le motif est renvoyé pour être affiché tel quel
 * dans le rapport.
 */
export function decodeTcString(input: string): TcfDecodeResult {
  const trimmed = (input ?? "").trim();
  if (trimmed === "") return { ok: false, reason: "chaîne vide" };

  const segments = trimmed.split(".");
  const core = segments[0];
  if (core === undefined || core === "") {
    return { ok: false, reason: "segment de tête absent" };
  }
  try {
    const bits = toBits(core);
    const r = new BitReader(bits);

    const version = r.read(6);
    if (version !== 2) {
      return {
        ok: false,
        reason:
          version === 1
            ? "version 1 du TCF, retirée depuis le 30 juin 2020"
            : `version ${version} inconnue`,
      };
    }

    const created = decodeTimestamp(r.readLong(36));
    const lastUpdated = decodeTimestamp(r.readLong(36));
    const cmpId = r.read(12);
    const cmpVersion = r.read(12);
    const consentScreen = r.read(6);
    const consentLanguage = r.readChars(2);
    const vendorListVersion = r.read(12);
    const tcfPolicyVersion = r.read(6);
    const isServiceSpecific = r.bool();
    const useNonStandardTexts = r.bool();
    const specialFeatureOptIns = r.readBitField(12);
    const purposesConsent = r.readBitField(24);
    const purposesLegitimateInterest = r.readBitField(24);
    const purposeOneTreatment = r.bool();
    const publisherCC = r.readChars(2);
    const vendorConsents = readVendorSection(r);
    const vendorLegitimateInterests = readVendorSection(r);
    const publisherRestrictions = readPublisherRestrictions(r);

    return {
      ok: true,
      segments: segments.length,
      core: {
        version,
        created,
        lastUpdated,
        cmpId,
        cmpVersion,
        consentScreen,
        consentLanguage,
        vendorListVersion,
        tcfPolicyVersion,
        isServiceSpecific,
        useNonStandardTexts,
        specialFeatureOptIns,
        purposesConsent,
        purposesLegitimateInterest,
        purposeOneTreatment,
        publisherCC,
        vendorConsents,
        vendorLegitimateInterests,
        publisherRestrictions,
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "chaîne illisible",
    };
  }
}

/**
 * Encodeur minimal, réservé aux fixtures.
 *
 * Un décodeur testé uniquement sur des chaînes qu'il a lui-même produites ne
 * prouve pas grand-chose ; il prouve au moins que la disposition des champs
 * est celle de la spécification, ce qui est déjà l'essentiel des erreurs.
 */
export function encodeTcStringForTests(core: Partial<TcfCore> & { created?: string }): string {
  const bits: string[] = [];
  const push = (value: number, n: number) => bits.push(value.toString(2).padStart(n, "0"));
  const pushLong = (value: number, n: number) => {
    let out = "";
    let v = value;
    for (let i = 0; i < n; i += 1) {
      out = (v % 2).toString() + out;
      v = Math.floor(v / 2);
    }
    bits.push(out);
  };
  const pushField = (ids: readonly number[], n: number) => {
    for (let i = 1; i <= n; i += 1) bits.push(ids.includes(i) ? "1" : "0");
  };
  const pushChars = (s: string, count: number) => {
    for (let i = 0; i < count; i += 1) push(s.charCodeAt(i) - 65, 6);
  };

  const ts = Math.floor(new Date(core.created ?? "2026-08-08T10:00:00Z").getTime() / 100);

  push(2, 6);
  pushLong(ts, 36);
  pushLong(ts, 36);
  push(core.cmpId ?? 7, 12);
  push(core.cmpVersion ?? 1, 12);
  push(core.consentScreen ?? 1, 6);
  pushChars(core.consentLanguage ?? "FR", 2);
  push(core.vendorListVersion ?? 300, 12);
  push(core.tcfPolicyVersion ?? 4, 6);
  bits.push(core.isServiceSpecific ? "1" : "0");
  bits.push(core.useNonStandardTexts ? "1" : "0");
  pushField(core.specialFeatureOptIns ?? [], 12);
  pushField(core.purposesConsent ?? [], 24);
  pushField(core.purposesLegitimateInterest ?? [], 24);
  bits.push(core.purposeOneTreatment ? "1" : "0");
  pushChars(core.publisherCC ?? "FR", 2);

  // Vendors, en champ de bits pour rester lisible.
  const vc = core.vendorConsents ?? [];
  const maxVc = Math.max(0, ...vc);
  push(maxVc, 16);
  bits.push("0");
  pushField(vc, maxVc);

  const vli = core.vendorLegitimateInterests ?? [];
  const maxVli = Math.max(0, ...vli);
  push(maxVli, 16);
  bits.push("0");
  pushField(vli, maxVli);

  push((core.publisherRestrictions ?? []).length, 12);
  for (const pr of core.publisherRestrictions ?? []) {
    push(pr.purposeId, 6);
    push(pr.restrictionType, 2);
    push(pr.vendorIds.length, 12);
    for (const v of pr.vendorIds) {
      bits.push("0");
      push(v, 16);
    }
  }

  const stream = bits.join("");
  const padded = stream.padEnd(Math.ceil(stream.length / 6) * 6, "0");
  let out = "";
  for (let i = 0; i < padded.length; i += 6) {
    out += B64[parseInt(padded.slice(i, i + 6), 2)];
  }
  return out;
}
