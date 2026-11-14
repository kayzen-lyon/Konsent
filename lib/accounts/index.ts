import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { PlanId } from "../billing/plans";
import { dbConfigured, getSql, iso, type Sql } from "../db";

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
}

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
