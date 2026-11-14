import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, getAccounts } from "@/lib/accounts";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { sameOrigin, siteOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Journal d'accès — fermeture des autres sessions.
 *
 *   POST /api/compte/sessions   (formulaire) → ferme toutes les sessions sauf la courante
 *
 * Les sessions sont supprimées EN BASE : un jeton volé cesse de fonctionner
 * immédiatement, sans attendre son expiration.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Origine refusée.", disclaimer: DISCLAIMER_SHORT },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const accounts = getAccounts();
  if (!accounts.available) {
    return NextResponse.redirect(`${siteOrigin()}/connexion?erreur=indisponible`, 303);
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.redirect(`${siteOrigin()}/connexion`, 303);

  const account = await accounts.accountForSession(token).catch(() => null);
  if (!account) return NextResponse.redirect(`${siteOrigin()}/connexion?erreur=lien-invalide`, 303);

  let closed: number;
  try {
    closed = await accounts.endOtherSessions(account.id, token);
  } catch (error) {
    console.error("[compte] fermeture des sessions", error);
    return NextResponse.redirect(`${siteOrigin()}/espace?sessions=erreur#journal`, 303);
  }
  return NextResponse.redirect(`${siteOrigin()}/espace?sessions=${closed}#journal`, 303);
}
