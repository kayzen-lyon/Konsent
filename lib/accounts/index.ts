import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { PlanId } from "../billing/plans";
import { dbConfigured, getSql, iso, isoOrNull, type Sql } from "../db";

/**
 * Comptes et sessions.
 *
 * Choix d'authentification : lien à usage unique, sans mot de passe. Ce n'est
 * pas une facilité, c'est une réduction de surface. Pas de mot de passe
 * signifie : rien à voler dans notre base, aucune réinitialisation à
 * sécuriser, aucun bourrage d'identifiants possible, et aucune tentation de
 * stocker un secret que l'utilisateur réemploie ailleurs. Un produit qui
 * reproche aux autres leur gestion des données personnelles a intérêt à en
 * détenir le moins possible.
 *
 * Ce qui est stocké : une adresse e-mail, et des EMPREINTES de jetons. Jamais
 * un jeton en clair. Une fuite de la base ne permet donc de se connecter à
 * aucun compte.
 *
 * Dégradation gracieuse : sans base configurée (DATABASE_URL), tout renvoie « indisponible »
 * et l'application fonctionne exactement comme avant — l'audit à la demande
 * reste sans trace, comme annoncé.
 */


/** Durée de validité d'un lien de connexion. Court : c'est un secret transmis par e-mail. */
export const MAGIC_LINK_TTL_MINUTES = 15;

/** Durée d'une session. Trente jours, renouvelée à l'usage. */
const SESSION_TTL_DAYS = 30;

export const SESSION_COOKIE = "konsent_session";

export interface Account {
  id: string;
  email: string;
  plan: PlanId;
  createdAt: string;
  /**
   * Agence à laquelle ce compte est rattaché, le cas échéant.
   *
   * `null` pour un compte de premier niveau. Ce champ porte à lui seul le
   * cloisonnement : `lib/agency/tenancy.ts` s'en sert pour décider qui voit
   * quoi, et refuse d'accorder les droits d'agence à un compte qui en a un.
   */
  parentId: string | null;
  /**
   * Agence qui a INVITÉ ce compte à se rattacher, en attente de sa réponse.
   * Seul le titulaire du compte peut transformer l'invitation en
   * rattachement (migration 0005).
   */
  invitedParentId: string | null;
}

export interface AccountsUnavailable {
  available: false;
  reason: string;
}

export interface Accounts {
  available: true;
  requestMagicLink(email: string): Promise<{ token: string; expiresAt: string }>;
  consumeMagicLink(token: string): Promise<{ sessionToken: string; account: Account } | null>;
  accountForSession(sessionToken: string): Promise<Account | null>;
  endSession(sessionToken: string): Promise<void>;
  purgeExpired(): Promise<number>;
  /** Sous-comptes DIRECTS d'une agence. Jamais transitif : le cloisonnement tient sur un niveau. */
  subAccounts(parentId: string): Promise<readonly Account[]>;
  /**
   * Invite un compte (créé s'il n'existe pas) à se rattacher à une agence.
   *
   * N'écrit JAMAIS `parent_id` : seule une invitation est posée, que le
   * titulaire doit accepter depuis son espace. Renvoie `false` sans dire
   * pourquoi si le compte est déjà rattaché — le motif renseignerait sur la
   * clientèle d'autrui.
   *
   * L'autorisation ne se décide PAS ici : elle relève de
   * `lib/agency/tenancy.ts`, seul endroit éprouvé pour cela. Cette méthode
   * exécute une décision déjà prise, et la base pose ses propres verrous
   * (pas d'imbrication, pas d'auto-parentage) au cas où un appelant futur
   * l'oublierait.
   */
  inviteSubAccount(parentId: string, email: string): Promise<boolean>;
  /** Compte par identifiant, ou `null`. */
  accountById(id: string): Promise<Account | null>;
  /**
   * Réponse du TITULAIRE à une invitation. N'aboutit que si l'invitation
   * porte toujours sur `parentId` — une invitation remplacée entre-temps ne
   * peut pas être acceptée par erreur.
   */
  acceptInvitation(childId: string, parentId: string): Promise<boolean>;
  declineInvitation(childId: string): Promise<void>;
  detachSubAccount(childId: string): Promise<void>;
  /**
   * Sessions du compte, actives ou expirées mais pas encore purgées.
   * Ni IP ni agent utilisateur : la table n'en contient pas, et c'est voulu.
   */
  sessionsFor(accountId: string, currentSessionToken: string): Promise<readonly SessionRecord[]>;
  /** Ferme toutes les sessions du compte sauf la session courante. Renvoie le nombre fermé. */
  endOtherSessions(accountId: string, currentSessionToken: string): Promise<number>;
  /**
   * Données du compte détenues dans les tables de comptes (droit à la
   * portabilité, art. 20 RGPD). Aucune empreinte : ni `token_hash`, ni
   * empreinte de clé d'API — elles ne sont pas des données de la personne,
   * et les exporter fabriquerait un second coffre à protéger.
   */
  exportAccountData(accountId: string): Promise<AccountDataExport | null>;
  /**
   * Effacement du compte (droit à l'effacement, art. 17 RGPD).
   *
   * Les sous-comptes d'une agence sont DÉTACHÉS d'abord, jamais supprimés :
   * ce sont les comptes d'autres personnes. Le reste suit les cascades du
   * schéma ; le journal `api_calls` est anonymisé par `on delete set null`.
   */
  deleteAccount(accountId: string): Promise<AccountDeletion>;
}

export interface SessionRecord {
  id: string;
  createdAt: string;
  expiresAt: string;
  /** Vrai pour la session qui fait la requête. */
  current: boolean;
  expired: boolean;
}

export interface AccountDataExport {
  account: {
    id: string;
    email: string;
    plan: PlanId;
    createdAt: string;
    updatedAt: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    parentId: string | null;
    invitedParentId: string | null;
  };
  sessions: readonly Omit<SessionRecord, "current">[];
  apiKeys: readonly {
    id: string;
    label: string;
    hint: string;
    scopes: readonly string[];
    monthlyQuota: number;
    createdAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
  }[];
  apiCalls: readonly {
    path: string;
    method: string;
    status: number;
    refusal: string | null;
    at: string;
  }[];
  subAccounts: readonly { id: string; email: string; createdAt: string }[];
  pendingInvitationsSent: readonly { id: string; email: string; createdAt: string }[];
}

export type AccountDeletion =
  | { deleted: true; detachedSubAccounts: number }
  | { deleted: false; reason: "not_found" | "active_subscription" };

/**
 * Empreinte d'un jeton.
 *
 * SHA-256 sans sel volontairement : un jeton est un aléa de 256 bits, il n'y a
 * pas de dictionnaire à opposer et le salage n'apporterait rien. Ce serait un
 * choix inacceptable pour un mot de passe — raison de plus pour ne pas en
 * avoir.
 */
function fingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Comparaison à temps constant de deux empreintes hexadécimales. */
export function sameFingerprint(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

class PostgresAccounts implements Accounts {
  readonly available = true as const;

  constructor(private readonly sql: Sql) {}

  private async upsertAccount(email: string): Promise<void> {
    // Création ou récupération, sans révéler lequel des deux a eu lieu.
    await this.sql`
      insert into accounts (email) values (${email})
      on conflict (email) do update set updated_at = now()`;
  }

  async requestMagicLink(email: string): Promise<{ token: string; expiresAt: string }> {
    const normalized = normalizeEmail(email);
    const token = newToken();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60_000).toISOString();

    // Le compte est créé à la première demande. On ne révèle jamais à
    // l'appelant s'il existait déjà : ce serait un moyen de tester si une
    // adresse est cliente.
    await this.upsertAccount(normalized);
    await this.sql`
      insert into login_tokens (email, token_hash, expires_at)
      values (${normalized}, ${fingerprint(token)}, ${expiresAt})`;

    return { token, expiresAt };
  }

  async consumeMagicLink(
    token: string,
  ): Promise<{ sessionToken: string; account: Account } | null> {
    // Consommation atomique : le jeton est marqué utilisé ET renvoyé dans la
    // même requête. Deux ouvertures simultanées ne créent pas deux sessions.
    const rows = await this.sql`
      update login_tokens set used_at = now()
      where token_hash = ${fingerprint(token)} and used_at is null and expires_at > now()
      returning email`;
    const row = rows[0];
    if (!row) return null;

    const accounts = await this.sql`select * from accounts where email = ${String(row["email"])}`;
    const accountRow = accounts[0];
    if (!accountRow) return null;

    const sessionToken = newToken();
    const sessionExpiry = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000).toISOString();
    await this.sql`
      insert into sessions (account_id, token_hash, expires_at)
      values (${accountRow["id"]}, ${fingerprint(sessionToken)}, ${sessionExpiry})`;

    return { sessionToken, account: toAccount(accountRow) };
  }

  async accountForSession(sessionToken: string): Promise<Account | null> {
    const rows = await this.sql`
      select a.* from sessions s join accounts a on a.id = s.account_id
      where s.token_hash = ${fingerprint(sessionToken)} and s.expires_at > now()
      limit 1`;
    return rows[0] ? toAccount(rows[0]) : null;
  }

  async endSession(sessionToken: string): Promise<void> {
    await this.sql`delete from sessions where token_hash = ${fingerprint(sessionToken)}`;
  }

  async purgeExpired(): Promise<number> {
    const sessions = await this.sql`delete from sessions where expires_at < now() returning id`;
    const tokens = await this.sql`delete from login_tokens where expires_at < now() returning id`;
    return sessions.length + tokens.length;
  }

  async subAccounts(parentId: string): Promise<readonly Account[]> {
    const rows = await this.sql`
      select * from accounts where parent_id = ${parentId} order by created_at asc`;
    return rows.map(toAccount);
  }

  async inviteSubAccount(parentId: string, email: string): Promise<boolean> {
    const normalized = normalizeEmail(email);
    await this.upsertAccount(normalized);
    // N'écrit JAMAIS parent_id : seule une invitation est posée.
    const rows = await this.sql`
      update accounts set invited_parent_id = ${parentId}, updated_at = now()
      where email = ${normalized} and parent_id is null and id <> ${parentId}
      returning id`;
    return rows.length > 0;
  }

  async accountById(id: string): Promise<Account | null> {
    const rows = await this.sql`select * from accounts where id = ${id} limit 1`;
    return rows[0] ? toAccount(rows[0]) : null;
  }

  async acceptInvitation(childId: string, parentId: string): Promise<boolean> {
    const rows = await this.sql`
      update accounts
      set parent_id = ${parentId}, invited_parent_id = null, updated_at = now()
      where id = ${childId} and parent_id is null and invited_parent_id = ${parentId}
      returning id`;
    return rows.length > 0;
  }

  async declineInvitation(childId: string): Promise<void> {
    await this.sql`
      update accounts set invited_parent_id = null, updated_at = now() where id = ${childId}`;
  }

  async detachSubAccount(childId: string): Promise<void> {
    await this.sql`
      update accounts set parent_id = null, updated_at = now() where id = ${childId}`;
  }

  async sessionsFor(accountId: string, currentSessionToken: string): Promise<readonly SessionRecord[]> {
    const rows = await this.sql`
      select id, created_at, expires_at,
             token_hash = ${fingerprint(currentSessionToken)} as current,
             expires_at <= now() as expired
      from sessions where account_id = ${accountId}
      order by created_at desc limit 50`;
    return rows.map((r) => ({
      id: String(r["id"]),
      createdAt: iso(r["created_at"]),
      expiresAt: iso(r["expires_at"]),
      current: Boolean(r["current"]),
      expired: Boolean(r["expired"]),
    }));
  }

  async endOtherSessions(accountId: string, currentSessionToken: string): Promise<number> {
    const rows = await this.sql`
      delete from sessions
      where account_id = ${accountId} and token_hash <> ${fingerprint(currentSessionToken)}
      returning id`;
    return rows.length;
  }

  async exportAccountData(accountId: string): Promise<AccountDataExport | null> {
    // Colonnes nommées une à une : un `select *` exporterait demain une
    // colonne ajoutée sans que personne ait décidé qu'elle devait sortir.
    const accountRows = await this.sql`
      select id, email, plan, created_at, updated_at, stripe_customer_id,
             stripe_subscription_id, parent_id, invited_parent_id
      from accounts where id = ${accountId} limit 1`;
    const a = accountRows[0];
    if (!a) return null;

    const [sessions, keys, calls, children, invited] = await Promise.all([
      this.sql`
        select id, created_at, expires_at, expires_at <= now() as expired
        from sessions where account_id = ${accountId} order by created_at desc`,
      this.sql`
        select id, label, hint, scopes, monthly_quota, created_at, last_used_at, revoked_at
        from api_keys where org_id = ${accountId} order by created_at asc`,
      this.sql`
        select path, method, status, refusal, at
        from api_calls where org_id = ${accountId} order by at desc limit 5000`,
      this.sql`
        select id, email, created_at from accounts
        where parent_id = ${accountId} order by created_at asc`,
      this.sql`
        select id, email, created_at from accounts
        where invited_parent_id = ${accountId} order by created_at asc`,
    ]);

    const brief = (r: Record<string, unknown>) => ({
      id: String(r["id"]),
      email: String(r["email"]),
      createdAt: iso(r["created_at"]),
    });

    return {
      account: {
        id: String(a["id"]),
        email: String(a["email"]),
        plan: (a["plan"] as PlanId) ?? "libre",
        createdAt: iso(a["created_at"]),
        updatedAt: iso(a["updated_at"]),
        stripeCustomerId: (a["stripe_customer_id"] as string | null) ?? null,
        stripeSubscriptionId: (a["stripe_subscription_id"] as string | null) ?? null,
        parentId: (a["parent_id"] as string | null) ?? null,
        invitedParentId: (a["invited_parent_id"] as string | null) ?? null,
      },
      sessions: sessions.map((r) => ({
        id: String(r["id"]),
        createdAt: iso(r["created_at"]),
        expiresAt: iso(r["expires_at"]),
        expired: Boolean(r["expired"]),
      })),
      apiKeys: keys.map((r) => ({
        id: String(r["id"]),
        label: String(r["label"] ?? ""),
        hint: String(r["hint"] ?? ""),
        scopes: (r["scopes"] as string[] | null) ?? [],
        monthlyQuota: Number(r["monthly_quota"] ?? 0),
        createdAt: iso(r["created_at"]),
        lastUsedAt: isoOrNull(r["last_used_at"]),
        revokedAt: isoOrNull(r["revoked_at"]),
      })),
      apiCalls: calls.map((r) => ({
        path: String(r["path"]),
        method: String(r["method"]),
        status: Number(r["status"]),
        refusal: (r["refusal"] as string | null) ?? null,
        at: iso(r["at"]),
      })),
      subAccounts: children.map(brief),
      pendingInvitationsSent: invited.map(brief),
    };
  }

  async deleteAccount(accountId: string): Promise<AccountDeletion> {
    const rows = await this.sql`
      select email, stripe_subscription_id from accounts where id = ${accountId} limit 1`;
    const row = rows[0];
    if (!row) return { deleted: false, reason: "not_found" };
    // Un abonnement Stripe en cours continuerait d'être prélevé après
    // l'effacement, sans plus aucun compte pour le résilier : refusé.
    if (row["stripe_subscription_id"]) return { deleted: false, reason: "active_subscription" };
    const email = String(row["email"]);

    // Une seule transaction : un effacement à moitié fait laisserait des
    // sous-comptes détachés d'un compte toujours présent, ou l'inverse.
    const [detached] = await this.sql.transaction([
      // 1. Les sous-comptes sont DÉTACHÉS, jamais supprimés : ce sont les
      //    comptes d'autres personnes.
      this.sql`
        update accounts set parent_id = null, updated_at = now()
        where parent_id = ${accountId} returning id`,
      // 2. Les invitations envoyées sont retirées.
      this.sql`
        update accounts set invited_parent_id = null, updated_at = now()
        where invited_parent_id = ${accountId}`,
      // 3. Les jetons de connexion portent l'adresse, sans clé étrangère.
      this.sql`delete from login_tokens where email = ${email}`,
      // 4. Les inscriptions à la surveillance faites SANS session à cette
      //    adresse : le titulaire a prouvé qu'elle est la sienne.
      this.sql`
        delete from monitored_domains where account_id is null and alert_email = ${email}`,
      // 5. Le compte. Cascades : sessions, domaines, et par les domaines
      //    historique, alertes, webhooks (`alert_webhooks`) et plan d'action
      //    (`action_items`) — le jeton de confirmation d'adresse est une
      //    colonne du domaine ; clés d'API ; `api_calls` : org_id / key_id
      //    mis à NULL.
      this.sql`delete from accounts where id = ${accountId}`,
    ]);
    return { deleted: true, detachedSubAccounts: detached?.length ?? 0 };
  }
}

function toAccount(row: Record<string, unknown>): Account {
  return {
    id: String(row["id"]),
    email: String(row["email"]),
    plan: (row["plan"] as PlanId) ?? "libre",
    createdAt: iso(row["created_at"]),
    parentId: (row["parent_id"] as string | null) ?? null,
    invitedParentId: (row["invited_parent_id"] as string | null) ?? null,
  };
}

let cached: Accounts | AccountsUnavailable | null = null;

export function getAccounts(): Accounts | AccountsUnavailable {
  if (cached) return cached;
  if (!dbConfigured()) {
    cached = {
      available: false,
      reason:
        "Aucune base n'est configurée sur cette instance : les comptes sont désactivés et l'analyse reste sans trace.",
    };
    return cached;
  }
  cached = new PostgresAccounts(getSql());
  return cached;
}
