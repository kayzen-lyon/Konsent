import type { Baseline } from "../monitoring/baseline";
import type { Change } from "../monitoring/diff";
import { dbConfigured, getSql, iso, isoOrNull, type Sql } from "../db";

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
  /**
   * Compte propriétaire.
   *
   * `null` pour les inscriptions faites sans session — elles restent servies
   * par courriel, comme avant, mais n'apparaissent dans AUCUN portefeuille.
   * Une ressource sans propriétaire n'est accessible à personne : c'est la
   * règle posée dans `lib/agency/tenancy.ts`, et la valeur par défaut la
   * respecte plutôt que de l'entamer.
   */
  accountId: string | null;
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
    /** Propriétaire. Omis pour une inscription sans session. */
    accountId?: string | null;
  }): Promise<MonitoredDomain>;
  /**
   * Domaines appartenant aux comptes donnés.
   *
   * La liste d'identifiants vient de `visibleAccountIds` et de nulle part
   * ailleurs : c'est ce qui garantit qu'une agence ne lit que ses clients.
   * Une liste vide ne renvoie rien — surtout pas « tout ».
   */
  domainsForAccounts(accountIds: readonly string[]): Promise<readonly MonitoredDomain[]>;
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
  /** Nombre d'alertes par domaine. Une liste vide ne renvoie rien. */
  alertCounts(domainIds: readonly string[]): Promise<Readonly<Record<string, number>>>;
  /**
   * Tout ce que la surveillance détient pour un compte (art. 20 RGPD) :
   * domaines, historique complet, alertes. Le jeton de vérification de
   * propriété n'est pas exporté : c'est un secret de procédure, pas une
   * donnée de la personne.
   */
  exportForAccount(accountId: string): Promise<MonitoringExport>;
}

export interface MonitoringExport {
  domains: readonly Omit<MonitoredDomain, "verificationToken">[];
  history: readonly ScanHistoryEntry[];
  alerts: readonly AlertRecord[];
}

/** Renvoyé quand aucune base n'est configurée. */
export interface NoStorage {
  readonly available: false;
  readonly reason: string;
}

class PostgresStorage implements Storage {
  readonly available = true as const;

  constructor(private readonly sql: Sql) {}

  async registerDomain(input: {
    hostname: string;
    alertEmail: string;
    frequency: MonitoredDomain["frequency"];
    retentionDays?: number;
    accountId?: string | null;
  }): Promise<MonitoredDomain> {
    const rows = await this.sql`
      insert into monitored_domains (hostname, alert_email, frequency, retention_days, account_id)
      values (${input.hostname}, ${input.alertEmail}, ${input.frequency},
              ${input.retentionDays ?? 395}, ${input.accountId ?? null})
      returning *`;
    return toDomain(rows[0]!);
  }

  async domainsForAccounts(accountIds: readonly string[]): Promise<readonly MonitoredDomain[]> {
    // Une liste vide ne doit RIEN renvoyer — surtout pas la table entière.
    if (accountIds.length === 0) return [];
    const rows = await this.sql`
      select * from monitored_domains
      where account_id = any(${[...accountIds]}::uuid[])
      order by hostname asc`;
    return rows.map(toDomain);
  }

  async getDomain(id: string): Promise<MonitoredDomain | null> {
    const rows = await this.sql`select * from monitored_domains where id = ${id} limit 1`;
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findDomain(hostname: string, alertEmail: string): Promise<MonitoredDomain | null> {
    const rows = await this.sql`
      select * from monitored_domains
      where hostname = ${hostname} and alert_email = ${alertEmail} limit 1`;
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async markVerified(id: string, method: "dns_txt" | "well_known"): Promise<void> {
    await this.sql`
      update monitored_domains
      set verified_at = now(), verification_method = ${method}, next_run_at = now()
      where id = ${id}`;
  }

  async dueDomains(limit: number): Promise<readonly MonitoredDomain[]> {
    const rows = await this.sql`
      select * from monitored_domains
      where active and verified_at is not null and next_run_at <= now()
      order by next_run_at asc limit ${limit}`;
    return rows.map(toDomain);
  }

  async recordScan(entry: Omit<ScanHistoryEntry, "id">): Promise<ScanHistoryEntry> {
    const rows = await this.sql`
      insert into scan_history (
        domain_id, scanned_at, engine_mode, rulepack_version, score, grade, capped_by,
        finding_count, critical_count, vendor_count, outside_eea_count, baseline)
      values (
        ${entry.domainId}, ${entry.scannedAt}, ${entry.engineMode}, ${entry.rulepackVersion},
        ${entry.score}, ${entry.grade}, ${entry.cappedBy}, ${entry.findingCount},
        ${entry.criticalCount}, ${entry.vendorCount}, ${entry.outsideEeaCount},
        ${JSON.stringify(entry.baseline)}::jsonb)
      returning *`;
    return toHistory(rows[0]!);
  }

  async latestScan(domainId: string): Promise<ScanHistoryEntry | null> {
    const rows = await this.sql`
      select * from scan_history where domain_id = ${domainId}
      order by scanned_at desc limit 1`;
    return rows[0] ? toHistory(rows[0]) : null;
  }

  async history(domainId: string, limit: number): Promise<readonly ScanHistoryEntry[]> {
    const rows = await this.sql`
      select * from scan_history where domain_id = ${domainId}
      order by scanned_at desc limit ${limit}`;
    return rows.map(toHistory);
  }

  async recordAlert(input: Omit<AlertRecord, "id" | "createdAt" | "sentAt">): Promise<void> {
    await this.sql`
      insert into alerts (domain_id, kind, regression_count, summary, changes)
      values (${input.domainId}, ${input.kind}, ${input.regressionCount}, ${input.summary},
              ${JSON.stringify(input.changes)}::jsonb)`;
  }

  async scheduleNext(id: string, nextRunAt: string): Promise<void> {
    await this.sql`
      update monitored_domains set last_run_at = now(), next_run_at = ${nextRunAt}
      where id = ${id}`;
  }

  async purgeExpired(): Promise<number> {
    const rows = await this.sql`select purge_expired_history() as removed`;
    return Number(rows[0]?.["removed"] ?? 0);
  }

  async alertCounts(domainIds: readonly string[]): Promise<Readonly<Record<string, number>>> {
    if (domainIds.length === 0) return {};
    const rows = await this.sql`
      select domain_id, count(*)::int as n from alerts
      where domain_id = any(${[...domainIds]}::uuid[])
      group by domain_id`;
    return Object.fromEntries(rows.map((r) => [String(r["domain_id"]), Number(r["n"])]));
  }

  async exportForAccount(accountId: string): Promise<MonitoringExport> {
    const [domains, history, alerts] = await Promise.all([
      this.sql`select * from monitored_domains where account_id = ${accountId} order by hostname asc`,
      this.sql`
        select h.* from scan_history h join monitored_domains d on d.id = h.domain_id
        where d.account_id = ${accountId} order by h.scanned_at asc`,
      this.sql`
        select a.* from alerts a join monitored_domains d on d.id = a.domain_id
        where d.account_id = ${accountId} order by a.created_at asc`,
    ]);
    return {
      domains: domains.map((row) => {
        const { verificationToken: _omitted, ...rest } = toDomain(row);
        return rest;
      }),
      history: history.map(toHistory),
      alerts: alerts.map(toAlert),
    };
  }
}

function toAlert(row: Record<string, unknown>): AlertRecord {
  return {
    id: String(row["id"]),
    domainId: String(row["domain_id"]),
    kind: row["kind"] as AlertRecord["kind"],
    regressionCount: Number(row["regression_count"]),
    summary: String(row["summary"]),
    changes: (row["changes"] as readonly Change[] | null) ?? [],
    createdAt: iso(row["created_at"]),
    sentAt: isoOrNull(row["sent_at"]),
  };
}

function toDomain(row: Record<string, unknown>): MonitoredDomain {
  return {
    id: String(row["id"]),
    hostname: String(row["hostname"]),
    accountId: (row["account_id"] as string | null) ?? null,
    alertEmail: String(row["alert_email"]),
    verificationToken: String(row["verification_token"]),
    verificationMethod: (row["verification_method"] as MonitoredDomain["verificationMethod"]) ?? null,
    verifiedAt: isoOrNull(row["verified_at"]),
    frequency: row["frequency"] as MonitoredDomain["frequency"],
    retentionDays: Number(row["retention_days"]),
    active: Boolean(row["active"]),
    lastRunAt: isoOrNull(row["last_run_at"]),
    nextRunAt: isoOrNull(row["next_run_at"]),
    createdAt: iso(row["created_at"]),
  };
}

function toHistory(row: Record<string, unknown>): ScanHistoryEntry {
  return {
    id: String(row["id"]),
    domainId: String(row["domain_id"]),
    scannedAt: iso(row["scanned_at"]),
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

  if (!dbConfigured()) {
    cached = {
      available: false,
      reason:
        "Aucune base de données configurée sur cette instance. La surveillance planifiée et l'historique ne sont pas actifs ; l'audit à la demande fonctionne normalement et ne conserve rien.",
    };
    return cached;
  }

  cached = new PostgresStorage(getSql());
  return cached;
}

/** Prochaine échéance, selon la fréquence choisie. */
export function nextRun(frequency: MonitoredDomain["frequency"], from = new Date()): string {
  const days = frequency === "daily" ? 1 : frequency === "weekly" ? 7 : 30;
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}
