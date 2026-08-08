import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/billing/stripe";

export const runtime = "nodejs";
// La signature porte sur le corps EXACT reçu. Toute réécriture par le cadre
// applicatif invaliderait la vérification, d'où la lecture en texte brut.
export const dynamic = "force-dynamic";

/**
 * Réception des événements Stripe.
 *
 * Principe : ce point d'entrée est public et non authentifié par nature.
 * Sans vérification de signature, quiconque connaît l'URL peut déclarer un
 * paiement réussi et s'ouvrir un abonnement. La vérification n'est donc pas
 * une option de durcissement, c'est la seule chose qui rend la route
 * acceptable.
 *
 * Absence de secret = refus. Jamais de repli permissif.
 */
export async function POST(request: Request) {
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET absent : événement rejeté.");
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 503 });
  }

  const payload = await request.text();
  const verification = verifyWebhookSignature({
    payload,
    signatureHeader: request.headers.get("stripe-signature"),
    secret,
  });

  if (!verification.ok) {
    console.warn(`Événement Stripe rejeté : ${verification.reason}.`);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  let event: { id?: string; type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return NextResponse.json({ error: "Charge utile illisible." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "invoice.paid":
    case "invoice.payment_failed":
      // L'ouverture effective des droits attend le système de comptes : sans
      // lui, il n'y a rien à créditer. L'événement est acquitté et tracé pour
      // que Stripe cesse de le retenter, et l'état reste consultable dans le
      // tableau de bord Stripe en attendant.
      console.info(`Événement Stripe ${event.type} reçu (${event.id ?? "sans identifiant"}).`);
      break;
    default:
      console.info(`Événement Stripe ignoré : ${event.type ?? "type absent"}.`);
  }

  // Stripe considère toute réponse hors 2xx comme un échec et réessaie.
  return NextResponse.json({ received: true });
}
