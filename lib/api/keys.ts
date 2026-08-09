import { createHash, randomBytes } from "node:crypto";
import { sameFingerprint } from "../accounts";
import { SCOPES, type Scope } from "./registry";

/**
 * Clés d'API.
 *
 * Deux principes, tous deux non négociables.
 *
 * **Le secret ne survit pas à sa création.** Seule son empreinte SHA-256 est
 * conservée, comme pour les liens de connexion : une base qui fuit ne livre
 * alors aucune clé utilisable. La contrepartie est qu'une clé perdue se
 * révoque et se remplace, elle ne se retrouve pas — c'est le bon compromis,
 * et il se dit à l'utilisateur au moment où la clé s'affiche.
 *
 * **Une clé ne porte que les portées qu'on lui donne.** Une clé d'intégration
 * continue qui n'a besoin que de lancer un scan n'a aucune raison de pouvoir
 * télécharger une archive de preuve ou d'inscrire un domaine à la
 * surveillance.
 */

/**
 * Préfixe visible, conservé en clair.
 *
 * Il ne révèle rien — le secret suit — mais permet de reconnaître une clé
 * dans une liste, et de repérer d'un coup d'œil une clé collée par erreur
 * dans un ticket ou un dépôt public. C'est cette reconnaissance qui rend une
 * fuite détectable.
 */
export const KEY_PREFIX = "kzc_";

export interface ApiKeyRecord {
  id: string;
  orgId: string;
  label: string;
  /** Douze premiers caractères, en clair, pour l'identification visuelle. */
  hint: string;
  fingerprint: string;
  scopes: readonly Scope[];
  /** Appels autorisés par période de 30 jours. */
  monthlyQuota: number;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface GeneratedKey {
  /** Le secret en clair. Affiché une fois, jamais reconstituable. */
  secret: string;
  hint: string;
  fingerprint: string;
}

/**
 * 32 octets d'aléa cryptographique, encodés en base64url.
 *
 * Le format retenu (`kzc_<43 caractères>`) est reconnaissable par les
 * détecteurs de secrets des forges : une clé poussée par mégarde dans un
 * dépôt a une chance d'être signalée avant d'être exploitée.
 */
export function generateKey(): GeneratedKey {
  const secret = `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  return {
    secret,
    hint: secret.slice(0, 12),
    fingerprint: fingerprintKey(secret),
  };
}

export function fingerprintKey(secret: string): string {
  return createHash("sha256").update(secret.trim()).digest("hex");
}

/**
 * Extrait la clé d'une requête.
 *
 * En-tête `Authorization: Bearer …` uniquement. Jamais de paramètre d'URL :
 * une clé en `?key=` se retrouve dans les journaux du serveur, l'historique
 * du navigateur et l'en-tête `Referer` envoyé aux tiers. Konsent reproche
 * précisément cela aux sites qu'il audite.
 */
export function extractKey(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.startsWith(KEY_PREFIX) ? token : null;
}

export function isValidScope(value: string): value is Scope {
  return (SCOPES as readonly string[]).includes(value);
}

/** Une clé révoquée n'authentifie plus rien, quelle que soit sa validité formelle. */
export function isActive(record: ApiKeyRecord, now = new Date()): boolean {
  if (record.revokedAt) return false;
  return new Date(record.createdAt).getTime() <= now.getTime();
}

export function hasScope(record: ApiKeyRecord, scope: Scope | null): boolean {
  // Une route sans portée exigée est ouverte à toute clé active : c'est le
  // cas des points d'entrée que le produit refuse de fermer.
  if (scope === null) return true;
  return record.scopes.includes(scope);
}

/**
 * Vérification du secret présenté contre l'empreinte stockée.
 *
 * Passe par `sameFingerprint`, qui compare à durée constante. Un `===` sur
 * une empreinte fuit sa longueur et son préfixe par le temps de réponse.
 */
export function matches(record: ApiKeyRecord, presented: string): boolean {
  return sameFingerprint(record.fingerprint, fingerprintKey(presented));
}

export type RefusalReason =
  | "NO_KEY"
  | "UNKNOWN_KEY"
  | "REVOKED"
  | "MISSING_SCOPE"
  | "QUOTA_EXCEEDED";

export const REFUSAL_MESSAGES: Record<RefusalReason, string> = {
  NO_KEY: "Aucune clé présentée. Utilisez l'en-tête « Authorization: Bearer kzc_… ».",
  UNKNOWN_KEY: "Clé inconnue ou invalide.",
  REVOKED: "Cette clé a été révoquée.",
  MISSING_SCOPE: "Cette clé ne porte pas la portée requise pour ce point d'entrée.",
  QUOTA_EXCEEDED: "Quota mensuel atteint pour cette clé.",
};
