import { createHmac, randomBytes } from "node:crypto";
import { extractKey } from "../api/keys";
import { dbConfigured, getSql } from "../db";
import { DISCLAIMER_SHORT } from "../disclaimer";

/**
 * Limitation de débit des points d'entrée publics.
 *
 * Fenêtre fixe par (seau, début de fenêtre), comptée en base par un upsert
 * atomique : deux instances Vercel qui reçoivent la même rafale incrémentent
 * la même ligne. Sans base, ou si elle tombe, un compteur en mémoire prend le
 * relais — par instance seulement, donc plus permissif, mais le service reste
 * rendu. Une limitation qui couperait le verdict parce que Postgres hoquette
 * ferait plus de dégâts que l'abus qu'elle prévient.
 *
 * Aucune IP n'est stockée en clair : le seau porte un HMAC de l'adresse, salé
 * par le secret du serveur et par le jour. Deux jours différents donnent deux
 * empreintes sans lien, et les lignes sont purgées après deux jours.
 */

export interface RateRule {
  /** Nom court, préfixe du seau. */
  name: string;
  limit: number;
  windowSeconds: number;
}

/** Les fenêtres divisent toutes 24 h : une fenêtre ne chevauche jamais deux jours. */
export const RATE_RULES = {
  scan: { name: "scan", limit: 20, windowSeconds: 600 },
  evidence: { name: "evidence", limit: 20, windowSeconds: 600 },
  diff: { name: "diff", limit: 20, windowSeconds: 600 },
  remediation: { name: "remediation", limit: 20, windowSeconds: 600 },
  loginIp: { name: "lien-ip", limit: 5, windowSeconds: 900 },
  loginEmail: { name: "lien-email", limit: 3, windowSeconds: 900 },
  contact: { name: "contact", limit: 5, windowSeconds: 3600 },
} as const satisfies Record<string, RateRule>;

export interface RateDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Secondes avant la fenêtre suivante. */
  resetSeconds: number;
  backend: "database" | "memory";
}

/* ----------------------------------------------------------- identification */

let fallbackSalt: string | null = null;

function salt(): string {
  const value = process.env.KONSENT_AUTH_SECRET ?? process.env.DATABASE_URL;
  if (value) return value;
  // Sans secret, un sel aléatoire par processus : l'empreinte reste opaque.
  fallbackSalt ??= randomBytes(32).toString("hex");
  return fallbackSalt;
}

/** Première valeur de `x-forwarded-for`, sinon `x-real-ip`. Fiable derrière Vercel. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  const real = request.headers.get("x-real-ip")?.trim();
  return real || "inconnue";
}

/** HMAC-SHA256 de l'identifiant, salé par le secret et le jour (UTC). */
export function hashIdentifier(value: string, now = Date.now()): string {
  const day = new Date(now).toISOString().slice(0, 10);
  return createHmac("sha256", salt())
    .update(`rate-limit:${day}:${value}`)
    .digest("base64url")
    .slice(0, 32);
}

export function windowStartMs(now: number, windowSeconds: number): number {
  const size = windowSeconds * 1000;
  return Math.floor(now / size) * size;
}

/* ------------------------------------------------------------------ comptage */

const memory = new Map<string, { count: number; expiresAt: number }>();

function memoryHit(bucket: string, start: number, windowSeconds: number, now: number): number {
  if (memory.size > 5000) {
    for (const [key, entry] of memory) if (entry.expiresAt <= now) memory.delete(key);
  }
  const key = `${bucket}|${start}`;
  const entry = memory.get(key);
  if (entry) {
    entry.count += 1;
    return entry.count;
  }
  memory.set(key, { count: 1, expiresAt: start + windowSeconds * 1000 });
  return 1;
}

/** Vide le compteur en mémoire (tests). */
export function resetMemoryLimits(): void {
  memory.clear();
}

async function databaseHit(bucket: string, start: number): Promise<number> {
  const sql = getSql();
  const rows = await sql`
    insert into rate_limits (bucket, window_start, count)
    values (${bucket}, ${new Date(start).toISOString()}, 1)
    on conflict (bucket, window_start)
    do update set count = rate_limits.count + 1
    returning count`;
  return Number(rows[0]?.["count"] ?? 1);
}

/**
 * Compte un appel pour `identifier` (en clair : il est haché ici) et dit s'il
 * passe. `database: false` force le compteur en mémoire.
 */
export async function hit(
  rule: RateRule,
  identifier: string,
  options: { now?: number; database?: boolean } = {},
): Promise<RateDecision> {
  const now = options.now ?? Date.now();
  const start = windowStartMs(now, rule.windowSeconds);
  const bucket = `${rule.name}:${hashIdentifier(identifier, start)}`;
  const resetSeconds = Math.max(1, Math.ceil((start + rule.windowSeconds * 1000 - now) / 1000));

  let count: number;
  let backend: RateDecision["backend"] = "memory";
  if (options.database ?? dbConfigured()) {
    try {
      count = await databaseHit(bucket, start);
      backend = "database";
    } catch (error) {
      console.error("Limitation de débit : base indisponible, repli en mémoire.", error);
      count = memoryHit(bucket, start, rule.windowSeconds, now);
    }
  } else {
    count = memoryHit(bucket, start, rule.windowSeconds, now);
  }

  return {
    allowed: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetSeconds,
    backend,
  };
}

/* ------------------------------------------------------------------- réponse */

export function rateLimitHeaders(decision: RateDecision): Record<string, string> {
  return {
    "RateLimit-Limit": String(decision.limit),
    "RateLimit-Remaining": String(decision.remaining),
    "RateLimit-Reset": String(decision.resetSeconds),
  };
}

export function tooManyRequests(decision: RateDecision): Response {
  const minutes = Math.max(1, Math.ceil(decision.resetSeconds / 60));
  return Response.json(
    {
      error: `Trop de demandes. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`,
      disclaimer: DISCLAIMER_SHORT,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(decision.resetSeconds),
        "Cache-Control": "no-store",
        ...rateLimitHeaders(decision),
      },
    },
  );
}

/** Limite par IP. Renvoie la réponse 429 à rendre, ou `null` si l'appel passe. */
export async function limitByIp(request: Request, rule: RateRule): Promise<Response | null> {
  const decision = await hit(rule, clientIp(request));
  return decision.allowed ? null : tooManyRequests(decision);
}

/**
 * Limite par IP les seuls appels sans clé d'API. À appeler DANS un
 * gestionnaire enrobé par `withApiAuth` : une clé présente y est déjà
 * vérifiée et décomptée de son quota mensuel.
 */
export async function limitAnonymousByIp(
  request: Request,
  rule: RateRule,
): Promise<Response | null> {
  if (extractKey(request)) return null;
  return limitByIp(request, rule);
}
