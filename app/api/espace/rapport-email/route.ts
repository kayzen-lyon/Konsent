import { cookies } from "next/headers";
import { SESSION_COOKIE, getAccounts } from "@/lib/accounts";
import { canAccessResource } from "@/lib/agency/tenancy";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { emailConfigured, reportEmail, sendEmail } from "@/lib/email";
import { runVerdictScan } from "@/lib/engine/orchestrate";
import { rankFindings } from "@/lib/report/priorities";
import { SEVERITY_LABELS, SEVERITY_ORDER, getRule, type Rule } from "@/lib/rulepack";
import { sameOrigin, siteOrigin } from "@/lib/security/origin";
import { RATE_RULES, hit, tooManyRequests } from "@/lib/security/rate-limit";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Envoi du résumé d'analyse d'un domaine surveillé, depuis l'espace client.
 *
 *   POST /api/espace/rapport-email  { domaine: <identifiant du domaine> }
 *
 * Route INTERNE : session exigée, origine contrôlée, domaine appartenant au
 * compte. Le message part à l'adresse DU COMPTE, jamais à une adresse
 * saisie — sinon la route servirait de relais pour écrire à n'importe qui.
 */

function refuse(message: string, status: number): Response {
  return Response.json(
    { error: message, disclaimer: DISCLAIMER_SHORT },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return refuse("Origine refusée.", 403);
  if (!emailConfigured()) {
    return refuse("L'envoi d'e-mails n'est pas encore activé sur cette instance.", 503);
  }

  const accounts = getAccounts();
  if (!accounts.available) return refuse(accounts.reason, 503);

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return refuse("Session requise.", 401);

  const account = await accounts.accountForSession(token).catch(() => null);
  if (!account) return refuse("Session expirée ou invalide.", 401);

  const storage = getStorage();
  if (!storage.available) return refuse(storage.reason, 503);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const domainId = typeof body?.["domaine"] === "string" ? body["domaine"] : "";
  const domain = /^[0-9a-f-]{36}$/i.test(domainId)
    ? await storage.getDomain(domainId).catch(() => null)
    : null;
  const actor = { id: account.id, plan: account.plan, parentId: account.parentId };
  if (!domain || !canAccessResource(actor, domain)) return refuse("Domaine inconnu.", 404);

  const decision = await hit(RATE_RULES.reportEmail, account.id);
  if (!decision.allowed) return tooManyRequests(decision);

  try {
    let summary: {
      score: number;
      grade: string;
      scannedAt: string;
      fresh: boolean;
      priorities: { title: string; severityLabel: string }[];
    };

    const latest = await storage.latestScan(domain.id);
    if (latest) {
      // L'historique ne garde que les identifiants de règles : l'ordre est
      // celui de `rankFindings` (gravité, puis poids), appliqué aux règles.
      const rules = Object.keys(latest.baseline.f ?? {})
        .map((id) => getRule(id))
        .filter((r): r is Rule => Boolean(r))
        .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.weight - a.weight);
      summary = {
        score: latest.score,
        grade: latest.grade,
        scannedAt: latest.scannedAt,
        fresh: false,
        priorities: rules.slice(0, 3).map((r) => ({ title: r.title, severityLabel: SEVERITY_LABELS[r.severity] })),
      };
    } else {
      const { result } = await runVerdictScan(domain.hostname);
      summary = {
        score: result.score,
        grade: result.grade,
        scannedAt: result.scannedAt,
        fresh: true,
        priorities: rankFindings(result.findings)
          .slice(0, 3)
          .map(({ finding, rule }) => ({ title: rule.title, severityLabel: SEVERITY_LABELS[finding.severity] })),
      };
    }

    const target = encodeURIComponent(domain.hostname);
    const message = reportEmail({
      hostname: domain.hostname,
      ...summary,
      scannedAt: new Date(summary.scannedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }),
      scanUrl: `${siteOrigin()}/scan?url=${target}`,
      synthesisUrl: `${siteOrigin()}/scan/synthese?url=${target}`,
    });
    const sent = await sendEmail({ ...message, to: account.email });
    if (!sent.sent) {
      console.error(`[rapport-email] non envoyé : ${sent.reason ?? "motif inconnu"}.`);
      return refuse("Le message n'a pas pu être envoyé. Réessayez plus tard.", 502);
    }
    return Response.json(
      { disclaimer: DISCLAIMER_SHORT, sent: true, to: account.email },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[rapport-email]", error);
    return refuse("Le résumé n'a pas pu être préparé pour le moment.", 500);
  }
}
