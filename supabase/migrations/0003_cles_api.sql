-- Clés d'API, quotas et journal d'appels.
--
-- Mêmes principes que la migration des comptes, pour les mêmes raisons :
--
--  * RLS activé, aucune politique. Les deux tables sont fermées à tout rôle
--    autre que `service_role`. Une clé d'API lisible par le rôle anonyme
--    serait une porte ouverte sur toutes les clés de tous les clients.
--
--  * Aucun secret en clair. Seule l'empreinte SHA-256 de la clé est stockée,
--    comme pour les jetons de connexion. Une fuite de la base ne livre aucune
--    clé utilisable. La contrepartie — une clé perdue se remplace, elle ne se
--    retrouve pas — est dite à l'utilisateur au moment où la clé s'affiche.
--
--  * Le journal est en AJOUT SEUL. Un journal d'audit qu'on peut réécrire ne
--    prouve rien, et c'est précisément ce que Konsent exige de ses clients.

create table if not exists public.api_keys (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.accounts (id) on delete cascade,
  label         text not null,
  -- Douze premiers caractères, en clair. Ne révèle rien — le secret suit —
  -- mais permet de reconnaître une clé dans une liste, et de repérer une clé
  -- collée par erreur dans un ticket ou un dépôt public.
  hint          text not null,
  -- Empreinte SHA-256 hexadécimale. Jamais la clé.
  fingerprint   text not null unique,
  -- Moindre privilège : une clé ne porte que les portées qu'on lui donne.
  scopes        text[] not null default '{}',
  monthly_quota integer not null default 1000 check (monthly_quota >= 0),
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

create index if not exists api_keys_org_idx on public.api_keys (org_id);
-- La recherche se fait TOUJOURS par empreinte, jamais par indice : l'index
-- unique sur `fingerprint` est le chemin d'accès normal.
create index if not exists api_keys_active_idx on public.api_keys (revoked_at)
  where revoked_at is null;

create table if not exists public.api_calls (
  id       bigserial primary key,
  -- Nul pour un appel refusé dont la clé n'a pas été reconnue : on journalise
  -- le refus sans pouvoir l'attribuer, plutôt que de ne rien écrire.
  key_id   uuid references public.api_keys (id) on delete set null,
  org_id   uuid references public.accounts (id) on delete set null,
  path     text not null,
  method   text not null,
  status   integer not null,
  -- Motif du refus. Le journal doit dire pourquoi, pas seulement quoi.
  refusal  text,
  at       timestamptz not null default now()
);

-- Le quota est une fenêtre glissante de 30 jours : c'est ce couple qui est
-- interrogé à chaque appel authentifié.
create index if not exists api_calls_key_at_idx on public.api_calls (key_id, at desc);
create index if not exists api_calls_at_idx on public.api_calls (at);

-- Journal non réécrivable, mais purgeable.
--
-- Deux exigences qui se contredisent en apparence. Un journal d'audit qu'on
-- peut réécrire ne prouve rien — c'est ce que Konsent exige de ses clients.
-- Mais un journal qu'on ne peut jamais purger conserve indéfiniment des
-- données d'usage, ce que l'article 5(1)(e) interdit et que le produit
-- reproche aux autres.
--
-- L'arbitrage : UPDATE toujours refusé, DELETE autorisé au seul titre de la
-- purge, c'est-à-dire sur des lignes sorties de la fenêtre de conservation.
-- Une ligne récente ne peut donc pas être effacée pour dissimuler un appel.
create or replace function public.konsent_api_calls_immutable()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'api_calls est en ajout seul : la réécriture est interdite.';
  end if;
  if old.at > now() - interval '400 days' then
    raise exception
      'api_calls : suppression refusée sur une ligne de moins de 400 jours (purge uniquement).';
  end if;
  return old;
end;
$$;

drop trigger if exists api_calls_no_update on public.api_calls;
create trigger api_calls_no_update
  before update or delete on public.api_calls
  for each row execute function public.konsent_api_calls_immutable();

-- Purge de la fenêtre de conservation. Alignée sur les 395 jours annoncés pour
-- la surveillance, avec la marge que le déclencheur ci-dessus impose.
create or replace function public.konsent_purge_api_calls()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.api_calls where at < now() - interval '400 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- SECURITY DEFINER : contourne RLS, donc jamais appelable par un rôle public.
-- C'est la faille relevée par l'auditeur Supabase sur la purge de surveillance.
revoke execute on function public.konsent_purge_api_calls() from public;
revoke execute on function public.konsent_purge_api_calls() from anon;
revoke execute on function public.konsent_purge_api_calls() from authenticated;
grant  execute on function public.konsent_purge_api_calls() to service_role;

alter table public.api_keys  enable row level security;
alter table public.api_calls enable row level security;

-- Aucune politique créée, volontairement : RLS actif sans politique ferme la
-- table à tout rôle autre que service_role.
