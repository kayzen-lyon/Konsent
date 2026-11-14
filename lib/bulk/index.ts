/**
 * Analyse en lot — logique pure (aucun accès réseau, aucun état).
 *
 * Le composant client s'appuie sur ces fonctions pour lire la liste
 * collée par l'utilisateur, trier le tableau et produire les exports.
 * Elles sont isolées ici pour être testées sans navigateur.
 */

/** Plafond aligné sur la limite de débit de GET /api/scan (20 analyses / 10 min). */
export const BULK_MAX = 20;

/* ═══════════════════════════════ Lecture des adresses ═══════════════════════════════ */

export type BulkTarget = {
  /** Saisie d'origine, telle que collée. */
  input: string;
  /** Adresse normalisée envoyée à l'API (`https://hôte/chemin`). */
  url: string;
  /** Domaine sans `www.`, clé de dédoublonnage. */
  host: string;
};

export type ParseResult = {
  targets: BulkTarget[];
  /** Saisies qui ne forment pas une adresse web exploitable. */
  invalid: string[];
  /** Saisies écartées parce que leur domaine figure déjà dans la liste. */
  duplicates: string[];
  /** Adresses valides au-delà du plafond, non retenues. */
  overflow: string[];
};

/** Normalise une saisie en adresse http(s), ou renvoie `null`. */
export function normalizeTarget(raw: string): BulkTarget | null {
  // Ponctuation de fin laissée par un copier-coller depuis un texte.
  const input = raw.trim().replace(/[.)\]>"']+$/, "").replace(/^[<("']+/, "");
  if (!input) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname.includes(".") || hostname.startsWith(".")) return null;
  const path = url.pathname === "/" ? "" : url.pathname;
  return {
    input: raw.trim(),
    url: `${url.protocol}//${hostname}${url.port ? `:${url.port}` : ""}${path}${url.search}`,
    host: hostname.replace(/^www\./, ""),
  };
}

/**
 * Lit une liste d'adresses : une par ligne, ou séparées par des virgules,
 * points-virgules ou espaces. Dédoublonne par domaine (la première
 * occurrence l'emporte) et plafonne à `max`.
 */
export function parseTargets(text: string, max: number = BULK_MAX): ParseResult {
  const result: ParseResult = { targets: [], invalid: [], duplicates: [], overflow: [] };
  const seen = new Set<string>();
  for (const token of text.split(/[\s,;]+/)) {
    if (!token) continue;
    const target = normalizeTarget(token);
    if (!target) {
      result.invalid.push(token);
      continue;
    }
    if (seen.has(target.host)) {
      result.duplicates.push(token);
      continue;
    }
    seen.add(target.host);
    if (result.targets.length >= max) result.overflow.push(token);
    else result.targets.push(target);
  }
  return result;
}

/* ═══════════════════════════════ Lignes du tableau ═══════════════════════════════ */

export type RowStatus = "pending" | "running" | "ok" | "error" | "skipped";

export type BulkRow = BulkTarget & {
  status: RowStatus;
  grade?: string;
  score?: number;
  critical?: number;
  total?: number;
  vendors?: number;
  outsideEea?: number;
  mode?: "static" | "headless";
  degraded?: boolean;
  error?: string;
};

/** Sous-ensemble de la réponse de GET /api/scan utilisé par le lot. */
export type ScanApiResponse = {
  degraded?: unknown;
  scan: { hostname: string; mode: "static" | "headless"; score: number; grade: string };
  findings: { severity: string }[];
  vendors: { adequacy: string }[];
};

/** Résume une réponse d'API en ligne de tableau. */
export function rowFromResponse(target: BulkTarget, data: ScanApiResponse): BulkRow {
  return {
    ...target,
    status: "ok",
    grade: data.scan.grade,
    score: data.scan.score,
    critical: data.findings.filter((f) => f.severity === "CRITICAL").length,
    total: data.findings.length,
    vendors: data.vendors.length,
    // Même règle que le moteur (`outsideEea`) : tout ce qui n'est pas EEE.
    outsideEea: data.vendors.filter((v) => v.adequacy !== "EEA").length,
    mode: data.scan.mode,
    degraded: Boolean(data.degraded),
  };
}

export const MODE_LABELS: Record<"static" | "headless", string> = {
  static: "Statique",
  headless: "Trois phases",
};

export const STATUS_LABELS: Record<RowStatus, string> = {
  pending: "En attente",
  running: "En cours",
  ok: "Terminée",
  error: "Erreur",
  skipped: "Non lancée",
};

/* ═══════════════════════════════════ Tri ═══════════════════════════════════ */

export type SortKey =
  | "host"
  | "grade"
  | "score"
  | "critical"
  | "total"
  | "vendors"
  | "outsideEea"
  | "mode"
  | "status";

export type SortDir = "asc" | "desc";

function sortValue(row: BulkRow, key: SortKey): string | number | undefined {
  if (key === "status") return STATUS_LABELS[row.status];
  if (key === "mode") return row.mode ? MODE_LABELS[row.mode] : undefined;
  return row[key];
}

/** Trie sans muter. Les valeurs absentes (erreurs, en attente) restent en bas. */
export function sortRows(rows: readonly BulkRow[], key: SortKey, dir: SortDir): BulkRow[] {
  const factor = dir === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const va = sortValue(a.row, key);
      const vb = sortValue(b.row, key);
      if (va === undefined && vb === undefined) return a.index - b.index;
      if (va === undefined) return 1;
      if (vb === undefined) return -1;
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "fr", { sensitivity: "base", numeric: true });
      return cmp === 0 ? a.index - b.index : cmp * factor;
    })
    .map(({ row }) => row);
}

/* ═══════════════════════════════════ Synthèse ═══════════════════════════════════ */

export type Summary = {
  count: number;
  average: number | null;
  best: BulkRow | null;
  worst: BulkRow | null;
};

export function summarize(rows: readonly BulkRow[]): Summary {
  const done = rows.filter((r): r is BulkRow & { score: number } => r.status === "ok" && typeof r.score === "number");
  if (done.length === 0) return { count: 0, average: null, best: null, worst: null };
  let best = done[0]!;
  let worst = done[0]!;
  let sum = 0;
  for (const r of done) {
    sum += r.score;
    if (r.score > best.score) best = r;
    if (r.score < worst.score) worst = r;
  }
  return { count: done.length, average: Math.round((sum / done.length) * 10) / 10, best, worst };
}

/* ═══════════════════════════════════ Exports ═══════════════════════════════════ */

const BOM = "﻿";

/**
 * Échappe une cellule pour un CSV à séparateur « ; ».
 * Les cellules texte commençant par = + - @ sont préfixées d'une apostrophe
 * pour qu'un tableur ne les interprète pas comme une formule.
 */
export function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value).replace(".", ",") : "";
  if (typeof value === "boolean") return value ? "oui" : "non";
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const CSV_HEADERS = [
  "Adresse",
  "Domaine",
  "Note",
  "Score",
  "Écarts critiques",
  "Total écarts",
  "Destinataires",
  "Hors EEE",
  "Mode d'analyse",
  "Analyse dégradée",
  "Statut",
  "Message",
] as const;

/** CSV prêt pour Excel en français : BOM UTF-8, séparateur « ; », fins de ligne CRLF. */
export function toCsv(rows: readonly BulkRow[]): string {
  const lines = [CSV_HEADERS.map(csvCell).join(";")];
  for (const r of rows) {
    lines.push(
      [
        r.url,
        r.host,
        r.grade,
        r.score,
        r.critical,
        r.total,
        r.vendors,
        r.outsideEea,
        r.mode ? MODE_LABELS[r.mode] : undefined,
        r.status === "ok" ? Boolean(r.degraded) : undefined,
        STATUS_LABELS[r.status],
        r.error,
      ]
        .map(csvCell)
        .join(";"),
    );
  }
  return BOM + lines.join("\r\n") + "\r\n";
}

export function toJson(rows: readonly BulkRow[], disclaimer: string, generatedAt: Date): string {
  return JSON.stringify(
    {
      generatedAt: generatedAt.toISOString(),
      disclaimer,
      summary: (({ count, average, best, worst }) => ({
        count,
        average,
        best: best ? { host: best.host, score: best.score } : null,
        worst: worst ? { host: worst.host, score: worst.score } : null,
      }))(summarize(rows)),
      results: rows,
    },
    null,
    2,
  );
}

/** `konsent-lot-AAAA-MM-JJ.csv`, à la date locale. */
export function exportFilename(date: Date, ext: "csv" | "json"): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `konsent-lot-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.${ext}`;
}

/* ═══════════════════════════════ Limite de débit ═══════════════════════════════ */

/** Lit l'en-tête Retry-After (secondes ou date HTTP). `null` si absent ou illisible. */
export function retryAfterSeconds(header: string | null, now: number = Date.now()): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const at = Date.parse(trimmed);
  return Number.isNaN(at) ? null : Math.max(0, Math.ceil((at - now) / 1000));
}

/** « 7 minutes », « 45 secondes », « 1 minute ». */
export function formatDelay(seconds: number): string {
  if (seconds < 60) return `${seconds} seconde${seconds > 1 ? "s" : ""}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}
