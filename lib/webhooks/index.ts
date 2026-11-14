import { createHmac } from "node:crypto";
import { BlockedTargetError, isBlockedHostname, safeFetch } from "../security/network";
import type { WebhookKind } from "../storage";

/**
 * Alertes de surveillance par webhook (Slack, Microsoft Teams, générique).
 *
 * Un webhook est une URL saisie par un client et jointe par NOTRE serveur :
 * c'est exactement la forme d'une SSRF. Trois verrous :
 *  1. à l'enregistrement, `https` seul, sans identifiants, sans nom ni
 *     littéral IP privés (`validateWebhookUrl`) ;
 *  2. à l'envoi, `safeFetch` et rien d'autre : chaque adresse résolue et
 *     chaque redirection est contrôlée au moment de la connexion, ce qui
 *     ferme aussi la porte au « DNS rebinding » entre l'enregistrement et
 *     l'envoi ;
 *  3. un délai de 5 s, et aucun corps de réponse lu au-delà du statut.
 *
 * Un envoi qui échoue ne lève jamais : il renvoie un motif, que l'appelant
 * journalise. Le cron traite plusieurs domaines, un webhook en panne ne doit
 * pas faire tomber la surveillance des autres.
 */

export const WEBHOOK_TIMEOUT_MS = 5_000;
export const WEBHOOK_URL_MAX = 2_048;

export const WEBHOOK_KINDS: readonly WebhookKind[] = ["slack", "teams", "generic"];

export const WEBHOOK_KIND_LABELS: Record<WebhookKind, string> = {
  slack: "Slack",
  teams: "Microsoft Teams",
  generic: "Générique (JSON signé)",
};

export type WebhookValidation = { ok: true; url: string } | { ok: false; reason: string };

/** Contrôle d'une URL de webhook avant enregistrement. */
export function validateWebhookUrl(raw: string): WebhookValidation {
  const value = raw.trim();
  if (!value) return { ok: false, reason: "Adresse du webhook manquante." };
  if (value.length > WEBHOOK_URL_MAX) return { ok: false, reason: "Adresse trop longue." };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: "Adresse de webhook invalide." };
  }
  if (url.protocol !== "https:") {
    return { ok: false, reason: "Seules les adresses https:// sont acceptées." };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "L'adresse ne doit pas contenir d'identifiants." };
  }
  if (isBlockedHostname(url.hostname)) {
    return { ok: false, reason: "Seules les adresses publiques peuvent recevoir un webhook." };
  }
  url.hash = "";
  return { ok: true, url: url.toString() };
}

export interface WebhookAlert {
  hostname: string;
  summary: string;
  regressions: number;
  observedAt: string;
  reportUrl: string;
  /** Vrai pour le bouton « Envoyer un test » : le destinataire doit pouvoir l'ignorer. */
  test?: boolean;
}

/** Échappement du « mrkdwn » de Slack : seuls &, < et > sont significatifs. */
function slackEscape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function headline(alert: WebhookAlert): string {
  return alert.test
    ? `Test Konsent — ${alert.hostname}`
    : `${alert.hostname} — un écart est apparu depuis la dernière analyse`;
}

const CAVEAT =
  "Analyse technique automatisée : elle constate un écart, elle ne qualifie pas une infraction.";

/** Corps adapté à la destination. Exporté pour les tests. */
export function buildWebhookBody(kind: WebhookKind, alert: WebhookAlert): Record<string, unknown> {
  const title = headline(alert);
  const summary = alert.test
    ? "Message de test : votre webhook d'alerte Konsent est correctement configuré."
    : alert.summary;

  if (kind === "slack") {
    const text = `${title}\n${summary}`;
    return {
      text: slackEscape(text),
      blocks: [
        { type: "header", text: { type: "plain_text", text: title.slice(0, 150) } },
        { type: "section", text: { type: "mrkdwn", text: slackEscape(summary).slice(0, 2900) } },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `<${alert.reportUrl}|Ouvrir le suivi de ${slackEscape(alert.hostname)}>`,
          },
        },
        { type: "context", elements: [{ type: "mrkdwn", text: slackEscape(CAVEAT) }] },
      ],
    };
  }

  if (kind === "teams") {
    // MessageCard : format reconnu par les connecteurs entrants de Teams
    // comme par les flux Power Automate « webhook ».
    return {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      summary: title,
      themeColor: alert.test ? "1F3B61" : "B7481F",
      title,
      text: summary,
      sections: [{ text: CAVEAT }],
      potentialAction: [
        {
          "@type": "OpenUri",
          name: "Ouvrir le suivi",
          targets: [{ os: "default", uri: alert.reportUrl }],
        },
      ],
    };
  }

  return {
    event: alert.test ? "konsent.test" : "konsent.alert",
    hostname: alert.hostname,
    summary,
    regressions: alert.regressions,
    observedAt: alert.observedAt,
    reportUrl: alert.reportUrl,
    sentAt: new Date().toISOString(),
    notice: CAVEAT,
  };
}

/** `sha256=<HMAC hexadécimal du corps brut>`, à vérifier côté récepteur. */
export function signBody(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

export interface WebhookDelivery {
  sent: boolean;
  status?: number;
  reason?: string;
}

/**
 * Envoi d'une alerte. Ne lève jamais.
 *
 * Toutes les destinations reçoivent la signature : Slack et Teams l'ignorent,
 * un relais intermédiaire peut s'en servir.
 */
export async function deliverWebhook(
  hook: { url: string; kind: WebhookKind; secret: string },
  alert: WebhookAlert,
): Promise<WebhookDelivery> {
  const checked = validateWebhookUrl(hook.url);
  if (!checked.ok) return { sent: false, reason: checked.reason };

  const body = JSON.stringify(buildWebhookBody(hook.kind, alert));
  try {
    const { response, finalUrl } = await safeFetch(checked.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "Konsent-Webhook/1",
        "X-Konsent-Signature": signBody(hook.secret, body),
      },
      body,
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    }, { followRedirects: false });
    // Le corps de réponse n'est pas lu : rien de ce que renvoie un tiers ne
    // doit remonter jusqu'à l'interface ni dans les journaux.
    await response.body?.cancel().catch(() => undefined);

    if (response.status >= 300 && response.status < 400) {
      return { sent: false, status: response.status, reason: "redirection refusée : le webhook doit répondre directement" };
    }
    if (!finalUrl.startsWith("https://")) {
      return { sent: false, status: response.status, reason: "redirection vers une adresse non chiffrée" };
    }
    if (!response.ok) {
      return { sent: false, status: response.status, reason: `refus du destinataire (${response.status})` };
    }
    return { sent: true, status: response.status };
  } catch (error) {
    if (error instanceof BlockedTargetError) {
      return { sent: false, reason: "adresse non publique refusée" };
    }
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return { sent: false, reason: `pas de réponse en ${WEBHOOK_TIMEOUT_MS / 1000} s` };
    }
    // undici emballe parfois l'erreur du `lookup` dans une `cause`.
    if (error instanceof Error && error.cause instanceof BlockedTargetError) {
      return { sent: false, reason: "adresse non publique refusée" };
    }
    return { sent: false, reason: "erreur réseau" };
  }
}
