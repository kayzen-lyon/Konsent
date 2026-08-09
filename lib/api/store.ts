import type { ApiKeyRecord } from "./keys";
import type { Scope } from "./registry";

/**
 * Persistance des clés, de leur consommation et du journal d'appels.
 *
 * Optionnelle, comme le reste de la couche de stockage : sans configuration,
 * les clés sont inertes et l'application se comporte exactement comme
 * aujourd'hui. Le produit le dit plutôt que d'échouer en silence.
 */

export interface UsageWindow {
  /** Appels comptés sur les 30 derniers jours. */
  used: number;
  quota: number;
  remaining: number;
}

export interface CallRecord {
  keyId: string | null;
  orgId: string | null;
  path: string;
  method: string;
  status: number;
  /** Motif de refus, le cas échéant. Le journal doit dire pourquoi, pas seulement quoi. */
  refusal: string | null;
  at: string;
}

export interface ApiKeyStore {
  readonly available: true;
  findByFingerprint(fingerprint: string): Promise<ApiKeyRecord | null>;
  create(input: {
    orgId: string;
    label: string;
    hint: string;
    fingerprint: string;
    scopes: readonly Scope[];
    monthlyQuota: number;
  }): Promise<ApiKeyRecord>;
  revoke(id: string): Promise<void>;
  /** Consommation glissante sur 30 jours. */
  usage(record: ApiKeyRecord): Promise<UsageWindow>;
  /**
   * Journal d'appels, en ajout seul (§14.3 : `audit_log`).
   *
   * Il porte l'identifiant de la clé, jamais son secret ni son empreinte :
   * un journal qui contiendrait de quoi rejouer un appel serait un second
   * coffre à protéger.
   */
  record(call: CallRecord): Promise<void>;
  touch(id: string, at: string): Promise<void>;
}

export interface ApiKeyStoreUnavailable {
  readonly available: false;
  readonly reason: string;
}

const SUPABASE_URL = process.env["SUPABASE_URL"];
const SERVICE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

function toRecord(row: Record<string, unknown>): ApiKeyRecord {
  return {
    id: String(row["id"]),
    orgId: String(row["org_id"]),
    label: String(row["label"] ?? ""),
    hint: String(row["hint"] ?? ""),
    fingerprint: String(row["fingerprint"]),
    scopes: (row["scopes"] as Scope[] | null) ?? [],
    monthlyQuota: Number(row["monthly_quota"] ?? 0),
    createdAt: String(row["created_at"]),
    lastUsedAt: (row["last_used_at"] as string | null) ?? null,
    revokedAt: (row["revoked_at"] as string | null) ?? null,
  };
}

class SupabaseApiKeyStore implements ApiKeyStore {
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

  async findByFingerprint(fingerprint: string): Promise<ApiKeyRecord | null> {
    const rows = await this.request<Record<string, unknown>[]>(
      `api_keys?fingerprint=eq.${encodeURIComponent(fingerprint)}&limit=1`,
    );
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async create(input: {
    orgId: string;
    label: string;
    hint: string;
    fingerprint: string;
    scopes: readonly Scope[];
    monthlyQuota: number;
  }): Promise<ApiKeyRecord> {
    const rows = await this.request<Record<string, unknown>[]>("api_keys", {
      method: "POST",
      body: JSON.stringify({
        org_id: input.orgId,
        label: input.label,
        hint: input.hint,
        fingerprint: input.fingerprint,
        scopes: input.scopes,
        monthly_quota: input.monthlyQuota,
      }),
    });
    return toRecord(rows[0]!);
  }

  async revoke(id: string): Promise<void> {
    await this.request(`api_keys?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ revoked_at: new Date().toISOString() }),
    });
  }

  async usage(record: ApiKeyRecord): Promise<UsageWindow> {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const res = await fetch(
      `${this.url}/rest/v1/api_calls?key_id=eq.${encodeURIComponent(record.id)}&at=gte.${since}&select=key_id`,
      {
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          // `count=exact` renvoie le total en en-tête sans rapatrier les lignes.
          Prefer: "count=exact",
          Range: "0-0",
        },
        cache: "no-store",
      },
    );
    const range = res.headers.get("content-range") ?? "*/0";
    const used = Number(range.split("/")[1] ?? 0);
    return {
      used,
      quota: record.monthlyQuota,
      remaining: Math.max(0, record.monthlyQuota - used),
    };
  }

  async record(call: CallRecord): Promise<void> {
    await this.request("api_calls", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        key_id: call.keyId,
        org_id: call.orgId,
        path: call.path,
        method: call.method,
        status: call.status,
        refusal: call.refusal,
        at: call.at,
      }),
    });
  }

  async touch(id: string, at: string): Promise<void> {
    await this.request(`api_keys?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ last_used_at: at }),
    });
  }
}

export function getApiKeyStore(): ApiKeyStore | ApiKeyStoreUnavailable {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return {
      available: false,
      reason:
        "Les clés d'API supposent une base : définissez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY. " +
        "Sans elles, les routes restent ouvertes et aucune clé n'est reconnue.",
    };
  }
  return new SupabaseApiKeyStore(SUPABASE_URL, SERVICE_KEY);
}

/**
 * Implémentation en mémoire, pour les contrôles.
 *
 * Elle n'existe pas pour faire passer les tests plus vite : elle existe pour
 * que la logique d'authentification soit éprouvée sans base, donc à chaque
 * `npm run check`, y compris sur un poste qui n'a aucune configuration.
 */
export function inMemoryApiKeyStore(seed: readonly ApiKeyRecord[] = []): ApiKeyStore & {
  calls: CallRecord[];
} {
  const keys = new Map(seed.map((k) => [k.fingerprint, { ...k }]));
  const calls: CallRecord[] = [];
  let counter = 0;

  return {
    available: true,
    calls,
    async findByFingerprint(fingerprint) {
      return keys.get(fingerprint) ?? null;
    },
    async create(input) {
      counter += 1;
      const record: ApiKeyRecord = {
        id: `mem-${counter}`,
        orgId: input.orgId,
        label: input.label,
        hint: input.hint,
        fingerprint: input.fingerprint,
        scopes: input.scopes,
        monthlyQuota: input.monthlyQuota,
        createdAt: new Date(0).toISOString(),
        lastUsedAt: null,
        revokedAt: null,
      };
      keys.set(record.fingerprint, record);
      return record;
    },
    async revoke(id) {
      for (const record of keys.values()) {
        if (record.id === id) record.revokedAt = new Date(0).toISOString();
      }
    },
    async usage(record) {
      const used = calls.filter((c) => c.keyId === record.id && c.refusal === null).length;
      return {
        used,
        quota: record.monthlyQuota,
        remaining: Math.max(0, record.monthlyQuota - used),
      };
    },
    async record(call) {
      calls.push(call);
    },
    async touch(id, at) {
      for (const record of keys.values()) {
        if (record.id === id) record.lastUsedAt = at;
      }
    },
  };
}
