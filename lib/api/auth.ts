import { DISCLAIMER_SHORT } from "../disclaimer";
import {
  REFUSAL_MESSAGES,
  extractKey,
  fingerprintKey,
  hasScope,
  isActive,
  matches,
  type ApiKeyRecord,
  type RefusalReason,
} from "./keys";
import type { Scope } from "./registry";
import { getApiKeyStore, type ApiKeyStore, type UsageWindow } from "./store";

/**
 * Authentification d'un appel d'API.
 *
 * Le comportement tient en une phrase : **une clé présentée est vérifiée, une
 * clé absente ne ferme rien.** Les routes publiques le restent — le verdict
 * sans compte ni e-mail est la promesse produit n°1 — mais quiconque présente
 * une clé la voit contrôlée, rattachée à son organisation, décomptée de son
 * quota et journalisée.
 *
 * Une clé fausse, révoquée, hors portée ou hors quota est REFUSÉE, même sur
 * une route ouverte. Laisser passer un appel dont la clé vient d'être
 * révoquée au motif que la route est publique viderait la révocation de son
 * sens, et le journal enregistrerait un succès là où il y a eu un rejet.
 */

export interface AuthAnonymous {
  kind: "anonymous";
}

export interface AuthAccepted {
  kind: "accepted";
  key: ApiKeyRecord;
  usage: UsageWindow;
}

export interface AuthRefused {
  kind: "refused";
  reason: RefusalReason;
  message: string;
  status: 401 | 403 | 429;
}

export type AuthResult = AuthAnonymous | AuthAccepted | AuthRefused;

const STATUS: Record<RefusalReason, 401 | 403 | 429> = {
  NO_KEY: 401,
  UNKNOWN_KEY: 401,
  REVOKED: 401,
  MISSING_SCOPE: 403,
  QUOTA_EXCEEDED: 429,
};

function refuse(reason: RefusalReason): AuthRefused {
  return {
    kind: "refused",
    reason,
    message: REFUSAL_MESSAGES[reason],
    status: STATUS[reason],
  };
}

/**
 * Contrôle une requête pour un point d'entrée donné.
 *
 * `store` est injectable pour que la logique soit éprouvée sans base à chaque
 * `npm run check` — la sécurité qu'on ne teste qu'en production n'est pas
 * testée.
 */
export async function authenticate(
  request: Request,
  scope: Scope | null,
  store: ApiKeyStore | { available: false } = getApiKeyStore(),
): Promise<AuthResult> {
  const presented = extractKey(request);
  if (!presented) return { kind: "anonymous" };

  // Une clé est présentée mais l'instance n'en connaît aucune. Refuser
  // franchement plutôt que d'ignorer : l'appelant croit être authentifié, et
  // découvrirait le contraire au premier dépassement de quota supposé.
  if (!store.available) return refuse("UNKNOWN_KEY");

  const record = await store.findByFingerprint(fingerprintKey(presented));
  if (!record || !matches(record, presented)) return refuse("UNKNOWN_KEY");
  if (!isActive(record)) return refuse("REVOKED");
  if (!hasScope(record, scope)) return refuse("MISSING_SCOPE");

  const usage = await store.usage(record);
  if (usage.remaining <= 0) return refuse("QUOTA_EXCEEDED");

  return { kind: "accepted", key: record, usage };
}

/**
 * Journalise l'appel. Sans clé et sans base, il n'y a rien à écrire — l'audit
 * libre ne laisse aucune trace, conformément à la politique de
 * confidentialité.
 */
export async function journal(
  request: Request,
  auth: AuthResult,
  status: number,
  store: ApiKeyStore | { available: false } = getApiKeyStore(),
): Promise<void> {
  if (auth.kind === "anonymous" || !store.available) return;

  const at = new Date().toISOString();
  const path = new URL(request.url).pathname;

  await store.record({
    keyId: auth.kind === "accepted" ? auth.key.id : null,
    orgId: auth.kind === "accepted" ? auth.key.orgId : null,
    path,
    method: request.method,
    status,
    refusal: auth.kind === "refused" ? auth.reason : null,
    at,
  });

  if (auth.kind === "accepted") await store.touch(auth.key.id, at);
}

/**
 * En-têtes de quota, à joindre à toute réponse authentifiée.
 *
 * Un intégrateur doit pouvoir anticiper le mur plutôt que le découvrir en
 * 429 un vendredi soir.
 */
export function quotaHeaders(auth: AuthResult): Record<string, string> {
  if (auth.kind !== "accepted") return {};
  return {
    "X-Konsent-Quota-Limit": String(auth.usage.quota),
    "X-Konsent-Quota-Remaining": String(Math.max(0, auth.usage.remaining - 1)),
  };
}

/**
 * Enrobe un gestionnaire de route : contrôle, quota, journal, en-têtes.
 *
 * Le passer par un enrobage plutôt que par des appels dispersés dans chaque
 * route est délibéré. Un contrôle recopié onze fois finit par diverger, et la
 * route où le journal manque est précisément celle qu'on ne pense pas à
 * vérifier. `scripts/test-api.mjs` exige que toute route publique soit
 * enrobée.
 */
export function withApiAuth<T extends unknown[]>(
  scope: Scope | null,
  handler: (request: Request, ...rest: T) => Promise<Response>,
): (request: Request, ...rest: T) => Promise<Response> {
  return async (request, ...rest) => {
    const store = getApiKeyStore();
    const auth = await authenticate(request, scope, store);

    if (auth.kind === "refused") {
      await journal(request, auth, auth.status, store);
      return Response.json(
        { error: auth.message, code: auth.reason, disclaimer: DISCLAIMER_SHORT },
        { status: auth.status, headers: { "Cache-Control": "no-store" } },
      );
    }

    const response = await handler(request, ...rest);

    // Journal après coup : on enregistre le statut réellement rendu, pas
    // celui qu'on espérait rendre.
    await journal(request, auth, response.status, store);
    for (const [key, value] of Object.entries(quotaHeaders(auth))) {
      response.headers.set(key, value);
    }
    return response;
  };
}
