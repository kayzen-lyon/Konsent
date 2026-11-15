import { HONEYPOT_FIELD } from "@/lib/contact/fields";
import { isPlausibleAddress } from "@/lib/email";
import { newsletterAvailable, subscribe } from "@/lib/newsletter";
import { sameOrigin } from "@/lib/security/origin";
import { RATE_RULES, hit, limitByIp, tooManyRequests } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inscription à la lettre mensuelle de la veille (double opt-in).
 *
 *   POST /api/veille/abonnement  { email, consentement, <pot de miel> }
 *
 * Route INTERNE. La réponse est la même que l'adresse soit nouvelle, en
 * attente ou déjà confirmée : elle ne permet pas de savoir qui est abonné.
 */

const OK_MESSAGE =
  "Si cette adresse peut recevoir la lettre, un lien de confirmation vient d'y être envoyé. Rien ne vous sera adressé sans cette confirmation.";

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Origine refusée." }, 403);

  if (!newsletterAvailable()) {
    return json(
      { error: "La lettre ouvrira dès que l'envoi d'e-mails sera activé. Aucune adresse n'est collectée d'ici là." },
      503,
    );
  }

  const limited = await limitByIp(request, RATE_RULES.newsletterIp);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ error: "Requête invalide." }, 400);

  // Pot de miel : réponse identique à un succès, sans effet.
  const honeypot = typeof body[HONEYPOT_FIELD] === "string" ? body[HONEYPOT_FIELD].trim() : "";
  if (honeypot) return json({ ok: true, message: OK_MESSAGE });

  const email = String(body["email"] ?? "").trim().toLowerCase().slice(0, 254);
  if (!isPlausibleAddress(email)) {
    return json({ error: "Cette adresse électronique n'est pas valide." }, 400);
  }
  const consent = body["consentement"];
  if (consent !== true && consent !== "on" && consent !== "true") {
    return json({ error: "Cochez la case de consentement pour vous inscrire." }, 400);
  }

  // Une même adresse ne reçoit pas plus de trois liens par jour, quelle que
  // soit l'IP d'où viennent les demandes.
  const perEmail = await hit(RATE_RULES.newsletterEmail, email);
  if (!perEmail.allowed) return tooManyRequests(perEmail);

  await subscribe(email);
  return json({ ok: true, message: OK_MESSAGE });
}
