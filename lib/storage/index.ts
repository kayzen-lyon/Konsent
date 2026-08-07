import type { Baseline } from "../monitoring/baseline";
import type { Change } from "../monitoring/diff";

/**
 * Couche de persistance.
 *
 * Volontairement optionnelle : sans configuration, l'application fonctionne
 * exactement comme avant et ne conserve rien. C'est le comportement par
 * défaut, et c'est ce qu'annonce la politique de confidentialité pour
 * l'audit libre.
 *
 * La persistance ne sert QUE la surveillance planifiée, à laquelle on
 * s'inscrit explicitement, domaine par domaine, après vérification de sa
 * propriété.
 */

export interface MonitoredDomain {
  id: string;
  hostname: string;
  alertEmail: string;
  verificationToken: string;
  verificationMethod: "dns_txt" | "well_known" | null;
  verifiedAt: string | null;
  frequency: "daily" | "weekly" | "monthly";
  retentionDays: number;
  active: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

export interface ScanHistoryEntry {
  id: string;
  domainId: string;
  scannedAt: string;
  engineMode: "static" | "headless";
  rulepackVersion: string;
  score: number;
  grade: string;
  cappedBy: string | null;
  findingCount: number;
  criticalCount: number;
  vendorCount: number;
  outsideEeaCount: number;
  baseline: Baseline;
}

export interface AlertRecord {
  id: string;
  domainId: string;
  kind: "regression" | "improvement" | "scan_failed";
  regressionCount: number;
  summary: string;
  changes: readonly Change[];
  createdAt: string;
  sentAt: string | null;
}

export interface Storage {
  readonly available: true;
  registerDomain(input: {
    hostname: string;
    alertEmail: string;
    frequency: MonitoredDomain["frequency"];
    retentionDays?: number;
  }): Promise<MonitoredDomain>;
  getDomain(id: string): Promise<MonitoredDomain | null>;
  findDomain(hostname: string, alertEmail: string): Promise<MonitoredDomain | null>;
  markVerified(id: string, method: "dns_txt" | "well_known"): Promise<void>;
  dueDomains(limit: number): Promise<readonly MonitoredDomain[]>;
  recordScan(entry: Omit<ScanHistoryEntry, "id">): Promise<ScanHistoryEntry>;
  latestScan(domainId: string): Promise<ScanHistoryEntry | null>;
  history(domainId: string, limit: number): Promise<readonly ScanHistoryEntry[]>;
  recordAlert(input: Omit<AlertRecord, "id" | "createdAt" | "sentAt">): Promise<void>;
  scheduleNext(id: string, nextRunAt: string): Promise<void>;
  purgeExpired(): Promise<number>;
}

/** Renvoyé quand aucune base n'est configurée. */
export interface NoStorage {
  readonly available: false;
  readonly reason: string;
}

const SUPABASE_URL = process.env["SUPABASE_URL"];
const SERVICE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

/**
 * Client REST minimal. Le SDK Supabase complet n'apporterait rien ici : on
 * effectue une poignée d'opérations, et une dépendance de moins vaut mieux
 * dans un produit qui reproche aux autres d'en charger trop.
 */
class SupabaseStorage implements Storage {
  readonly available = true as const;

  constructor(
    private readonly url: string,
    private readonly key: string,
  ) {}

  private async request<T>(
    path: string,
    init: RequestInit & { returning?: boolean } = {},
  ): Promise<T> {
    const res = await fetch(`${this.url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        ...(init.returning === false ? {} : { Prefer: "return=representation" }),
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

  async registerDomain(input: {
    hostname: string;
    alertEmail: string;
    frequency: MonitoredDomain["frequency"];
    retentionDays?: number;
  }): Promise<MonitoredDomain> {
    const rows = await this.request<Record<string, unknown>[]>("monitored_domains", {
      method: "POST",
      body: JSON.stringify({
        hostname: input.hostname,
        alert_email: input.alertEmail,
        frequency: input.frequency,
        ...(input.retentionDays ? { retention_days: input.retentionDays } : {}),
      }),
    });
    return toDomain(rows[0]!);
  }

  async getDomain(id: string): Promise<MonitoredDomain | null> {
    const rows = await this.request<Record<string, unknown>[]>(
      `monitored_domains?id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findDomain(hostname: string, alertEmail: string): Promise<MonitoredDomain | null> {
    const rows = await this.request<Record<string, unknown>[]>(
      `monitored_domains?hostname=eq.${encodeURIComponent(hostname)}&alert_email=eq.${encodeURIComponent(alertEmail)}&limit=1`,
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async markVerified(id: string, method: "dns_txt" | "well_known"): Promise<void> {
    await this.request(`monitored_domains?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      returning: false,
      body: JSON.stringify({
        verified_at: new Date().toISOString(),
        verification_method: method,
        next_run_at: new Date().toISOString(),
      }),
    });
  }

  async dueDomains(limit: number): Promise<readonly MonitoredDomain[]> {
    const now = new Date().toISOString();
    const rows = await this.request<Record<string, unknown>[]>(
      `monitored_domains?active=is.true&verified_at=not.is.null&next_run_at=lte.${now}&order=next_run_at.asc&limit=${limit}`,
    );
    return rows.map(toDomain);
  }

  async recordScan(entry: Omit<ScanHistoryEntry, "id">): Promise<ScanHistoryEntry> {
    const rows = await this.request<Record<string, unknown>[]>("scan_history", {
      method: "POST",
      body: JSON.stringify({
        domain_id: entry.domainId,
        scanned_at: entry.scannedAt,
        engine_mode: entry.engineMode,
        rulepack_version: entry.rulepackVersion,
        score: entry.score,
        grade: entry.grade,
        capped_by: entry.cappedBy,
        finding_count: entry.findingCount,
        critical_count: entry.criticalCount,
        vendor_count: entry.vendorCount,
        outside_eea_count: entry.outsideEeaCount,
        baseline: entry.baseline,
      }),
    });
    return toHistory(rows[0]!);
  }

  async latestScan(domainId: string): Promise<ScanHistoryEntry | null> {
    const rows = await this.request<Record<string, unknown>[]>(
      `scan_history?domain_id=eq.${encodeURIComponent(domainId)}&order=scanned_at.desc&limit=1`,
    );
    return rows[0] ? toHistory(rows[0]) : null;
  }

  async history(domainId: string, limit: number): Promise<readonly ScanHistoryEntry[]> {
    const rows = await this.request<Record<string, unknown>[]>(
      `scan_history?domain_id=eq.${encodeURIComponent(domainId)}&order=scanned_at.desc&limit=${limit}`,
    );
    return rows.map(toHistory);
  }

  async recordAlert(input: Omit<AlertRecord, "id" | "createdAt" | "sentAt">): Promise<void> {
    await this.request("alerts", {
      method: "POST",
      returning: false,
      body: JSON.stringify({
        domain_id: input.domainId,
        kind: input.kind,
        regression_count: input.regressionCount,
        summary: input.summary,
        changes: input.changes,
      }),
    });
  }

  async scheduleNext(id: string, nextRunAt: string): Promise<void> {
    await this.request(`monitored_domains?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      returning: false,
      body: JSON.stringify({ last_run_at: new Date().toISOString(), next_run_at: nextRunAt }),
    });
  }

  async purgeExpired(): Promise<number> {
    const result = await this.request<number>("rpc/purge_expired_history", {
      method: "POST",
      body: JSON.stringify({}),
    });
    return typeof result === "number" ? result : 0;
  }
}

function toDomain(row: Record<string, unknown>): MonitoredDomain {
  return {
    id: String(row["id"]),
    hostname: String(row["hostname"]),
    alertEmail: String(row["alert_email"]),
    verificationToken: String(row["verification_token"]),
    verificationMethod: (row["verification_method"] as MonitoredDomain["verificationMethod"]) ?? null,
    verifiedAt: (row["verified_at"] as string | null) ?? null,
    frequency: row["frequency"] as MonitoredDomain["frequency"],
    retentionDays: Number(row["retention_days"]),
    active: Boolean(row["active"]),
    lastRunAt: (row["last_run_at"] as string | null) ?? null,
    nextRunAt: (row["next_run_at"] as string | null) ?? null,
    createdAt: String(row["created_at"]),
  };
}

function toHistory(row: Record<string, unknown>): ScanHistoryEntry {
  return {
    id: String(row["id"]),
    domainId: String(row["domain_id"]),
    scannedAt: String(row["scanned_at"]),
    engineMode: row["engine_mode"] as "static" | "headless",
    rulepackVersion: String(row["rulepack_version"]),
    score: Number(row["score"]),
    grade: String(row["grade"]),
    cappedBy: (row["capped_by"] as string | null) ?? null,
    findingCount: Number(row["finding_count"]),
    criticalCount: Number(row["critical_count"]),
    vendorCount: Number(row["vendor_count"]),
    outsideEeaCount: Number(row["outside_eea_count"]),
    baseline: row["baseline"] as Baseline,
  };
}

let cached: Storage | NoStorage | null = null;

/**
 * Renvoie la couche de persistance, ou explique pourquoi elle est absente.
 *
 * L'appelant DOIT gérer le cas indisponible : la surveillance planifiée est
 * une fonctionnalité d'abonnement, pas un prérequis du produit.
 */
export function getStorage(): Storage | NoStorage {
  if (cached) return cached;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    cached = {
      available: false,
      reason:
        "Aucune base de données configurée sur cette instance. La surveillance planifiée et l'historique ne sont pas actifs ; l'audit à la demande fonctionne normalement et ne conserve rien.",
    };
    return cached;
  }

  cached = new SupabaseStorage(SUPABASE_URL.replace(/\/$/, ""), SERVICE_KEY);
  return cached;
}

/** Prochaine échéance, selon la fréquence choisie. */
export function nextRun(frequency: MonitoredDomain["frequency"], from = new Date()): string {
  const days = frequency === "daily" ? 1 : frequency === "weekly" ? 7 : 30;
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}
