-- Schéma complet de Konsent — Postgres (Neon, région Francfort).
--
-- Remplace les migrations Supabase (supabase/migrations/0002 à 0005), qu'il
-- reprend en un seul fichier IDEMPOTENT : il peut être rejoué sans risque
-- (`npm run db:schema`). Il versionne aussi, pour la première fois, les
-- tables de surveillance (`monitored_domains`, `scan_history`, `alerts`) dont
-- la migration 0001 n'avait jamais été commitée.
--
-- Principes, inchangés :
--  * Aucun secret en clair : jetons, sessions et clés d'API ne sont stockés
--    que sous forme d'empreinte SHA-256.
--  * Les durées de vie sont portées par les lignes et purgées.
--  * La base pose ses propres verrous (pas d'imbrication des sous-comptes,
--    journal d'appels non réécrivable) au cas où un appelant les oublierait.
--  * Accès : la base n'est jointe QUE par le serveur, avec la chaîne de
--    connexion de l'environnement. Aucune API publique (pas d'équivalent de
--    la clé « anon » de Supabase) : les fonctions sont retirées à PUBLIC.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────── Comptes

create table if not exists accounts (
  id                     uuid primary key default gen_random_uuid(),
  email                  text not null unique,
  plan                   text not null default 'libre'
                         check (plan in ('libre', 'starter', 'pro', 'agence')),
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  -- Agence de rattachement (un seul niveau), et invitation en attente.
  parent_id              uuid references accounts (id) on delete set null,
  invited_parent_id      uuid references accounts (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint accounts_parent_not_self check (parent_id is null or parent_id <> id),
  constraint accounts_invited_not_self check (invited_parent_id is null or invited_parent_id <> id)
);

create index if not exists accounts_parent_idx on accounts (parent_id);
create index if not exists accounts_invited_parent_idx on accounts (invited_parent_id);

create table if not exists login_tokens (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists login_tokens_expires_idx on login_tokens (expires_at);

create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts (id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists sessions_expires_idx on sessions (expires_at);
create index if not exists sessions_account_idx on sessions (account_id);

-- Cloisonnement sur un seul niveau, imposé par la base.
create or replace function konsent_no_nested_subaccounts()
returns trigger
language plpgsql
as $$
declare
  grandparent uuid;
  has_children boolean;
begin
  if new.parent_id is null then
    return new;
  end if;
  select parent_id into grandparent from accounts where id = new.parent_id;
  if grandparent is not null then
    raise exception
      'Cloisonnement sur un seul niveau : % est déjà rattaché à une agence.', new.parent_id;
  end if;
  select exists (select 1 from accounts where parent_id = new.id) into has_children;
  if has_children then
    raise exception 'Ce compte porte déjà des sous-comptes : il ne peut pas être rattaché.';
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_no_nesting on accounts;
create trigger accounts_no_nesting
  before insert or update of parent_id on accounts
  for each row execute function konsent_no_nested_subaccounts();

-- ─────────────────────────────────────────────────────────── Clés d'API

create table if not exists api_keys (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references accounts (id) on delete cascade,
  label         text not null,
  hint          text not null,
  fingerprint   text not null unique,
  scopes        text[] not null default '{}',
  monthly_quota integer not null default 1000 check (monthly_quota >= 0),
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);
create index if not exists api_keys_org_idx on api_keys (org_id);
create index if not exists api_keys_active_idx on api_keys (revoked_at) where revoked_at is null;

create table if not exists api_calls (
  id       bigserial primary key,
  key_id   uuid references api_keys (id) on delete set null,
  org_id   uuid references accounts (id) on delete set null,
  path     text not null,
  method   text not null,
  status   integer not null,
  refusal  text,
  at       timestamptz not null default now()
);
create index if not exists api_calls_key_at_idx on api_calls (key_id, at desc);
create index if not exists api_calls_at_idx on api_calls (at);

-- Journal en ajout seul : jamais réécrit, purgé seulement hors fenêtre.
create or replace function konsent_api_calls_immutable()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    -- Seule exception : la suppression d'un compte ou d'une clé met
    -- key_id / org_id à NULL (on delete set null). Sans elle, effacer un
    -- compte — droit à l'effacement, article 17 du RGPD — serait impossible.
    -- Toute autre modification reste refusée.
    if (new.key_id is null or new.key_id is not distinct from old.key_id)
       and (new.org_id is null or new.org_id is not distinct from old.org_id)
       and new.path = old.path and new.method = old.method and new.status = old.status
       and new.refusal is not distinct from old.refusal and new.at = old.at then
      return new;
    end if;
    raise exception 'api_calls est en ajout seul : la réécriture est interdite.';
  end if;
  if old.at > now() - interval '400 days' then
    raise exception
      'api_calls : suppression refusée sur une ligne de moins de 400 jours (purge uniquement).';
  end if;
  return old;
end;
$$;

drop trigger if exists api_calls_no_update on api_calls;
create trigger api_calls_no_update
  before update or delete on api_calls
  for each row execute function konsent_api_calls_immutable();

-- ─────────────────────────────────────────────────────────── Surveillance

create table if not exists monitored_domains (
  id                  uuid primary key default gen_random_uuid(),
  hostname            text not null,
  account_id          uuid references accounts (id) on delete cascade,
  alert_email         text not null,
  -- Jeton à publier (DNS TXT ou /.well-known) pour prouver la propriété.
  verification_token  text not null default encode(gen_random_bytes(16), 'hex'),
  verification_method text check (verification_method in ('dns_txt', 'well_known')),
  verified_at         timestamptz,
  frequency           text not null default 'weekly'
                      check (frequency in ('daily', 'weekly', 'monthly')),
  -- 395 jours : treize mois, la durée annoncée dans la politique de
  -- confidentialité pour l'historique de surveillance.
  retention_days      integer not null default 395 check (retention_days between 1 and 395),
  active              boolean not null default true,
  last_run_at         timestamptz,
  next_run_at         timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists monitored_domains_due_idx
  on monitored_domains (next_run_at) where active and verified_at is not null;
create index if not exists monitored_domains_account_idx on monitored_domains (account_id);
create unique index if not exists monitored_domains_account_host_idx
  on monitored_domains (account_id, hostname) where account_id is not null;
create index if not exists monitored_domains_host_email_idx
  on monitored_domains (hostname, alert_email);

create table if not exists scan_history (
  id                uuid primary key default gen_random_uuid(),
  domain_id         uuid not null references monitored_domains (id) on delete cascade,
  scanned_at        timestamptz not null default now(),
  engine_mode       text not null check (engine_mode in ('static', 'headless')),
  rulepack_version  text not null,
  score             integer not null,
  grade             text not null,
  capped_by         text,
  finding_count     integer not null default 0,
  critical_count    integer not null default 0,
  vendor_count      integer not null default 0,
  outside_eea_count integer not null default 0,
  baseline          jsonb not null
);
create index if not exists scan_history_domain_idx on scan_history (domain_id, scanned_at desc);

create table if not exists alerts (
  id               uuid primary key default gen_random_uuid(),
  domain_id        uuid not null references monitored_domains (id) on delete cascade,
  kind             text not null check (kind in ('regression', 'improvement', 'scan_failed')),
  regression_count integer not null default 0,
  summary          text not null,
  changes          jsonb not null default '[]',
  created_at       timestamptz not null default now(),
  sent_at          timestamptz
);
create index if not exists alerts_domain_idx on alerts (domain_id, created_at desc);

-- Purge de l'historique au-delà de la durée de conservation de chaque domaine.
create or replace function purge_expired_history()
returns integer
language plpgsql
as $$
declare
  removed integer := 0;
  n integer;
begin
  delete from scan_history h
    using monitored_domains d
    where h.domain_id = d.id
      and h.scanned_at < now() - make_interval(days => d.retention_days);
  get diagnostics n = row_count;
  removed := removed + n;

  delete from alerts a
    using monitored_domains d
    where a.domain_id = d.id
      and a.created_at < now() - make_interval(days => d.retention_days);
  get diagnostics n = row_count;
  removed := removed + n;

  delete from api_calls where at < now() - interval '400 days';
  get diagnostics n = row_count;
  return removed + n;
end;
$$;

-- Aucune fonction n'est appelable par un rôle public.
revoke all on function purge_expired_history() from public;
revoke all on function konsent_api_calls_immutable() from public;
revoke all on function konsent_no_nested_subaccounts() from public;

-- ═══════════════════════════════════════════ limitation de débit ═══════════
-- Fenêtre fixe par (seau, début de fenêtre). Le seau est « règle:empreinte »,
-- l'empreinte étant un HMAC journalier de l'IP ou de l'adresse : aucune donnée
-- en clair. Lignes purgées après deux jours (voir purge_expired_history).
create table if not exists rate_limits (
  bucket       text not null,
  window_start timestamptz not null,
  count        integer not null default 1,
  primary key (bucket, window_start)
);
create index if not exists rate_limits_window_idx on rate_limits (window_start);

-- Redéfinie ici pour y ajouter la purge des compteurs de débit.
create or replace function purge_expired_history()
returns integer
language plpgsql
as $$
declare
  removed integer := 0;
  n integer;
begin
  delete from scan_history h
    using monitored_domains d
    where h.domain_id = d.id
      and h.scanned_at < now() - make_interval(days => d.retention_days);
  get diagnostics n = row_count;
  removed := removed + n;

  delete from alerts a
    using monitored_domains d
    where a.domain_id = d.id
      and a.created_at < now() - make_interval(days => d.retention_days);
  get diagnostics n = row_count;
  removed := removed + n;

  delete from api_calls where at < now() - interval '400 days';
  get diagnostics n = row_count;
  removed := removed + n;

  delete from rate_limits where window_start < now() - interval '2 days';
  get diagnostics n = row_count;
  return removed + n;
end;
$$;

revoke all on function purge_expired_history() from public;
