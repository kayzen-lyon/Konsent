import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, getAccounts, normalizeEmail } from "@/lib/accounts";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { sameOrigin, siteOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Suppression du compte — droit à l'effacement (art. 17 RGPD).
 *
 *   POST /api/compte/supprimer   (formulaire, champ `email`)
 *
 * Trois verrous, dans cet ordre : même origine (une page tierce ne peut pas
 * déclencher l'effacement), session valide, et confirmation explicite — le
 * titulaire retape son adresse e-mail. La suppression elle-même vit dans
 * `lib/accounts` (deleteAccount) : sous-comptes DÉTACHÉS d'abord, jamais
 * supprimés ; le reste suit les cascades du schéma.
 *
 * Réponse : redirection 303, la session est fermée et le cookie effacé.
 */

function back(reason: string): NextResponse {
  return NextResponse.redirect(`${siteOrigin()}/espace?suppression=${reason}#suppression`, 303);
}

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

  const form = await request.formData().catch(() => null);
  const typed = form?.get("email");
  const confirmation = typeof typed === "string" ? normalizeEmail(typed) : "";
  if (!confirmation || confirmation !== normalizeEmail(account.email)) {
    return back("adresse");
  }

  let result: Awaited<ReturnType<typeof accounts.deleteAccount>>;
  try {
    result = await accounts.deleteAccount(account.id);
  } catch (error) {
    console.error("[compte] suppression", error);
    return back("technique");
  }

  if (!result.deleted) {
    return back(result.reason === "active_subscription" ? "abonnement" : "technique");
  }

  // Les sessions ont disparu avec le compte (cascade) ; le cookie est effacé
  // pour que le navigateur ne présente plus un jeton désormais inerte.
  const response = NextResponse.redirect(`${siteOrigin()}/compte-supprime`, 303);
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
