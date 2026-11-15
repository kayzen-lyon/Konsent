import { timingSafeEqual } from "node:crypto";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { alertEmail, sendEmail } from "@/lib/email";
import { runVerdictScan } from "@/lib/engine/orchestrate";
import { ScanError } from "@/lib/engine/scan";
import { createBaseline } from "@/lib/monitoring/baseline";
import { alertSummary, diffAgainstBaseline } from "@/lib/monitoring/diff";
import { getStorage, nextRun, type MonitoredDomain, type Storage } from "@/lib/storage";
import { deliverWebhook, type WebhookAlert } from "@/lib/webhooks";
import { dbConfigured } from "@/lib/db";
import { purgeUnconfirmedSubscribers, sendMonthlyDigest } from "@/lib/newsletter";
import { purgeExpiredSharedReports } from "@/lib/report/shared";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Nombre de domaines traités par exécution, pour tenir le budget de temps. */
const BATCH_SIZE = 10;

function authorised(request: Request): boolean {
  const expected = process.env["CRON_SECRET"];
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (provided.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

/**
 * Envoi au webhook du domaine, s'il y en a un. `null` : aucun webhook.
 * Ne lève jamais : un webhook en panne ne coûte pas son tour aux suivants.
 */
async function notifyWebhook(
  storage: Storage,
  domain: MonitoredDomain,
  alert: WebhookAlert,
): Promise<boolean | null> {
  try {
    const hook = await storage.getWebhook(domain.id);
    if (!hook) return null;
    const delivery = await deliverWebhook(hook, alert);
    const status = delivery.sent
      ? `alerte envoyée (${delivery.status})`
      : `échec : ${delivery.reason ?? "motif inconnu"}`;
    if (!delivery.sent) console.error(`Webhook non délivré pour ${domain.hostname} : ${status}.`);
    await storage.recordWebhookAttempt(domain.id, status).catch(() => undefined);
    return delivery.sent;
  } catch (error) {
    console.error(`Webhook non délivré pour ${domain.hostname}.`, error);
    return false;
  }
}

/**
 * Surveillance planifiée.
 *
 *   GET /api/cron/monitor   (appelé par Vercel Cron)
 *
 * Pour chaque domaine échu : nouvelle analyse, comparaison à la dernière
 * référence connue, enregistrement de l'historique, et alerte en cas de
 * régression. La purge de rétention s'exécute à chaque passage — une durée
 * de conservation annoncée mais non appliquée serait un manquement.
 */
export async function GET(request: Request) {
  if (!authorised(request)) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  // Indépendants de la surveillance : lettre mensuelle et purges de
  // rétention (inscriptions non confirmées, liens de partage expirés).
  const newsletter = await sendMonthlyDigest(new Date());
  const purgedUnconfirmedSubscribers = await purgeUnconfirmedSubscribers();
  const purgedSharedReports = dbConfigured()
    ? await purgeExpiredSharedReports().catch(() => 0)
    : 0;
  const extra = { newsletter, purgedUnconfirmedSubscribers, purgedSharedReports };

  const storage = getStorage();
  if (!storage.available) {
    return Response.json(
      { skipped: true, reason: storage.reason, disclaimer: DISCLAIMER_SHORT, ...extra },
      { status: 200 },
    );
  }

  const origin = new URL(request.url).origin;
  const due = await storage.dueDomains(BATCH_SIZE);
  const results: unknown[] = [];

  for (const domain of due) {
    try {
      // Le mode est déjà enregistré avec chaque scan (`engineMode` plus bas) :
      // c'est ce qui permet au différentiel de refuser de conclure quand la
      // veille bascule d'un moteur à l'autre, plutôt que d'envoyer une alerte
      // nominative pour des régressions qui n'ont pas eu lieu.
      const { result: scan } = await runVerdictScan(domain.hostname);
      const baseline = createBaseline(scan);
      const previous = await storage.latestScan(domain.id);

      await storage.recordScan({
        domainId: domain.id,
        scannedAt: scan.scannedAt,
        engineMode: scan.mode,
        rulepackVersion: scan.rulepackVersion,
        score: scan.score,
        grade: scan.grade,
        cappedBy: scan.cappedBy ?? null,
        findingCount: scan.findings.length,
        criticalCount: scan.findings.filter((f) => f.severity === "CRITICAL").length,
        vendorCount: scan.vendors.length,
        outsideEeaCount: scan.outsideEea.length,
        baseline,
      });

      let regressions = 0;
      let delivered = false;
      let webhookDelivered: boolean | null = null;
      if (previous) {
        const diff = diffAgainstBaseline(previous.baseline, scan);
        regressions = diff.regressions;

        if (diff.regressions > 0) {
          const summary = alertSummary(diff) ?? "Régressions détectées.";

          await storage.recordAlert({
            domainId: domain.id,
            kind: "regression",
            regressionCount: diff.regressions,
            summary,
            changes: diff.changes.filter((c) => c.regression),
          });

          // L'alerte était jusqu'ici enregistrée en base et jamais envoyée :
          // le client payait pour être prévenu et ne l'était pas. L'envoi est
          // tenté ici, et son ÉCHEC est journalisé plutôt que tu — une alerte
          // réputée partie mais jamais envoyée donne une fausse assurance,
          // ce qui est pire que pas d'alerte.
          const reportUrl = `${origin}/surveillance?domaine=${encodeURIComponent(domain.hostname)}`;
          const observedAt = new Date().toLocaleDateString("fr-FR");

          // Double opt-in : une adresse non confirmée ne reçoit RIEN. Sans
          // cette garde, inscrire l'adresse d'un tiers suffirait à lui faire
          // recevoir des alertes qu'il n'a jamais demandées.
          if (domain.alertEmailConfirmedAt) {
            const message = alertEmail({ hostname: domain.hostname, summary, observedAt, reportUrl });
            const delivery = await sendEmail({ ...message, to: domain.alertEmail });
            if (!delivery.sent) {
              console.error(
                `Alerte non délivrée pour ${domain.hostname} : ${delivery.reason ?? "motif inconnu"}.`,
              );
            }
            delivered = delivery.sent;
          } else {
            console.error(`Alerte non envoyée pour ${domain.hostname} : adresse d'alerte non confirmée.`);
          }

          // Webhook : tenté indépendamment du courriel, jamais bloquant. Son
          // échec est journalisé et noté sur le webhook, pas propagé.
          webhookDelivered = await notifyWebhook(storage, domain, {
            hostname: domain.hostname,
            summary,
            regressions: diff.regressions,
            observedAt,
            reportUrl,
          });
        }
      }

      await storage.scheduleNext(domain.id, nextRun(domain.frequency));

      results.push({
        hostname: domain.hostname,
        ok: true,
        score: scan.score,
        grade: scan.grade,
        regressions,
        alertDelivered: delivered,
        webhookDelivered,
        firstRun: previous === null,
      });
    } catch (error) {
      // Un domaine injoignable ne doit pas bloquer les suivants, ni faire
      // perdre son tour au domaine : on replanifie quand même.
      await storage.recordAlert({
        domainId: domain.id,
        kind: "scan_failed",
        regressionCount: 0,
        summary:
          error instanceof ScanError
            ? `Analyse impossible : ${error.message}`
            : "Analyse impossible pour une raison inattendue.",
        changes: [],
      });
      await storage.scheduleNext(domain.id, nextRun(domain.frequency));

      results.push({
        hostname: domain.hostname,
        ok: false,
        error: error instanceof ScanError ? error.message : "échec",
      });
    }
  }

  const purged = await storage.purgeExpired().catch(() => 0);

  return Response.json(
    {
      disclaimer: DISCLAIMER_SHORT,
      processed: results.length,
      purgedHistoryRows: purged,
      ...extra,
      results,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
