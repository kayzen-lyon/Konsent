import { cookies } from "next/headers";
import { SESSION_COOKIE, getAccounts, type Account } from "@/lib/accounts";
import { canAttach, isAgency, type Actor } from "@/lib/agency/tenancy";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { sameOrigin } from "@/lib/security/origin";

export const dynamic = "force-dynamic";

/**
 * Réponse du TITULAIRE d'un compte à l'invitation d'une agence.
 *
 *   POST /api/agence/invitation   corps { accept: boolean }
 *
 * C'est la seule voie qui écrit `parent_id` : le rattachement exige la
 * session du compte rattaché, jamais celle de l'agence.
 */
function reply(body: Record<string, unknown>, status: number): Response {
  return Response.json(
    { disclaimer: DISCLAIMER_SHORT, ...body },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

const asActor = (a: Account): Actor => ({ id: a.id, plan: a.plan, parentId: a.parentId });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Origine refusée." }, 403);

  const accounts = getAccounts();
  if (!accounts.available) return reply({ error: accounts.reason }, 503);

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return reply({ error: "Session requise." }, 401);
  const account = await accounts.accountForSession(token).catch(() => null);
  if (!account) return reply({ error: "Session expirée ou invalide." }, 401);

  const body = (await request.json().catch(() => null)) as { accept?: unknown } | null;
  const parentId = account.invitedParentId;
  if (!parentId) return reply({ error: "Aucune invitation en attente." }, 404);

  if (body?.accept !== true) {
    await accounts.declineInvitation(account.id);
    return reply({ declined: true }, 200);
  }

  try {
    const parent = await accounts.accountById(parentId);
    const siblings = parent ? await accounts.subAccounts(parent.id) : [];
    const verdict =
      parent && isAgency(asActor(parent))
        ? canAttach(asActor(parent), asActor(account), siblings.map(asActor))
        : { allowed: false as const };
    if (!verdict.allowed) {
      await accounts.declineInvitation(account.id);
      return reply({ error: "Cette invitation n'est plus valable." }, 409);
    }
    const ok = await accounts.acceptInvitation(account.id, parentId);
    if (!ok) return reply({ error: "Cette invitation n'est plus valable." }, 409);
    return reply({ accepted: true }, 200);
  } catch (error) {
    console.error("[invitation]", error);
    return reply({ error: "Le rattachement n'a pas abouti." }, 409);
  }
}
