import { confirmSubscription } from "@/lib/newsletter";
import { siteOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Confirmation d'inscription à la lettre de la veille.
 *
 *   GET /api/veille/confirmer?t=…
 *
 * Lien reçu par e-mail : le jeton est la seule preuve. Il n'est stocké que
 * sous forme d'empreinte et ne sert qu'une fois.
 */
function back(state: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${siteOrigin()}/veille?abonnement=${state}#lettre`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return back("invalide");
  return back((await confirmSubscription(token)) ? "confirme" : "invalide");
}
