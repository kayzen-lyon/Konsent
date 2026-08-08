import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { PlanId } from "../billing/plans";

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
 * Dégradation gracieuse : sans Supabase configuré, tout renvoie « indisponible »
 * et l'application fonctionne exactement comme avant — l'audit à la demande
 * reste sans trace, comme annoncé.
 */

const SUPABASE_URL = process.env["SUPABASE_URL"];
const SERVICE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

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

class SupabaseAccounts implements Accounts {
  readonly available = true as const;

  constructor(
    private readonly url: string,
    private readonly key: string,
  ) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...init.headers,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Supabase ${res.status} sur ${path} : ${detail.slice(0, 200)}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async requestMagicLink(email: string): Promise<{ token: string; expiresAt: string }> {
    const normalized = normalizeEmail(email);
    const token = newToken();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60_000).toISOString();

    // Le compte est créé à la première demande. On ne révèle jamais à
    // l'appelant s'il existait déjà : ce serait un moyen de tester si une
    // adresse est cliente.
    await this.request("rpc/konsent_upsert_account", {
      method: "POST",
      body: JSON.stringify({ p_email: normalized }),
    });

    await this.request("login_tokens", {
      method: "POST",
      body: JSON.stringify({
        email: normalized,
        token_hash: fingerprint(token),
        expires_at: expiresAt,
      }),
    });

    return { token, expiresAt };
  }

  async consumeMagicLink(
    token: string,
  ): Promise<{ sessionToken: string; account: Account } | null> {
    const hash = fingerprint(token);
    const nowIso = new Date().toISOString();

    // La consommation est atomique : le jeton est marqué utilisé ET renvoyé
    // dans la même requête. Sans cela, deux ouvertures simultanées du même
    // lien créeraient deux sessions.
    const rows = await this.request<Record<string, unknown>[]>(
      `login_tokens?token_hash=eq.${hash}&used_at=is.null&expires_at=gt.${nowIso}`,
      { method: "PATCH", body: JSON.stringify({ used_at: nowIso }) },
    );

    const row = rows[0];
    if (!row) return null;

    const email = String(row["email"]);
    const accounts = await this.request<Record<string, unknown>[]>(
      `accounts?email=eq.${encodeURIComponent(email)}&select=*`,
    );
    const accountRow = accounts[0];
    if (!accountRow) return null;

    const sessionToken = newToken();
    await this.request("sessions", {
      method: "POST",
      body: JSON.stringify({
        account_id: accountRow["id"],
        token_hash: fingerprint(sessionToken),
        expires_at: new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000).toISOString(),
      }),
    });

    return { sessionToken, account: toAccount(accountRow) };
  }

  async accountForSession(sessionToken: string): Promise<Account | null> {
    const hash = fingerprint(sessionToken);
    const nowIso = new Date().toISOString();
    const rows = await this.request<Record<string, unknown>[]>(
      `sessions?token_hash=eq.${hash}&expires_at=gt.${nowIso}&select=account_id,accounts(*)`,
    );
    const row = rows[0];
    if (!row) return null;
    const nested = row["accounts"] as Record<string, unknown> | undefined;
    return nested ? toAccount(nested) : null;
  }

  async endSession(sessionToken: string): Promise<void> {
    await this.request(`sessions?token_hash=eq.${fingerprint(sessionToken)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
  }

  async purgeExpired(): Promise<number> {
    const nowIso = new Date().toISOString();
    const sessions = await this.request<Record<string, unknown>[]>(
      `sessions?expires_at=lt.${nowIso}`,
      { method: "DELETE" },
    );
    const tokens = await this.request<Record<string, unknown>[]>(
      `login_tokens?expires_at=lt.${nowIso}`,
      { method: "DELETE" },
    );
    return (sessions?.length ?? 0) + (tokens?.length ?? 0);
  }
}

function toAccount(row: Record<string, unknown>): Account {
  return {
    id: String(row["id"]),
    email: String(row["email"]),
    plan: (row["plan"] as PlanId) ?? "libre",
    createdAt: String(row["created_at"]),
  };
}

let cached: Accounts | AccountsUnavailable | null = null;

export function getAccounts(): Accounts | AccountsUnavailable {
  if (cached) return cached;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    cached = {
      available: false,
      reason:
        "Aucune base n'est configurée sur cette instance : les comptes sont désactivés et l'analyse reste sans trace.",
    };
    return cached;
  }
  cached = new SupabaseAccounts(SUPABASE_URL.replace(/\/$/, ""), SERVICE_KEY);
  return cached;
}
