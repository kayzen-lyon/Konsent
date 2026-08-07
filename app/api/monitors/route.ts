import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { normalizeTarget, ScanError } from "@/lib/engine/scan";
import { getStorage } from "@/lib/storage";
import { dnsInstructions, fileInstructions, verifyOwnership } from "@/lib/storage/verification";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
export async function POST(request: Request) {
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
      domain = await storage.registerDomain({ hostname, alertEmail: email, frequency });
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
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Inscription impossible.",
        disclaimer: DISCLAIMER_SHORT,
      },
      { status: 500 },
    );
  }
}
