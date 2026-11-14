import { cookies } from "next/headers";
import { SESSION_COOKIE, getAccounts } from "@/lib/accounts";
import { canAccessResource } from "@/lib/agency/tenancy";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { NOTE_MAX, isValidRuleId } from "@/lib/monitoring/action-plan";
import { sameOrigin } from "@/lib/security/origin";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Plan d'action : état déclaré et note d'un constat.
 *
 *   POST /api/surveillance/plan  { domainId, ruleId, status: "open" | "fixed", note }
 *
 * Route INTERNE : session exigée, origine contrôlée, domaine appartenant au
 * compte connecté. Seuls les constats de la DERNIÈRE analyse peuvent être
 * annotés : la table ne se remplit pas d'identifiants inventés.
 */

function refuse(message: string, status: number): Response {
  return Response.json(
    { error: message, disclaimer: DISCLAIMER_SHORT },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

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
  const ruleId = typeof body?.["ruleId"] === "string" ? body["ruleId"].trim() : "";
  const status = body?.["status"] === "fixed" ? "fixed" : body?.["status"] === "open" ? "open" : null;
  const note = typeof body?.["note"] === "string" ? body["note"].replace(/\r\n/g, "\n").trim() : "";

  const domain = /^[0-9a-f-]{36}$/i.test(domainId)
    ? await storage.getDomain(domainId).catch(() => null)
    : null;
  const actor = { id: account.id, plan: account.plan, parentId: account.parentId };
  if (!domain || !canAccessResource(actor, domain)) return refuse("Domaine inconnu.", 404);

  if (!status) return refuse("Statut non reconnu.", 400);
  if (!isValidRuleId(ruleId)) return refuse("Constat inconnu.", 400);
  if ([...note].length > NOTE_MAX) {
    return refuse(`La note dépasse ${NOTE_MAX} caractères.`, 400);
  }

  try {
    const latest = await storage.latestScan(domain.id);
    if (!latest || !(ruleId in (latest.baseline.f ?? {}))) {
      return refuse("Ce constat ne figure pas dans la dernière analyse.", 404);
    }
    const item = await storage.saveActionItem({ domainId: domain.id, ruleId, status, note });
    return Response.json(
      { disclaimer: DISCLAIMER_SHORT, saved: true, item },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[plan]", error);
    return refuse("Enregistrement impossible pour le moment.", 500);
  }
}
