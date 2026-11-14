/**
 * Journal structuré : une ligne JSON par événement (niveau, message,
 * contexte, horodatage), lisible par les drains de logs Vercel.
 *
 * Konsent audite la minimisation des données chez les autres : ses propres
 * journaux ne doivent contenir aucune donnée personnelle. Message ET
 * contexte passent donc par `redact()`, qui masque adresses e-mail,
 * adresses IP (v4 et v6), jetons (Bearer, JWT, clés préfixées, longues
 * chaînes hexadécimales ou base64) et toute clé de contexte au nom sensible.
 *
 * Pas encore branché : les `console.error` existants restent en place.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
// Candidat IPv6 : suite de groupes hexadécimaux et de « : ». Validé par
// `isIpv6` (forme complète à 8 groupes, ou forme abrégée avec « :: ») pour
// ne pas masquer une heure « 12:30:45 ».
const IPV6_CANDIDATE = /(?<![\w:.])[0-9a-f]{0,4}(?::[0-9a-f]{0,4}){2,7}(?![\w:])/gi;

function isIpv6(s: string): boolean {
  const colons = s.split(":").length - 1;
  if (!/[0-9a-f]/i.test(s)) return false;
  return s.includes("::") ? colons <= 7 && !s.includes(":::") : colons === 7;
}
const BEARER = /\b(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
// Clés préfixées courantes (Stripe, GitHub, Konsent…) : sk_live_…, ghp_…, kst_…
const PREFIXED_KEY = /\b(?:sk|pk|rk|whsec|ghp|gho|ghs|github_pat|xox[abp]|ks[tk])_[A-Za-z0-9_]{12,}\b/g;
const LONG_HEX = /\b[0-9a-f]{32,}\b/gi;
const LONG_B64 = /\b[A-Za-z0-9+/_-]{40,}={0,2}/g;

/** Clés de contexte dont la valeur est masquée sans examen. */
const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|cookie|api[-_]?key|session|signature|e-?mail|^ip$|ip[-_]?addr|x-forwarded-for/i;

const MAX_DEPTH = 6;
const MAX_STRING = 2_000;

/** Masque les données personnelles et secrets d'une chaîne. */
export function redactString(input: string): string {
  return input
    .slice(0, MAX_STRING)
    .replace(BEARER, "$1 [jeton]")
    .replace(JWT, "[jeton]")
    .replace(PREFIXED_KEY, "[jeton]")
    .replace(EMAIL, "[e-mail]")
    .replace(IPV4, "[ip]")
    .replace(IPV6_CANDIDATE, (m) => (isIpv6(m) ? "[ip]" : m))
    .replace(LONG_HEX, "[jeton]")
    .replace(LONG_B64, "[jeton]");
}

/** Masque récursivement une valeur de contexte (objets, tableaux, erreurs). */
export function redact(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") {
    return typeof value === "bigint" ? value.toString() : value;
  }
  if (depth >= MAX_DEPTH) return "[profondeur]";
  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message) };
  }
  if (value instanceof Date) return value.toISOString();
  if (value instanceof URL) return redactString(`${value.origin}${value.pathname}`);
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY.test(key) ? "[masqué]" : redact(v, depth + 1);
  }
  return out;
}

/** Construit la ligne JSON, sans l'écrire (exposé pour les tests). */
export function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const entry: Record<string, unknown> = {
    t: new Date().toISOString(),
    niveau: level,
    message: redactString(message),
  };
  if (context && Object.keys(context).length > 0) entry.contexte = redact(context);
  try {
    return JSON.stringify(entry);
  } catch {
    // Référence circulaire ou valeur non sérialisable : on garde le message.
    return JSON.stringify({ ...entry, contexte: "[non sérialisable]" });
  }
}

function write(level: LogLevel, message: string, context?: LogContext) {
  const line = formatLog(level, message, context);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV !== "production") write("debug", message, context);
  },
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
