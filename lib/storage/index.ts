import { createHash, randomBytes } from "node:crypto";
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
  /**
   * Confirmation de l'adresse d'alerte (double opt-in). Tant qu'elle est
   * nulle, AUCUN courriel n'est envoyé à `alertEmail`.
   */
  alertEmailConfirmedAt: string | null;
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
    /** Vrai seulement si l'adresse est celle du compte connecté. */
    alertEmailConfirmed?: boolean;
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

  /* ---------------------------------------- confirmation de l'adresse */

  /**
   * Pose un nouveau jeton de confirmation (48 h) et le renvoie EN CLAIR, une
   * seule fois, pour le courriel. Seule son empreinte est conservée.
   */
  startAlertConfirmation(domainId: string): Promise<{ token: string; expiresAt: string }>;
  /** Vrai si un jeton non expiré attend déjà : évite de relancer un courriel à chaque appel. */
  hasPendingConfirmation(domainId: string): Promise<boolean>;
  /** Consomme un jeton. Renvoie le domaine confirmé, ou `null` (inconnu ou expiré). */
  confirmAlertEmail(token: string): Promise<MonitoredDomain | null>;
  /** Confirmation directe, quand l'adresse est celle du compte connecté. */
  markAlertEmailConfirmed(domainId: string): Promise<void>;

  /* -------------------------------------------------------- webhooks */

  getWebhook(domainId: string): Promise<AlertWebhook | null>;
  /** Vues sans secret. Une liste vide ne renvoie rien. */
  webhooksFor(domainIds: readonly string[]): Promise<readonly AlertWebhookView[]>;
  /** Crée ou remplace. Un nouveau secret est généré à chaque fois et renvoyé une fois. */
  setWebhook(domainId: string, url: string, kind: WebhookKind): Promise<{ secret: string }>;
  deleteWebhook(domainId: string): Promise<void>;
  recordWebhookAttempt(domainId: string, status: string): Promise<void>;

  /* --------------------------------------------------- plan d'action */

  /** Une liste vide ne renvoie rien. */
  actionItems(domainIds: readonly string[]): Promise<readonly ActionItem[]>;
  saveActionItem(input: {
    domainId: string;
    ruleId: string;
    status: ActionItem["status"];
    note: string;
  }): Promise<ActionItem>;
}

export type WebhookKind = "slack" | "teams" | "generic";

export interface AlertWebhook {
  domainId: string;
  url: string;
  kind: WebhookKind;
  secret: string;
  createdAt: string;
  lastAttemptAt: string | null;
  lastStatus: string | null;
}

/** Ce qui peut être montré ou exporté : jamais le secret. */
export type AlertWebhookView = Omit<AlertWebhook, "secret">;

export interface ActionItem {
  domainId: string;
  ruleId: string;
  status: "open" | "fixed";
  note: string;
  /** Date de la déclaration « corrigé », confrontée à l'analyse suivante. */
  fixedAt: string | null;
  updatedAt: string;
}

/** Validité d'un lien de confirmation d'adresse d'alerte. */
export const ALERT_CONFIRM_TTL_HOURS = 48;

export interface MonitoringExport {
  domains: readonly Omit<MonitoredDomain, "verificationToken">[];
  history: readonly ScanHistoryEntry[];
  alerts: readonly AlertRecord[];
  webhooks: readonly AlertWebhookView[];
  actionItems: readonly ActionItem[];
}

/** Empreinte d'un jeton de confirmation : aléa de 256 bits, SHA-256 sans sel suffit. */
function confirmFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex");
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
    alertEmailConfirmed?: boolean;
  }): Promise<MonitoredDomain> {
    const confirmedAt = input.alertEmailConfirmed ? new Date().toISOString() : null;
    const rows = await this.sql`
      insert into monitored_domains (
        hostname, alert_email, frequency, retention_days, account_id, alert_email_confirmed_at)
      values (${input.hostname}, ${input.alertEmail}, ${input.frequency},
              ${input.retentionDays ?? 395}, ${input.accountId ?? null}, ${confirmedAt})
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
    // Webhooks et plan d'action : bornés aux domaines lus ci-dessus, donc au
    // compte. Le secret de signature n'est pas exporté (`webhooksFor` ne le
    // sélectionne pas) : c'est un moyen d'authentifier, pas une donnée.
    const ids = domains.map((row) => String(row["id"]));
    const [webhooks, actionItems] = await Promise.all([
      this.webhooksFor(ids),
      this.actionItems(ids),
    ]);
    return {
      domains: domains.map((row) => {
        const { verificationToken: _omitted, ...rest } = toDomain(row);
        return rest;
      }),
      history: history.map(toHistory),
      alerts: alerts.map(toAlert),
      webhooks,
      actionItems,
    };
  }

  async startAlertConfirmation(domainId: string): Promise<{ token: string; expiresAt: string }> {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + ALERT_CONFIRM_TTL_HOURS * 3_600_000).toISOString();
    await this.sql`
      update monitored_domains
      set alert_confirm_hash = ${confirmFingerprint(token)}, alert_confirm_expires_at = ${expiresAt}
      where id = ${domainId} and alert_email_confirmed_at is null`;
    return { token, expiresAt };
  }

  async hasPendingConfirmation(domainId: string): Promise<boolean> {
    const rows = await this.sql`
      select 1 from monitored_domains
      where id = ${domainId} and alert_confirm_hash is not null
        and alert_confirm_expires_at > now() limit 1`;
    return rows.length > 0;
  }

  async confirmAlertEmail(token: string): Promise<MonitoredDomain | null> {
    // Usage unique : l'empreinte est effacée dans la même requête.
    const rows = await this.sql`
      update monitored_domains
      set alert_email_confirmed_at = now(), alert_confirm_hash = null,
          alert_confirm_expires_at = null
      where alert_confirm_hash = ${confirmFingerprint(token)}
        and alert_confirm_expires_at > now()
      returning *`;
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async markAlertEmailConfirmed(domainId: string): Promise<void> {
    await this.sql`
      update monitored_domains
      set alert_email_confirmed_at = coalesce(alert_email_confirmed_at, now()),
          alert_confirm_hash = null, alert_confirm_expires_at = null
      where id = ${domainId}`;
  }

  async getWebhook(domainId: string): Promise<AlertWebhook | null> {
    const rows = await this.sql`
      select domain_id, url, kind, secret, created_at, last_attempt_at, last_status
      from alert_webhooks where domain_id = ${domainId} limit 1`;
    const row = rows[0];
    return row ? { ...toWebhookView(row), secret: String(row["secret"]) } : null;
  }

  async webhooksFor(domainIds: readonly string[]): Promise<readonly AlertWebhookView[]> {
    if (domainIds.length === 0) return [];
    const rows = await this.sql`
      select domain_id, url, kind, created_at, last_attempt_at, last_status
      from alert_webhooks where domain_id = any(${[...domainIds]}::uuid[])`;
    return rows.map(toWebhookView);
  }

  async setWebhook(domainId: string, url: string, kind: WebhookKind): Promise<{ secret: string }> {
    const secret = `whsec_${randomBytes(32).toString("base64url")}`;
    await this.sql`
      insert into alert_webhooks (domain_id, url, kind, secret)
      values (${domainId}, ${url}, ${kind}, ${secret})
      on conflict (domain_id) do update
        set url = excluded.url, kind = excluded.kind, secret = excluded.secret,
            updated_at = now(), last_attempt_at = null, last_status = null`;
    return { secret };
  }

  async deleteWebhook(domainId: string): Promise<void> {
    await this.sql`delete from alert_webhooks where domain_id = ${domainId}`;
  }

  async recordWebhookAttempt(domainId: string, status: string): Promise<void> {
    await this.sql`
      update alert_webhooks set last_attempt_at = now(), last_status = ${status.slice(0, 200)}
      where domain_id = ${domainId}`;
  }

  async actionItems(domainIds: readonly string[]): Promise<readonly ActionItem[]> {
    if (domainIds.length === 0) return [];
    const rows = await this.sql`
      select domain_id, rule_id, status, note, fixed_at, updated_at
      from action_items where domain_id = any(${[...domainIds]}::uuid[])
      order by domain_id, rule_id`;
    return rows.map(toActionItem);
  }

  async saveActionItem(input: {
    domainId: string;
    ruleId: string;
    status: ActionItem["status"];
    note: string;
  }): Promise<ActionItem> {
    // `fixed_at` garde la date de la PREMIÈRE déclaration « corrigé » : c'est
    // elle que l'analyse suivante confronte à ce qu'elle observe.
    const rows = await this.sql`
      insert into action_items (domain_id, rule_id, status, note, fixed_at)
      values (${input.domainId}, ${input.ruleId}, ${input.status}, ${input.note},
              ${input.status === "fixed" ? new Date().toISOString() : null})
      on conflict (domain_id, rule_id) do update
        set status = excluded.status,
            note = excluded.note,
            fixed_at = case
              when excluded.status = 'fixed' then coalesce(action_items.fixed_at, excluded.fixed_at)
              else null end,
            updated_at = now()
      returning domain_id, rule_id, status, note, fixed_at, updated_at`;
    return toActionItem(rows[0]!);
  }
}

function toWebhookView(row: Record<string, unknown>): AlertWebhookView {
  return {
    domainId: String(row["domain_id"]),
    url: String(row["url"]),
    kind: row["kind"] as WebhookKind,
    createdAt: iso(row["created_at"]),
    lastAttemptAt: isoOrNull(row["last_attempt_at"]),
    lastStatus: (row["last_status"] as string | null) ?? null,
  };
}

function toActionItem(row: Record<string, unknown>): ActionItem {
  return {
    domainId: String(row["domain_id"]),
    ruleId: String(row["rule_id"]),
    status: row["status"] === "fixed" ? "fixed" : "open",
    note: String(row["note"] ?? ""),
    fixedAt: isoOrNull(row["fixed_at"]),
    updatedAt: iso(row["updated_at"]),
  };
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
    alertEmailConfirmedAt: isoOrNull(row["alert_email_confirmed_at"]),
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
