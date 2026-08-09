/**
 * Filtrage anti-robot d'un formulaire, sans CAPTCHA ni service tiers.
 *
 * Le CAPTCHA est écarté pour deux raisons qui se cumulent. D'abord parce
 * qu'un reCAPTCHA charge des ressources Google et dépose des traceurs sur
 * chaque visiteur : c'est exactement le comportement que ce site relève chez
 * les autres. Ensuite parce qu'il est une barrière d'accessibilité connue —
 * les critères RGAA n'admettent une épreuve de reconnaissance qu'assortie
 * d'une alternative, et la plupart des implémentations n'en offrent aucune.
 *
 * Le pot de miel ne demande RIEN à l'utilisateur. Il n'a donc aucun coût
 * d'accessibilité, aucun coût de vie privée, et aucun tiers.
 *
 * Trois contrôles indépendants, dont un seul suffit à écarter un envoi :
 *
 *  1. **Le champ leurre.** Invisible et retiré de l'arbre d'accessibilité,
 *     donc jamais rempli par un humain ni annoncé par un lecteur d'écran. Un
 *     robot qui remplit tous les champs se trahit.
 *  2. **Le délai de saisie.** Un formulaire soumis en moins de trois secondes
 *     n'a pas été lu. Le jeton d'horodatage est signé, sinon il suffirait de
 *     l'antidater.
 *  3. **La fraîcheur.** Un jeton de plus de deux heures est refusé : c'est la
 *     signature d'une soumission rejouée en masse.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from "./fields";

export { HONEYPOT_FIELD, TIMESTAMP_FIELD };

/** Délai minimal de saisie plausible. */
export const MIN_FILL_MS = 3_000;

/** Durée au-delà de laquelle un formulaire préparé est considéré comme périmé. */
export const MAX_AGE_MS = 2 * 60 * 60 * 1_000;

function secret(): string {
  // Sans secret dédié, on retombe sur une valeur fixe : le jeton reste alors
  // vérifiable mais falsifiable. C'est un anti-robot, pas un contrôle
  // d'accès — l'enjeu est le coût d'automatisation, pas le secret d'État.
  return process.env["KONSENT_FORM_SECRET"] ?? "konsent-form-v1";
}

/** Jeton `horodatage.signature`, à poser dans un champ caché à l'affichage. */
export function issueToken(now: number = Date.now()): string {
  const stamp = String(now);
  return `${stamp}.${sign(stamp)}`;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function signatureMatches(payload: string, provided: string): boolean {
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(provided);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export type SpamVerdict =
  | { accepted: true }
  | { accepted: false; reason: "HONEYPOT" | "TOO_FAST" | "STALE" | "BAD_TOKEN" };

/**
 * Décide si une soumission provient plausiblement d'un humain.
 *
 * Renvoie toujours le MOTIF du refus pour la journalisation interne, mais
 * l'appelant ne doit pas le restituer tel quel : dire « pot de miel rempli »
 * à un robot revient à lui indiquer comment passer.
 */
export function evaluateSubmission(
  fields: { honeypot?: unknown; token?: unknown },
  now: number = Date.now(),
): SpamVerdict {
  // Un champ leurre non vide suffit : aucun humain ne peut l'avoir rempli.
  const honeypot = typeof fields.honeypot === "string" ? fields.honeypot.trim() : "";
  if (honeypot.length > 0) return { accepted: false, reason: "HONEYPOT" };

  const token = typeof fields.token === "string" ? fields.token : "";
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return { accepted: false, reason: "BAD_TOKEN" };

  const stamp = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!/^\d+$/.test(stamp) || !signatureMatches(stamp, signature)) {
    return { accepted: false, reason: "BAD_TOKEN" };
  }

  const issued = Number(stamp);
  const age = now - issued;

  // Un jeton daté du futur est soit une horloge décalée, soit une
  // fabrication. Dans les deux cas, on ne peut pas mesurer un délai de saisie.
  if (age < 0) return { accepted: false, reason: "BAD_TOKEN" };
  if (age < MIN_FILL_MS) return { accepted: false, reason: "TOO_FAST" };
  if (age > MAX_AGE_MS) return { accepted: false, reason: "STALE" };

  return { accepted: true };
}

/**
 * Message rendu à l'appelant refusé.
 *
 * Volontairement identique pour tous les motifs sauf l'ancienneté, qui est le
 * seul cas où un humain de bonne foi peut se retrouver bloqué — un onglet
 * laissé ouvert une nuit. Lui dire quoi faire est utile ; détailler les
 * autres motifs ne servirait qu'à celui qui les contourne.
 */
export function refusalMessage(reason: Exclude<SpamVerdict, { accepted: true }>["reason"]): string {
  if (reason === "STALE") {
    return "Ce formulaire est resté ouvert trop longtemps. Rechargez la page et renvoyez votre message.";
  }
  return "Votre message n'a pas pu être envoyé. Rechargez la page et réessayez, ou écrivez-nous directement par courriel.";
}
