import { siteOrigin } from "@/lib/security/origin";
import { NextResponse } from "next/server";
import { MAGIC_LINK_TTL_MINUTES, getAccounts, normalizeEmail } from "@/lib/accounts";
import { isPlausibleAddress, magicLinkEmail, sendEmail } from "@/lib/email";
import { LOGIN_BINDING_COOKIE, bindingFor } from "@/lib/security/login-binding";
import { RATE_RULES, hit, limitByIp } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Demande d'un lien de connexion.
 *
 * Règle d'or de cette route : la réponse est IDENTIQUE que l'adresse existe ou
 * non, qu'elle soit cliente ou non, que l'envoi ait réussi ou échoué. Une
 * réponse différenciée transformerait ce point d'entrée public en oracle
 * permettant de savoir qui est client de Konsent — ce qui est une donnée que
 * nos clients ne nous ont pas demandé de publier.
 *
 * Le temps de réponse n'est pas égalisé : ce serait un raffinement inutile ici,
 * l'envoi d'e-mail dominant toute autre variation.
 */

const GENERIC = {
  ok: true,
  message:
    "Si cette adresse peut recevoir un lien de connexion, il vient d'être envoyé. Vérifiez votre messagerie.",
};

export async function POST(request: Request) {
  // Limite par IP : un 429 ici ne dit rien de l'adresse demandée.
  const limited = await limitByIp(request, RATE_RULES.loginIp);
  if (limited) return limited;

  const accounts = getAccounts();
  if (!accounts.available) {
    return NextResponse.json({ error: accounts.reason }, { status: 503 });
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  if (!isPlausibleAddress(email)) {
    // Seule exception à la réponse générique : une adresse manifestement
    // malformée. Elle ne révèle rien, et le dire évite à l'utilisateur
    // d'attendre un message qui ne viendra pas.
    return NextResponse.json({ error: "Cette adresse ne semble pas valide." }, { status: 400 });
  }

  // Limite par adresse : au-delà, plus aucun envoi, mais la réponse reste la
  // réponse générique — un 429 ici révélerait qu'on a déjà écrit à l'adresse.
  const perAddress = await hit(RATE_RULES.loginEmail, email);

  let binding: string | null = null;
  if (perAddress.allowed) try {
    const { token } = await accounts.requestMagicLink(email);
    binding = bindingFor(token);
    const origin = siteOrigin();
    const url = `${origin}/api/auth/session?jeton=${encodeURIComponent(token)}`;

    const delivery = await sendEmail({
      ...magicLinkEmail({ url, expiresMinutes: MAGIC_LINK_TTL_MINUTES }),
      to: email,
    });

    if (!delivery.sent) {
      // L'échec est journalisé côté serveur, jamais renvoyé : le dire
      // permettrait de distinguer une adresse acceptée d'une adresse rejetée.
      console.error(`Lien de connexion non délivré : ${delivery.reason ?? "motif inconnu"}.`);
    }
  } catch (error) {
    console.error("Demande de lien de connexion en échec :", error);
  }

  const response = NextResponse.json(GENERIC);
  // Posé dans tous les cas (valeur factice en cas d'échec) pour que la
  // réponse reste indiscernable.
  response.cookies.set(LOGIN_BINDING_COOKIE, binding ?? "x", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: MAGIC_LINK_TTL_MINUTES * 60,
  });
  return response;
}
