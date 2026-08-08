import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Client Stripe minimal, sans dépendance.
 *
 * Le dépôt tient sur `next`, `react` et `react-dom`, et le produit fait de
 * l'absence de dépendances inutiles un argument. Trois appels REST ne
 * justifient pas d'embarquer un SDK, sa chaîne de dépendances et sa surface
 * de mise à jour.
 *
 * Le module ne lit JAMAIS la clé ailleurs que dans l'environnement, et ne la
 * renvoie jamais, même tronquée, même dans un message d'erreur.
 */

const API = "https://api.stripe.com/v1";

export function stripeConfigured(): boolean {
  return Boolean(process.env["STRIPE_SECRET_KEY"]);
}

/** Vrai si la clé configurée est une clé de test. Affiché dans l'interface. */
export function stripeTestMode(): boolean {
  return (process.env["STRIPE_SECRET_KEY"] ?? "").startsWith("sk_test_");
}

function secret(): string {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY absente : le paiement doit rester fermé.");
  }
  return key;
}

/**
 * Encodage des paramètres au format attendu par Stripe : les objets et
 * tableaux imbriqués sont aplatis en `a[b][0][c]`.
 */
function encode(params: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [rawKey, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const key = prefix ? `${prefix}[${rawKey}]` : rawKey;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === "object" && item !== null) {
          out.push(...encode(item as Record<string, unknown>, `${key}[${i}]`));
        } else {
          out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof value === "object") {
      out.push(...encode(value as Record<string, unknown>, key));
    } else {
      out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return out;
}

export class StripeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly type?: string,
  ) {
    super(message);
    this.name = "StripeError";
  }
}

async function call<T>(path: string, params: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // L'épinglage de version évite qu'une évolution de l'API modifie une
      // réponse sans que rien n'ait changé chez nous.
      "Stripe-Version": "2025-08-27.basil",
    },
    body: encode(params).join("&"),
  });

  const payload = (await response.json()) as {
    error?: { message?: string; type?: string };
  } & T;

  if (!response.ok) {
    throw new StripeError(
      payload.error?.message ?? `Stripe a répondu ${response.status}.`,
      response.status,
      payload.error?.type,
    );
  }
  return payload;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

export async function createCheckoutSession(input: {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string;
  locale?: string;
}): Promise<CheckoutSession> {
  return call<CheckoutSession>("/checkout/sessions", {
    mode: "subscription",
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.clientReferenceId,
    locale: input.locale ?? "fr",
    // Les identifiants fiscaux sont collectés d'emblée : la clientèle visée
    // est composée d'entreprises, et réclamer un numéro de TVA après coup
    // oblige à réémettre la facture.
    tax_id_collection: { enabled: true },
    billing_address_collection: "required",
    // La facturation est adossée à l'abonnement, pas reconstituée à la main.
    subscription_data: {
      metadata: { source: "konsent-web" },
    },
  });
}

export async function createPortalSession(input: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  return call<{ url: string }>("/billing_portal/sessions", {
    customer: input.customerId,
    return_url: input.returnUrl,
    locale: "fr",
  });
}

/**
 * Vérifie la signature d'un événement Stripe.
 *
 * Sans cette vérification, n'importe qui connaissant l'URL du webhook peut
 * déclarer un paiement réussi. C'est le seul endroit du produit où une erreur
 * de comparaison de chaînes a une conséquence financière directe — d'où la
 * comparaison à temps constant.
 */
export function verifyWebhookSignature(input: {
  payload: string;
  signatureHeader: string | null;
  secret: string;
  toleranceSeconds?: number;
  nowSeconds?: number;
}): { ok: true } | { ok: false; reason: string } {
  const { payload, signatureHeader, secret: whSecret } = input;
  const tolerance = input.toleranceSeconds ?? 300;

  if (!signatureHeader) return { ok: false, reason: "en-tête Stripe-Signature absent" };

  const parts = new Map(
    signatureHeader.split(",").map((part) => {
      const index = part.indexOf("=");
      return [part.slice(0, index).trim(), part.slice(index + 1).trim()] as const;
    }),
  );

  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  if (!timestamp || !signature) {
    return { ok: false, reason: "en-tête Stripe-Signature mal formé" };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "horodatage illisible" };

  // Une signature valide rejouée des heures plus tard reste valide : la borne
  // temporelle est ce qui empêche le rejeu.
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > tolerance) {
    return { ok: false, reason: `horodatage hors tolérance (${Math.abs(now - ts)} s)` };
  }

  const expected = createHmac("sha256", whSecret).update(`${timestamp}.${payload}`).digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "signature invalide" };
  }

  return { ok: true };
}
