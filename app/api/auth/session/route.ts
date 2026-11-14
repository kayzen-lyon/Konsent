import { NextResponse } from "next/server";
import { SESSION_COOKIE, getAccounts } from "@/lib/accounts";
import { siteOrigin } from "@/lib/security/origin";
import { LOGIN_BINDING_COOKIE, bindingMatches } from "@/lib/security/login-binding";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Consommation d'un lien de connexion, puis ouverture de session.
 *
 *   GET    /api/auth/session?jeton=…   → ouvre la session et redirige
 *   DELETE /api/auth/session           → ferme la session
 *
 * Le cookie de session porte les quatre attributs qui comptent, et Konsent
 * relève leur absence chez ses clients (famille STORAGE) : `HttpOnly` pour
 * qu'aucun script ne puisse le lire, `Secure` pour qu'il ne parte pas en
 * clair, `SameSite=Lax` contre la requête inter-sites, et un `Max-Age` borné.
 */

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function GET(request: Request) {
  const accounts = getAccounts();
  const origin = siteOrigin();

  if (!accounts.available) {
    return NextResponse.redirect(`${origin}/connexion?erreur=indisponible`, 303);
  }

  const token = new URL(request.url).searchParams.get("jeton");
  if (!token) {
    return NextResponse.redirect(`${origin}/connexion?erreur=jeton-absent`, 303);
  }

  // Le lien n'est valable que dans le navigateur qui l'a demandé. Contrôlé
  // AVANT la consommation : un lien ouvert ailleurs reste utilisable.
  let bound = false;
  try {
    bound = bindingMatches(token, (await cookies()).get(LOGIN_BINDING_COOKIE)?.value);
  } catch (error) {
    console.error("Liaison du lien de connexion impossible :", error);
  }
  if (!bound) {
    return NextResponse.redirect(`${origin}/connexion?erreur=autre-navigateur`, 303);
  }

  let result: Awaited<ReturnType<typeof accounts.consumeMagicLink>>;
  try {
    result = await accounts.consumeMagicLink(token);
  } catch (error) {
    console.error("Consommation du lien de connexion en échec :", error);
    return NextResponse.redirect(`${origin}/connexion?erreur=technique`, 303);
  }

  if (!result) {
    // Expiré, déjà utilisé, ou inexistant : un seul message. Distinguer les
    // trois cas indiquerait à un tiers qu'un jeton a existé.
    return NextResponse.redirect(`${origin}/connexion?erreur=lien-invalide`, 303);
  }

  const response = NextResponse.redirect(`${origin}/espace`, 303);
  response.cookies.set(SESSION_COOKIE, result.sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
  response.cookies.set(LOGIN_BINDING_COOKIE, "", { path: "/api/auth", maxAge: 0 });
  return response;
}

export async function DELETE(request: Request) {
  const accounts = getAccounts();
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);

  if (accounts.available && token) {
    // La session est supprimée EN BASE, pas seulement dans le navigateur.
    // Effacer le cookie sans révoquer laisserait un jeton valide en circulation.
    await accounts.endSession(token).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
