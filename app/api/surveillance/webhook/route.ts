import { cookies } from "next/headers";
import { SESSION_COOKIE, getAccounts } from "@/lib/accounts";
import { canAccessResource } from "@/lib/agency/tenancy";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { hit, tooManyRequests } from "@/lib/security/rate-limit";
import { sameOrigin, siteOrigin } from "@/lib/security/origin";
import { getStorage, type WebhookKind } from "@/lib/storage";
import { WEBHOOK_KINDS, deliverWebhook, validateWebhookUrl } from "@/lib/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook d'alerte d'un domaine surveillé.
 *
 *   POST /api/surveillance/webhook
 *     { domainId, action: "save", url, kind }  → enregistre, renvoie le secret UNE fois
 *     { domainId, action: "delete" }           → retire
 *     { domainId, action: "test" }             → envoie un message de test
 *
 * Route INTERNE : session exigée, origine contrôlée, et le domaine doit
 * appartenir au compte connecté (`canAccessResource`, sans enfants : même une
 * agence ne règle pas les webhooks de ses clients à leur place).
 */

function refuse(message: string, status: number): Response {
  return Response.json(
    { error: message, disclaimer: DISCLAIMER_SHORT },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/** Envois de test : de quoi vérifier une configuration, pas de quoi relayer un flot. */
const TEST_RULE = { name: "webhook-test", limit: 5, windowSeconds: 600 };

export async function POST(request: Request) {
  if (!sameOrigin(request)) return refuse("Origine refusée.", 403);

  const accounts = getAccounts();
  if (!accounts.available) return refuse(accounts.reason, 503);

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return refuse("Session requise.", 401);

  const account = await accounts.accountForSession(token).catch(() => null);
  if (!account) return refuse("Session expirée ou invalide.", 401);

  const storage = getStorage();
  if (!storage.available) return refuse(storage.reason, 503);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const domainId = typeof body?.["domainId"] === "string" ? body["domainId"] : "";
  const action = typeof body?.["action"] === "string" ? body["action"] : "";

  // Inconnu et « pas à vous » reçoivent la même réponse : sinon, on
  // énumérerait les domaines d'autrui par essais successifs.
  const domain = /^[0-9a-f-]{36}$/i.test(domainId)
    ? await storage.getDomain(domainId).catch(() => null)
    : null;
  const actor = { id: account.id, plan: account.plan, parentId: account.parentId };
  if (!domain || !canAccessResource(actor, domain)) return refuse("Domaine inconnu.", 404);

  try {
    if (action === "save") {
      const kind = String(body?.["kind"] ?? "") as WebhookKind;
      if (!WEBHOOK_KINDS.includes(kind)) return refuse("Type de webhook non reconnu.", 400);
      const checked = validateWebhookUrl(String(body?.["url"] ?? ""));
      if (!checked.ok) return refuse(checked.reason, 400);

      const { secret } = await storage.setWebhook(domain.id, checked.url, kind);
      return Response.json(
        {
          disclaimer: DISCLAIMER_SHORT,
          saved: true,
          url: checked.url,
          kind,
          secret,
          note: "Conservez ce secret maintenant : il ne sera plus affiché. Il signe chaque envoi (en-tête X-Konsent-Signature: sha256=<HMAC du corps>).",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (action === "delete") {
      await storage.deleteWebhook(domain.id);
      return Response.json(
        { disclaimer: DISCLAIMER_SHORT, deleted: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (action === "test") {
      const hook = await storage.getWebhook(domain.id);
      if (!hook) return refuse("Aucun webhook enregistré pour ce domaine.", 404);

      const decision = await hit(TEST_RULE, account.id);
      if (!decision.allowed) return tooManyRequests(decision);

      const delivery = await deliverWebhook(hook, {
        hostname: domain.hostname,
        summary: "",
        regressions: 0,
        observedAt: new Date().toISOString(),
        reportUrl: `${siteOrigin()}/espace#plan-action`,
        test: true,
      });
      const status = delivery.sent ? `test réussi (${delivery.status})` : `test échoué : ${delivery.reason}`;
      await storage.recordWebhookAttempt(domain.id, status).catch(() => undefined);
      if (!delivery.sent) console.error(`[webhook] test ${domain.hostname} : ${delivery.reason}`);

      return Response.json(
        { disclaimer: DISCLAIMER_SHORT, sent: delivery.sent, detail: status },
        { status: delivery.sent ? 200 : 502, headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch (error) {
    console.error("[webhook]", error);
    return refuse("Opération impossible pour le moment.", 500);
  }

  return refuse("Action non reconnue.", 400);
}
