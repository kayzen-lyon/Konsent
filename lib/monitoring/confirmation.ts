import type { EmailMessage } from "../email";
import { ALERT_CONFIRM_TTL_HOURS } from "../storage";

/**
 * Confirmation de l'adresse d'alerte (double opt-in).
 *
 * Sans elle, n'importe qui pourrait inscrire l'adresse d'un tiers à la
 * surveillance d'un domaine qu'il contrôle, et lui faire recevoir des
 * courriels qu'il n'a jamais demandés. Tant que l'adresse n'est pas
 * confirmée, le cron n'y envoie rien.
 *
 * Le gabarit suit les règles de `lib/email` : texte brut, aucune fausse
 * urgence, aucun pixel.
 */

export function confirmationUrl(origin: string, token: string): string {
  return `${origin}/api/surveillance/confirmer?jeton=${encodeURIComponent(token)}`;
}

export function alertConfirmationEmail(input: { hostname: string; url: string }): EmailMessage {
  return {
    to: "",
    subject: `Confirmez l'adresse d'alerte pour ${input.hostname}`,
    text: [
      `Bonjour,`,
      ``,
      `Cette adresse a été indiquée pour recevoir les alertes de surveillance de`,
      `${input.hostname} sur Konsent. Pour les recevoir, confirmez-la :`,
      ``,
      input.url,
      ``,
      `Le lien est valable ${ALERT_CONFIRM_TTL_HOURS} heures et ne fonctionne qu'une fois.`,
      ``,
      `Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : sans`,
      `confirmation, aucune alerte ne vous sera envoyée.`,
      ``,
      `Konsent — KAYZEN (Tarek BELHADJ EI)`,
    ].join("\n"),
  };
}
