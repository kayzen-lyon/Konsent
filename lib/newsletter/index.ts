import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { dbConfigured, getSql } from "../db";
import { emailConfigured, newsletterConfirmEmail, newsletterDigestEmail, sendEmail } from "../email";
import { entryText, entryTitle, entryUrl, feedEntries } from "../seo/feeds";
import { siteOrigin } from "../security/origin";

/**
 * Lettre mensuelle de la veille réglementaire.
 *
 * Double opt-in, texte brut, sans pixel ni lien traqué. On ne conserve que
 * l'adresse et l'EMPREINTE du jeton de confirmation ; le désabonnement
 * efface la ligne au lieu de la marquer (minimisation). Une inscription non
 * confirmée sous sept jours est purgée.
 *
 * Aucune fonction de ce module ne lève : elles sont appelées depuis des
 * routes publiques et depuis le cron de surveillance, qu'un fournisseur
 * d'e-mail indisponible ne doit pas faire tomber.
 */

/** Durée de validité d'une inscription non confirmée. */
export const UNCONFIRMED_TTL_DAYS = 7;

/** La lettre ne s'ouvre que si l'on peut à la fois stocker et confirmer. */
export function newsletterAvailable(): boolean {
  return dbConfigured() && emailConfigured();
}

/* ---------------------------------------------------------------- jetons */

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 sans sel : le jeton est un aléa de 256 bits (cf. lib/accounts). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function secret(): string | null {
  return process.env.KONSENT_AUTH_SECRET ?? process.env.DATABASE_URL ?? null;
}

function unsubscribeMac(id: string, key: string): string {
  return createHmac("sha256", key).update(`desabonnement-veille:${id}`).digest("base64url");
}

/**
 * Jeton de désabonnement : `<id>.<HMAC(id)>`. Sans état — il n'y a rien à
 * stocker, et il reste valable tant que la ligne existe. `null` sans secret.
 */
export function unsubscribeToken(id: string): string | null {
  const key = secret();
  return key ? `${id}.${unsubscribeMac(id, key)}` : null;
}

/** Identifiant porté par un jeton de désabonnement authentique, sinon `null`. */
export function verifyUnsubscribeToken(token: string): string | null {
  const key = secret();
  if (!key) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const expected = Buffer.from(unsubscribeMac(id, key));
  const given = Buffer.from(token.slice(dot + 1));
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}

/* ------------------------------------------------------------ calendrier */

function parisParts(now: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function isFirstOfMonthParis(now: Date): boolean {
  return parisParts(now).day === 1;
}

/** Mois courant à Paris, « AAAA-MM ». */
export function parisMonthKey(now: Date): string {
  const { year, month } = parisParts(now);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Mois écoulé à Paris, « AAAA-MM ». */
export function previousMonthKey(now: Date): string {
  const { year, month } = parisParts(now);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y!, m! - 1, 15)),
  );
}

/* ----------------------------------------------------------- inscription */

/**
 * Inscription (ou renvoi du lien si l'inscription n'est pas confirmée).
 *
 * L'appelant répond la même chose quel que soit le résultat : une adresse
 * déjà confirmée ne reçoit rien et ne se distingue pas d'une nouvelle.
 */
export async function subscribe(email: string): Promise<void> {
  if (!newsletterAvailable()) return;
  try {
    const token = newToken();
    const sql = getSql();
    const rows = await sql`
      insert into newsletter_subscribers (email, token_hash)
      values (${email.trim().toLowerCase()}, ${hashToken(token)})
      on conflict (email) do update
        set token_hash = excluded.token_hash, created_at = now()
        where newsletter_subscribers.confirmed_at is null
      returning id`;
    if (!rows[0]) return; // déjà confirmée : rien à envoyer.

    const url = `${siteOrigin()}/api/veille/confirmer?t=${encodeURIComponent(token)}`;
    const message = newsletterConfirmEmail({ url, expiresDays: UNCONFIRMED_TTL_DAYS });
    const sent = await sendEmail({ ...message, to: email.trim().toLowerCase() });
    if (!sent.sent) console.error(`[veille] confirmation non envoyée : ${sent.reason ?? "motif inconnu"}.`);
  } catch (error) {
    console.error("[veille] inscription", error);
  }
}

/** Confirme l'inscription portée par le jeton. `false` : jeton inconnu, expiré ou déjà utilisé. */
export async function confirmSubscription(token: string): Promise<boolean> {
  if (!dbConfigured()) return false;
  try {
    const rows = await getSql()`
      update newsletter_subscribers
      set confirmed_at = now(), token_hash = null
      where token_hash = ${hashToken(token)}
        and confirmed_at is null
        and created_at > now() - make_interval(days => ${UNCONFIRMED_TTL_DAYS})
      returning id`;
    return Boolean(rows[0]);
  } catch (error) {
    console.error("[veille] confirmation", error);
    return false;
  }
}

/** Efface l'abonné désigné par un jeton de désabonnement authentique. */
export async function unsubscribe(token: string): Promise<boolean> {
  const id = verifyUnsubscribeToken(token);
  if (!id || !dbConfigured()) return false;
  try {
    await getSql()`delete from newsletter_subscribers where id = ${id}::uuid`;
    return true;
  } catch (error) {
    console.error("[veille] désabonnement", error);
    return false;
  }
}

/** Supprime les inscriptions non confirmées de plus de sept jours. Renvoie le nombre effacé. */
export async function purgeUnconfirmedSubscribers(): Promise<number> {
  if (!dbConfigured()) return 0;
  try {
    const rows = await getSql()`
      delete from newsletter_subscribers
      where confirmed_at is null
        and created_at < now() - make_interval(days => ${UNCONFIRMED_TTL_DAYS})
      returning id`;
    return rows.length;
  } catch (error) {
    console.error("[veille] purge", error);
    return 0;
  }
}

/* ---------------------------------------------------------------- envoi */

export type DigestOutcome =
  | { sent: number; month: string }
  | { skipped: string };

/**
 * Lettre du mois écoulé, envoyée le 1er (heure de Paris), une fois par mois.
 *
 * Le mois est réservé dans `newsletter_sends` AVANT l'envoi : deux passages
 * concurrents du cron ne peuvent pas envoyer deux fois. Un mois sans entrée
 * nouvelle n'envoie rien (mais est marqué traité) : pas de lettre pour dire
 * qu'il n'y a rien à dire. Ne lève jamais.
 */
export async function sendMonthlyDigest(now: Date = new Date()): Promise<DigestOutcome> {
  if (!isFirstOfMonthParis(now)) return { skipped: "pas le 1er du mois" };
  if (!dbConfigured()) return { skipped: "base non configurée" };
  if (!emailConfigured()) return { skipped: "envoi d'e-mails non configuré" };

  const month = parisMonthKey(now);
  const covered = previousMonthKey(now);
  try {
    const sql = getSql();
    const claimed = await sql`
      insert into newsletter_sends (month, sent_at, count) values (${month}, now(), 0)
      on conflict (month) do nothing
      returning month`;
    if (!claimed[0]) return { skipped: "déjà envoyée ce mois" };

    const entries = feedEntries()
      .filter((e) => e.date.startsWith(covered))
      .map((e) => ({ title: entryTitle(e), url: entryUrl(e), text: entryText(e) }));
    if (entries.length === 0) return { sent: 0, month };

    const subscribers = await sql`
      select id, email from newsletter_subscribers
      where confirmed_at is not null and unsubscribed_at is null`;

    let count = 0;
    for (const row of subscribers) {
      const token = unsubscribeToken(String(row["id"]));
      if (!token) break;
      const unsubscribeUrl = `${siteOrigin()}/api/veille/desabonner?t=${encodeURIComponent(token)}`;
      const message = newsletterDigestEmail({
        monthLabel: monthLabel(covered),
        entries,
        veilleUrl: `${siteOrigin()}/veille`,
        unsubscribeUrl,
      });
      const result = await sendEmail({
        ...message,
        to: String(row["email"]),
        // RFC 8058 : désabonnement en un clic depuis la messagerie.
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      if (result.sent) count += 1;
      else console.error(`[veille] lettre non envoyée : ${result.reason ?? "motif inconnu"}.`);
    }

    await sql`update newsletter_sends set count = ${count}, sent_at = now() where month = ${month}`;
    return { sent: count, month };
  } catch (error) {
    console.error("[veille] envoi mensuel", error);
    return { skipped: "erreur pendant l'envoi" };
  }
}
