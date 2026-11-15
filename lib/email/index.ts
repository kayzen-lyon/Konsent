/**
 * Envoi d'e-mails.
 *
 * Ce module comble un manque que le contrôle de sincérité des offres a mis au
 * jour : la surveillance enregistrait consciencieusement ses alertes en base,
 * et personne ne les envoyait. Un client payant pour être prévenu qu'un pixel
 * est apparu sur son site ne l'aurait jamais été.
 *
 * Deux principes.
 *
 * 1. Un envoi qui échoue ne casse jamais l'appelant. Le cron de surveillance
 *    traite plusieurs domaines : un fournisseur d'e-mail indisponible ne doit
 *    pas faire tomber la surveillance des autres. Toutes les fonctions
 *    renvoient un résultat, aucune ne lève.
 *
 * 2. Un envoi non effectué se voit. `{ sent: false }` porte toujours un motif,
 *    et l'appelant le persiste. Une alerte réputée envoyée mais jamais partie
 *    est pire que pas d'alerte du tout : elle donne une fausse assurance.
 */

const ENDPOINT = "https://api.resend.com/emails";

export interface SendResult {
  sent: boolean;
  /** Identifiant du message chez le fournisseur, pour retrouver une trace. */
  providerId?: string;
  reason?: string;
}

export function emailConfigured(): boolean {
  return Boolean(process.env["RESEND_API_KEY"] && process.env["KONSENT_MAIL_FROM"]);
}

export interface EmailMessage {
  to: string;
  subject: string;
  /**
   * Corps en texte brut. Konsent n'envoie pas d'e-mail en HTML : un pixel de
   * suivi dans un message d'un auditeur de traceurs serait difficile à
   * défendre, et le texte brut ne peut pas en porter.
   */
  text: string;
  replyTo?: string;
  /** En-têtes supplémentaires (ex. `List-Unsubscribe`, RFC 8058). */
  headers?: Record<string, string>;
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["KONSENT_MAIL_FROM"];

  if (!apiKey || !from) {
    return { sent: false, reason: "expéditeur non configuré sur cette instance" };
  }

  if (!isPlausibleAddress(message.to)) {
    return { sent: false, reason: "adresse destinataire invalide" };
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        ...(message.headers ? { headers: message.headers } : {}),
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      // Le corps de réponse peut contenir l'adresse et des détails de compte :
      // on n'en garde que le strict nécessaire au diagnostic.
      return { sent: false, reason: `refus du fournisseur (${response.status})` };
    }

    const payload = (await response.json()) as { id?: string };
    return { sent: true, ...(payload.id ? { providerId: payload.id } : {}) };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? `erreur réseau : ${error.message}` : "erreur réseau",
    };
  }
}

/**
 * Contrôle volontairement grossier.
 *
 * Valider une adresse par expression régulière stricte rejette des adresses
 * légitimes ; on écarte seulement ce qui ne peut manifestement pas être une
 * adresse, et on laisse le fournisseur trancher le reste.
 */
export function isPlausibleAddress(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 6 || trimmed.length > 254) return false;
  if (/\s/.test(trimmed)) return false;
  const at = trimmed.indexOf("@");
  if (at < 1 || at !== trimmed.lastIndexOf("@")) return false;
  const domain = trimmed.slice(at + 1);
  return domain.includes(".") && !domain.startsWith(".") && !domain.endsWith(".");
}

/* ------------------------------------------------------------ gabarits */

/**
 * Les corps d'e-mail sont écrits ici, pas assemblés sur place.
 *
 * Le garde-fou n°3 du PRD interdit toute fausse urgence et toute imitation
 * d'autorité. Un message d'alerte est le meilleur endroit pour dériver vers
 * l'un ou l'autre : centraliser les gabarits rend cette dérive visible en
 * revue.
 */

export function alertEmail(input: {
  hostname: string;
  summary: string;
  observedAt: string;
  reportUrl: string;
}): EmailMessage {
  return {
    to: "",
    subject: `${input.hostname} — un écart est apparu depuis la dernière analyse`,
    text: [
      `Bonjour,`,
      ``,
      `L'analyse automatique de ${input.hostname} du ${input.observedAt} relève un écart`,
      `par rapport à la référence précédente.`,
      ``,
      input.summary,
      ``,
      `Rapport complet : ${input.reportUrl}`,
      ``,
      `Ce message est produit par une analyse technique automatisée. Il constate un`,
      `écart, il ne qualifie pas une infraction : seule la CNIL ou un juge peut le`,
      `faire. Aucune action n'est urgente du seul fait de ce message.`,
      ``,
      `Pour ne plus recevoir ces alertes, retirez le domaine de la surveillance`,
      `depuis votre espace, ou répondez à ce message.`,
      ``,
      `Konsent — KAYZEN (Tarek BELHADJ EI)`,
    ].join("\n"),
  };
}

export function magicLinkEmail(input: {
  url: string;
  expiresMinutes: number;
}): EmailMessage {
  return {
    to: "",
    subject: "Votre lien de connexion Konsent",
    text: [
      `Bonjour,`,
      ``,
      `Voici votre lien de connexion :`,
      ``,
      input.url,
      ``,
      `Il expire dans ${input.expiresMinutes} minutes et ne fonctionne qu'une fois.`,
      ``,
      `Si vous n'avez pas demandé à vous connecter, ignorez ce message : personne`,
      `ne peut accéder à votre espace sans ce lien.`,
      ``,
      `Konsent — KAYZEN (Tarek BELHADJ EI)`,
    ].join("\n"),
  };
}

export function newsletterConfirmEmail(input: { url: string; expiresDays: number }): EmailMessage {
  return {
    to: "",
    subject: "Confirmez votre inscription à la veille Konsent",
    text: [
      `Bonjour,`,
      ``,
      `Une inscription à la lettre mensuelle de la veille réglementaire Konsent a été`,
      `demandée pour cette adresse. Pour la confirmer, ouvrez ce lien :`,
      ``,
      input.url,
      ``,
      `Sans confirmation, rien ne vous sera envoyé et l'adresse sera effacée sous`,
      `${input.expiresDays} jours.`,
      ``,
      `Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
      ``,
      `Konsent — KAYZEN (Tarek BELHADJ EI)`,
    ].join("\n"),
  };
}

export function newsletterDigestEmail(input: {
  monthLabel: string;
  entries: readonly { title: string; url: string; text: string }[];
  veilleUrl: string;
  unsubscribeUrl: string;
}): EmailMessage {
  const body = input.entries.flatMap((e, i) => [
    `${i + 1}. ${e.title}`,
    e.url,
    ``,
    e.text,
    ``,
    `—`,
    ``,
  ]);
  return {
    to: "",
    subject: `Veille réglementaire Konsent — ${input.monthLabel}`,
    text: [
      `Bonjour,`,
      ``,
      `Voici les entrées ajoutées à la veille réglementaire pour ${input.monthLabel}.`,
      `Chacune porte son statut : un projet n'est pas un texte en vigueur.`,
      ``,
      ...body,
      `Toute la veille : ${input.veilleUrl}`,
      ``,
      `Ce message résume des sources publiques. Il ne constitue pas un avis juridique.`,
      ``,
      `Vous recevez cette lettre parce que vous vous y êtes inscrit et l'avez confirmé.`,
      `Pour vous désabonner (l'adresse est alors effacée) : ${input.unsubscribeUrl}`,
      ``,
      `Konsent — KAYZEN (Tarek BELHADJ EI)`,
    ].join("\n"),
  };
}

export function reportEmail(input: {
  hostname: string;
  score: number;
  grade: string;
  scannedAt: string;
  /** Vrai si l'analyse vient d'être relancée faute d'historique. */
  fresh: boolean;
  priorities: readonly { title: string; severityLabel: string }[];
  scanUrl: string;
  synthesisUrl: string;
}): EmailMessage {
  const priorities =
    input.priorities.length > 0
      ? input.priorities.map((p, i) => `${i + 1}. [${p.severityLabel}] ${p.title}`)
      : [`Aucun écart relevé par cette analyse.`];
  return {
    to: "",
    subject: `${input.hostname} — résumé de l'analyse Konsent`,
    text: [
      `Bonjour,`,
      ``,
      `Vous avez demandé depuis votre espace le résumé de l'analyse de ${input.hostname}.`,
      ``,
      `Analyse du ${input.scannedAt}${input.fresh ? " (relancée à votre demande)" : ""}`,
      `Score indicatif : ${input.score} / 100 — note ${input.grade}`,
      ``,
      `Points à examiner en priorité :`,
      ...priorities,
      ``,
      `Rapport complet : ${input.scanUrl}`,
      `Synthèse : ${input.synthesisUrl}`,
      ``,
      `Ce message est produit par une analyse technique automatisée. Il constate des`,
      `écarts, il ne qualifie pas une infraction : seule la CNIL ou un juge peut le`,
      `faire.`,
      ``,
      `Konsent — KAYZEN (Tarek BELHADJ EI)`,
    ].join("\n"),
  };
}
