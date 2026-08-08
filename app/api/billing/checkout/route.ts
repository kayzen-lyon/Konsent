import { NextResponse } from "next/server";
import { getPlan } from "@/lib/billing/plans";
import { readiness } from "@/lib/billing/readiness";
import { createCheckoutSession, stripeConfigured } from "@/lib/billing/stripe";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";

export const runtime = "nodejs";

/**
 * Ouverture d'une session de paiement.
 *
 * Trois refus, dans cet ordre, avant toute prise d'argent :
 *  1. Stripe n'est pas configuré.
 *  2. L'offre promet une fonctionnalité qui n'existe pas.
 *  3. Aucun identifiant de tarif n'est associé à l'offre.
 *
 * Le deuxième est le seul qui ne se corrige pas par une variable
 * d'environnement, et c'est le plus important : il empêche de vendre ce qu'on
 * ne livre pas.
 */
export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        error: "Le paiement en ligne n'est pas activé sur cette instance.",
        disclaimer: DISCLAIMER_SHORT,
      },
      { status: 503 },
    );
  }

  let body: { plan?: string };
  try {
    body = (await request.json()) as { plan?: string };
  } catch {
    return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
  }

  const plan = body.plan ? getPlan(body.plan) : undefined;
  if (!plan || plan.amountCents === null) {
    return NextResponse.json({ error: "Offre inconnue." }, { status: 400 });
  }

  const state = readiness(plan);
  if (!state.sellable) {
    // Le détail des manques n'est pas renvoyé au client : il décrit l'état
    // interne du produit. Le refus, lui, est explicite.
    return NextResponse.json(
      {
        error:
          "Cette offre n'est pas ouverte à la souscription en ligne. Écrivez-nous : contact@kayzen-lyon.fr",
        reason: "promesses non tenues",
      },
      { status: 409 },
    );
  }

  const priceId = plan.priceEnvVar ? process.env[plan.priceEnvVar] : undefined;
  if (!priceId) {
    return NextResponse.json(
      { error: "Aucun tarif n'est configuré pour cette offre." },
      { status: 503 },
    );
  }

  const origin = new URL(request.url).origin;

  try {
    const session = await createCheckoutSession({
      priceId,
      successUrl: `${origin}/abonnement/confirmation?session={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/tarifs`,
      clientReferenceId: `plan:${plan.id}`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Le message de Stripe peut contenir des détails de compte : on journalise
    // côté serveur et on ne renvoie qu'un message générique.
    console.error("Ouverture de session de paiement refusée :", error);
    return NextResponse.json(
      { error: "Le paiement n'a pas pu être initié. Réessayez ou écrivez-nous." },
      { status: 502 },
    );
  }
}
