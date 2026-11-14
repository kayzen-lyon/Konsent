import { sameOrigin } from "@/lib/security/origin";
import { cookies } from "next/headers";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { SESSION_COOKIE, getAccounts } from "@/lib/accounts";
import { canAddDomain, domainQuotaFor } from "@/lib/agency/tenancy";
import { withApiAuth } from "@/lib/api/auth";
import { normalizeTarget, ScanError } from "@/lib/engine/scan";
import { getStorage } from "@/lib/storage";
import { dnsInstructions, fileInstructions, verifyOwnership } from "@/lib/storage/verification";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Compte de la session en cours, s'il y en a une.
 *
 * Renvoie `null` sans jamais échouer : l'inscription à la surveillance ne
 * dépend pas d'un compte, et une base indisponible ne doit pas empêcher une
 * inscription qui fonctionnait très bien avant les comptes.
 */
async function sessionOwner() {
  const accounts = getAccounts();
  if (!accounts.available) return null;

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const account = await accounts.accountForSession(token).catch(() => null);
  if (!account) return null;

  return {
    actor: { id: account.id, plan: account.plan, parentId: account.parentId },
    email: account.email,
  };
}

/**
 * Inscription à la surveillance planifiée.
 *
 *   POST /api/monitors        { hostname, email, frequency }
 *   POST /api/monitors?verify { hostname, email }
 *
 * L'inscription crée une ligne NON vérifiée : aucune analyse n'est planifiée
 * et aucun historique n'est conservé tant que la propriété du domaine n'a pas
 * été prouvée.
 */
async function handlePOST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ error: "Origine refusée.", disclaimer: DISCLAIMER_SHORT }, { status: 403 });
  }
  const storage = getStorage();
  if (!storage.available) {
    return Response.json(
      { error: storage.reason, disclaimer: DISCLAIMER_SHORT },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json(
      { error: "Corps JSON invalide.", disclaimer: DISCLAIMER_SHORT },
      { status: 400 },
    );
  }

  const rawHost = String(body["hostname"] ?? "");
  const email = String(body["email"] ?? "").trim().toLowerCase();
  const frequency = (String(body["frequency"] ?? "weekly") as "daily" | "weekly" | "monthly");
  const isVerification = new URL(request.url).searchParams.has("verify");

  if (!EMAIL.test(email)) {
    return Response.json(
      { error: "Adresse de courriel invalide.", disclaimer: DISCLAIMER_SHORT },
      { status: 400 },
    );
  }

  let hostname: string;
  try {
    hostname = normalizeTarget(rawHost).hostname;
  } catch (error) {
    return Response.json(
      {
        error: error instanceof ScanError ? error.message : "Domaine invalide.",
        disclaimer: DISCLAIMER_SHORT,
      },
      { status: 400 },
    );
  }

  if (!["daily", "weekly", "monthly"].includes(frequency)) {
    return Response.json(
      { error: "Fréquence non reconnue.", disclaimer: DISCLAIMER_SHORT },
      { status: 400 },
    );
  }

  try {
    let domain = await storage.findDomain(hostname, email);

    // ── Étape 2 : vérification de la propriété ──
    if (isVerification) {
      if (!domain) {
        return Response.json(
          { error: "Aucune inscription trouvée pour ce domaine et cette adresse.", disclaimer: DISCLAIMER_SHORT },
          { status: 404 },
        );
      }
      if (domain.verifiedAt) {
        return Response.json({
          disclaimer: DISCLAIMER_SHORT,
          verified: true,
          alreadyVerified: true,
          hostname: domain.hostname,
        });
      }

      const result = await verifyOwnership(domain.hostname, domain.verificationToken);
      if (result.verified && result.method) {
        await storage.markVerified(domain.id, result.method);
      }

      return Response.json(
        {
          disclaimer: DISCLAIMER_SHORT,
          verified: result.verified,
          method: result.method ?? null,
          detail: result.detail,
        },
        { status: result.verified ? 200 : 409 },
      );
    }

    // ── Étape 1 : inscription ──
    if (!domain) {
      // Une session, si elle existe, fait du domaine une propriété. Sans
      // session, l'inscription reste servie par courriel exactement comme
      // avant — mais le domaine n'appartient à personne et n'apparaît dans
      // aucun portefeuille. C'est volontaire : rattacher un domaine à un
      // compte deviné à partir de l'adresse d'alerte donnerait à quiconque
      // connaît un courriel le moyen de peupler le portefeuille d'autrui.
      const owner = await sessionOwner();
      if (owner) {
        const mine = await storage.domainsForAccounts([owner.actor.id]);
        if (!canAddDomain(owner.actor, mine)) {
          return Response.json(
            {
              error: `Votre offre couvre ${domainQuotaFor(owner.actor)} domaine(s), et ils sont utilisés.`,
              disclaimer: DISCLAIMER_SHORT,
            },
            { status: 409 },
          );
        }
      }

      domain = await storage.registerDomain({
        hostname,
        alertEmail: email,
        frequency,
        accountId: owner?.actor.id ?? null,
      });
    }

    return Response.json(
      {
        disclaimer: DISCLAIMER_SHORT,
        hostname: domain.hostname,
        verified: Boolean(domain.verifiedAt),
        frequency: domain.frequency,
        retentionDays: domain.retentionDays,
        verification: {
          token: domain.verificationToken,
          dns: dnsInstructions(domain.hostname, domain.verificationToken),
          file: fileInstructions(domain.hostname, domain.verificationToken),
        },
        note: "Aucune analyse n'est planifiée et aucun historique n'est conservé tant que la propriété du domaine n'a pas été vérifiée.",
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[monitors] inscription", error);
    return Response.json(
      {
        error: "Inscription impossible pour le moment.",
        disclaimer: DISCLAIMER_SHORT,
      },
      { status: 500 },
    );
  }
}

/**
 * Contrôle, quota et journal.
 *
 * La route reste ouverte sans clé — le verdict sans compte est la promesse
 * produit n°1. Une clé présentée est vérifiée, rattachée à son organisation,
 * décomptée de son quota et journalisée.
 */
export const POST = withApiAuth("monitors:write", handlePOST);
