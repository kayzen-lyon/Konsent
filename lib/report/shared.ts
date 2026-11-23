import { randomBytes } from "node:crypto";
import { getSql, iso } from "../db";
import type { VerdictScan } from "../engine/orchestrate";
import { withoutScreenshots, type ScanResult } from "../engine/types";
import { siteOrigin } from "../security/origin";

/**
 * Lien de rapport public figé.
 *
 * L'audit libre ne conserve rien. Cette exception est OPT-IN : elle n'existe
 * que si la personne clique « Créer un lien de partage ». On conserve alors
 * le seul résultat technique (constats, destinataires, score) pendant
 * 30 jours, sous un jeton aléatoire — ni adresse IP, ni adresse e-mail, ni
 * compte.
 *
 * Le résultat stocké est TOUJOURS produit par notre serveur : la route relance
 * l'analyse et n'accepte jamais un rapport envoyé par le client, sans quoi
 * n'importe qui pourrait publier un faux rapport à l'en-tête Konsent.
 */

export const SHARE_TTL_DAYS = 30;

/** 16 octets aléatoires, en base64url : 22 caractères, 128 bits d'entropie. */
export function generateShareId(): string {
  return randomBytes(16).toString("base64url");
}

export function isShareId(value: string): boolean {
  return /^[A-Za-z0-9_-]{22}$/.test(value);
}

export function shareExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function sharedReportUrl(id: string): string {
  return `${siteOrigin()}/rapport/${id}`;
}

/** Longueur maximale admise pour l'adresse à analyser. */
const URL_MAX = 2048;

/** Lit le corps de `POST /api/rapport/partager`. Seule l'adresse est retenue. */
export function parseShareBody(
  body: unknown,
): { ok: true; url: string } | { ok: false; error: string } {
  const raw =
    body && typeof body === "object" ? (body as Record<string, unknown>)["url"] : undefined;
  const url = typeof raw === "string" ? raw.trim() : "";
  if (!url) return { ok: false, error: "Adresse à analyser manquante." };
  if (url.length > URL_MAX) return { ok: false, error: "Adresse trop longue." };
  return { ok: true, url };
}

export interface SharedReport {
  id: string;
  hostname: string;
  result: ScanResult;
  degraded: VerdictScan["degraded"] | null;
  createdAt: string;
  expiresAt: string;
}

export async function createSharedReport(
  verdict: VerdictScan,
  now: Date = new Date(),
): Promise<{ id: string; expiresAt: string }> {
  const id = generateShareId();
  const expiresAt = shareExpiry(now);
  const sql = getSql();
  await sql`
    insert into shared_reports (id, hostname, result, degraded, created_at, expires_at)
    values (${id}, ${verdict.result.hostname}, ${JSON.stringify(withoutScreenshots(verdict.result))}::jsonb,
            ${verdict.degraded ? JSON.stringify(verdict.degraded) : null}::jsonb,
            ${now.toISOString()}, ${expiresAt.toISOString()})`;
  return { id, expiresAt: expiresAt.toISOString() };
}

/** Rapport encore valide, ou `null` s'il est inconnu ou expiré. */
export async function getSharedReport(id: string): Promise<SharedReport | null> {
  if (!isShareId(id)) return null;
  const sql = getSql();
  const rows = await sql`
    select id, hostname, result, degraded, created_at, expires_at
    from shared_reports
    where id = ${id} and expires_at > now()`;
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row["id"]),
    hostname: String(row["hostname"]),
    result: row["result"] as ScanResult,
    degraded: (row["degraded"] as SharedReport["degraded"]) ?? null,
    createdAt: iso(row["created_at"]),
    expiresAt: iso(row["expires_at"]),
  };
}

/** Supprime les rapports expirés. Renvoie le nombre de lignes effacées. */
export async function purgeExpiredSharedReports(): Promise<number> {
  const sql = getSql();
  const rows = await sql`delete from shared_reports where expires_at < now() returning id`;
  return rows.length;
}
