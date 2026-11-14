import { cookies } from "next/headers";
import { SESSION_COOKIE, getAccounts } from "@/lib/accounts";
import { DISCLAIMER_SHORT, EDITOR } from "@/lib/disclaimer";
import { sameOrigin } from "@/lib/security/origin";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Export de mes données — droit à la portabilité (art. 20 RGPD).
 *
 *   GET /api/compte/export → fichier JSON téléchargé
 *
 * Route INTERNE : session exigée, pas de clé d'API. Le contenu est choisi
 * colonne par colonne dans `lib/accounts` et `lib/storage` : aucune
 * empreinte (`token_hash`, empreinte de clé d'API) n'en sort, ni le jeton de
 * vérification de propriété des domaines.
 */

function refuse(message: string, status: number): Response {
  return Response.json(
    { error: message, disclaimer: DISCLAIMER_SHORT },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  if (!sameOrigin(request)) return refuse("Origine refusée.", 403);

  const accounts = getAccounts();
  if (!accounts.available) return refuse(accounts.reason, 503);

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return refuse("Session requise.", 401);

  const account = await accounts.accountForSession(token).catch(() => null);
  if (!account) return refuse("Session expirée ou invalide.", 401);

  const storage = getStorage();
  let data;
  let monitoring;
  try {
    [data, monitoring] = await Promise.all([
      accounts.exportAccountData(account.id),
      storage.available ? storage.exportForAccount(account.id) : null,
    ]);
  } catch (error) {
    console.error("[compte] export", error);
    return refuse("L'export n'a pas pu être constitué. Réessayez dans un instant.", 500);
  }
  if (!data) return refuse("Compte introuvable.", 404);

  const generatedAt = new Date().toISOString();
  const payload = {
    format: "konsent-export/1",
    generatedAt,
    controller: { name: `${EDITOR.legalName} (${EDITOR.tradeName})`, contact: EDITOR.email },
    legalBasis: "Article 20 du RGPD (droit à la portabilité) et article 15 (droit d'accès).",
    notes: [
      "Les empreintes de jetons de session et de clés d'API ne sont pas exportées : ce ne sont pas des données vous concernant, et elles ne permettent rien d'autre que d'authentifier.",
      "Les factures sont détenues par Stripe, notre prestataire de paiement, et se téléchargent depuis vos reçus Stripe.",
      "La table des sessions ne contient ni adresse IP ni agent utilisateur : nous ne les collectons pas.",
    ],
    account: data.account,
    sessions: data.sessions,
    apiKeys: data.apiKeys,
    apiCalls: data.apiCalls,
    subAccounts: data.subAccounts,
    pendingInvitationsSent: data.pendingInvitationsSent,
    monitoring: monitoring ?? { domains: [], history: [], alerts: [] },
  };

  const day = generatedAt.slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="konsent-mes-donnees-${day}.json"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
