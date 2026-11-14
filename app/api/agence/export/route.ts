import { cookies } from "next/headers";
import { SESSION_COOKIE, getAccounts, type Account } from "@/lib/accounts";
import { CREATION_MESSAGES, isAgency, visibleAccountIds, type Actor } from "@/lib/agency/tenancy";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { toCsv } from "@/lib/monitoring/csv";
import { sameOrigin } from "@/lib/security/origin";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Export CSV du portefeuille d'une agence.
 *
 *   GET /api/agence/export → fichier CSV téléchargé
 *
 * Route INTERNE : session d'agence exigée, pas de clé d'API. La liste des
 * domaines vient de `visibleAccountIds` et de nulle part ailleurs — le même
 * chemin que l'affichage de /agence, pour qu'un export ne puisse jamais
 * contenir plus que ce que l'écran montre.
 */

function refuse(message: string, status: number): Response {
  return Response.json(
    { error: message, disclaimer: DISCLAIMER_SHORT },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

const asActor = (account: Account): Actor => ({
  id: account.id,
  plan: account.plan,
  parentId: account.parentId,
});

export async function GET(request: Request) {
  if (!sameOrigin(request)) return refuse("Origine refusée.", 403);

  const accounts = getAccounts();
  if (!accounts.available) return refuse(accounts.reason, 503);

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return refuse("Session requise.", 401);

  const account = await accounts.accountForSession(token).catch(() => null);
  if (!account) return refuse("Session expirée ou invalide.", 401);

  if (!isAgency(asActor(account))) return refuse(CREATION_MESSAGES.NOT_AN_AGENCY, 403);

  const storage = getStorage();
  if (!storage.available) return refuse(storage.reason, 503);

  let rows: (readonly unknown[])[];
  try {
    const children = await accounts.subAccounts(account.id);
    const visible = visibleAccountIds(asActor(account), children.map(asActor));
    const domains = await storage.domainsForAccounts(visible);
    const owners = new Map<string, string>([
      [account.id, account.email],
      ...children.map((c) => [c.id, c.email] as [string, string]),
    ]);

    const [latest, alertCounts] = await Promise.all([
      Promise.all(domains.map((d) => storage.latestScan(d.id))),
      storage.alertCounts(domains.map((d) => d.id)),
    ]);

    rows = domains.map((d, i) => {
      const scan = latest[i] ?? null;
      return [
        owners.get(d.accountId ?? "") ?? "",
        d.hostname,
        scan ? scan.score : "",
        scan ? scan.grade : "",
        scan ? scan.scannedAt.slice(0, 10) : "",
        scan ? scan.criticalCount : "",
        alertCounts[d.id] ?? 0,
      ];
    });
  } catch (error) {
    console.error("[agence] export", error);
    return refuse("L'export n'a pas pu être constitué. Réessayez dans un instant.", 500);
  }

  const csv = toCsv([
    ["Client", "Domaine", "Dernier score", "Note", "Date", "Écarts critiques", "Alertes"],
    ...rows,
  ]);

  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="konsent-portefeuille-${day}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
