import { cookies } from "next/headers";
import { SESSION_COOKIE, getAccounts, normalizeEmail, type Account } from "@/lib/accounts";
import {
  CREATION_MESSAGES,
  SUB_ACCOUNT_QUOTA,
  canCreateSubAccount,
  canDetach,
  isAgency,
  type Actor,
} from "@/lib/agency/tenancy";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { isPlausibleAddress } from "@/lib/email";
import { sameOrigin } from "@/lib/security/origin";

export const dynamic = "force-dynamic";

/**
 * Sous-comptes clients d'une agence.
 *
 *   GET    /api/agence/sous-comptes   → la liste
 *   POST   /api/agence/sous-comptes   → inviter un client, corps { email }
 *   DELETE /api/agence/sous-comptes   → détacher, corps { id }
 *
 * Route INTERNE : elle exige une session, pas une clé d'API. Elle n'est donc
 * pas décrite dans l'OpenAPI publique — décrire la gestion des comptes d'une
 * agence revient à en dessiner la surface d'attaque.
 *
 * Aucune décision d'accès n'est prise dans ce fichier : tout passe par
 * `lib/agency/tenancy.ts`, seul endroit éprouvé pour cela. Une règle
 * d'autorisation recopiée dans une route finit par diverger de son modèle, et
 * c'est la copie oubliée qui laisse fuir.
 */

function refuse(message: string, status: number): Response {
  return Response.json(
    { error: message, disclaimer: DISCLAIMER_SHORT },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

const asActor = (account: Account): Actor => ({
  id: account.id,
  plan: account.plan,
  parentId: account.parentId,
});

/** Vue publique d'un sous-compte : rien de plus que ce que l'agence doit voir. */
const publicView = (account: Account) => ({
  id: account.id,
  email: account.email,
  createdAt: account.createdAt,
});

async function currentAgency(): Promise<
  { ok: true; account: Account; children: readonly Account[] } | { ok: false; response: Response }
> {
  const accounts = getAccounts();
  if (!accounts.available) {
    return { ok: false, response: refuse(accounts.reason, 503) };
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { ok: false, response: refuse("Session requise.", 401) };

  const account = await accounts.accountForSession(token).catch(() => null);
  if (!account) return { ok: false, response: refuse("Session expirée ou invalide.", 401) };

  // Le contrôle est fait ici une fois pour les trois méthodes. Un sous-compte
  // qui porterait le plan « agence » est rejeté par `isAgency`, qui exige
  // aussi l'absence de parent.
  if (!isAgency(asActor(account))) {
    return { ok: false, response: refuse(CREATION_MESSAGES.NOT_AN_AGENCY, 403) };
  }

  const children = await accounts.subAccounts(account.id);
  return { ok: true, account, children };
}

export async function GET() {
  const ctx = await currentAgency();
  if (!ctx.ok) return ctx.response;

  return Response.json(
    {
      disclaimer: DISCLAIMER_SHORT,
      quota: SUB_ACCOUNT_QUOTA[ctx.account.plan],
      used: ctx.children.length,
      subAccounts: ctx.children.map(publicView),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return refuse("Origine refusée.", 403);
  const ctx = await currentAgency();
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!isPlausibleAddress(email)) {
    return refuse("Adresse électronique invalide.", 400);
  }

  const verdict = canCreateSubAccount(asActor(ctx.account), ctx.children.map(asActor));
  if (!verdict.allowed) {
    return refuse(verdict.message ?? "Création refusée.", verdict.refusal === "QUOTA_REACHED" ? 409 : 403);
  }

  // Rattacher un compte à soi-même, ou capter le client d'une autre agence,
  // est refusé par le modèle avant d'atteindre la base — qui pose de toute
  // façon ses propres verrous.
  if (email === normalizeEmail(ctx.account.email)) {
    return refuse(CREATION_MESSAGES.SELF_PARENT, 400);
  }

  const accounts = getAccounts();
  if (!accounts.available) return refuse(accounts.reason, 503);

  // Une INVITATION, jamais un rattachement : le titulaire du compte doit
  // l'accepter depuis son espace. La réponse est identique que l'adresse
  // soit inconnue, déjà cliente ou refusée — la distinguer renseignerait
  // sur la clientèle des autres agences.
  try {
    await accounts.inviteSubAccount(ctx.account.id, email);
  } catch (error) {
    console.error("[sous-comptes] invitation", error);
  }
  return Response.json(
    {
      disclaimer: DISCLAIMER_SHORT,
      invited: true,
      message:
        "Invitation enregistrée. Le rattachement prendra effet lorsque le titulaire de cette adresse l'aura acceptée depuis son espace Konsent.",
    },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return refuse("Origine refusée.", 403);
  const ctx = await currentAgency();
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";

  const child = ctx.children.find((c) => c.id === id);
  // Un identifiant absent de NOS enfants et un identifiant inexistant reçoivent
  // la même réponse : distinguer les deux permettrait d'énumérer les comptes
  // d'autrui par essais successifs.
  if (!child || !canDetach(asActor(ctx.account), asActor(child))) {
    return refuse("Sous-compte inconnu.", 404);
  }

  const accounts = getAccounts();
  if (!accounts.available) return refuse(accounts.reason, 503);

  await accounts.detachSubAccount(child.id);
  return Response.json(
    { disclaimer: DISCLAIMER_SHORT, detached: child.id },
    { headers: { "Cache-Control": "no-store" } },
  );
}
