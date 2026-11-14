import type { ApiKeyRecord } from "./keys";
import type { Scope } from "./registry";
import { dbConfigured, getSql, iso, isoOrNull, type Sql } from "../db";

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


function toRecord(row: Record<string, unknown>): ApiKeyRecord {
  return {
    id: String(row["id"]),
    orgId: String(row["org_id"]),
    label: String(row["label"] ?? ""),
    hint: String(row["hint"] ?? ""),
    fingerprint: String(row["fingerprint"]),
    scopes: (row["scopes"] as Scope[] | null) ?? [],
    monthlyQuota: Number(row["monthly_quota"] ?? 0),
    createdAt: iso(row["created_at"]),
    lastUsedAt: isoOrNull(row["last_used_at"]),
    revokedAt: isoOrNull(row["revoked_at"]),
  };
}

class PostgresApiKeyStore implements ApiKeyStore {
  readonly available = true as const;

  constructor(private readonly sql: Sql) {}

  async findByFingerprint(fingerprint: string): Promise<ApiKeyRecord | null> {
    const rows = await this.sql`select * from api_keys where fingerprint = ${fingerprint} limit 1`;
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
    const rows = await this.sql`
      insert into api_keys (org_id, label, hint, fingerprint, scopes, monthly_quota)
      values (${input.orgId}, ${input.label}, ${input.hint}, ${input.fingerprint},
              ${[...input.scopes]}::text[], ${input.monthlyQuota})
      returning *`;
    return toRecord(rows[0]!);
  }

  async revoke(id: string): Promise<void> {
    await this.sql`update api_keys set revoked_at = now() where id = ${id}`;
  }

  async usage(record: ApiKeyRecord): Promise<UsageWindow> {
    const rows = await this.sql`
      select count(*)::int as used from api_calls
      where key_id = ${record.id} and at >= now() - interval '30 days'`;
    const used = Number(rows[0]?.["used"] ?? 0);
    return {
      used,
      quota: record.monthlyQuota,
      remaining: Math.max(0, record.monthlyQuota - used),
    };
  }

  async record(call: CallRecord): Promise<void> {
    await this.sql`
      insert into api_calls (key_id, org_id, path, method, status, refusal, at)
      values (${call.keyId}, ${call.orgId}, ${call.path}, ${call.method}, ${call.status},
              ${call.refusal}, ${call.at})`;
  }

  async touch(id: string, at: string): Promise<void> {
    await this.sql`update api_keys set last_used_at = ${at} where id = ${id}`;
  }
}

export function getApiKeyStore(): ApiKeyStore | ApiKeyStoreUnavailable {
  if (!dbConfigured()) {
    return {
      available: false,
      reason:
        "Les clés d'API supposent une base : définissez DATABASE_URL. " +
        "Sans elle, les routes restent ouvertes et aucune clé n'est reconnue.",
    };
  }
  return new PostgresApiKeyStore(getSql());
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
