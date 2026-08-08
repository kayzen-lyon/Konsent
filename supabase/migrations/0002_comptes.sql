-- Comptes, liens de connexion et sessions.
--
-- Principes appliqués, dans la continuité de la migration de surveillance :
--
--  * RLS activé sur les trois tables, SANS aucune politique permissive. La clé
--    publique ne lit ni n'écrit rien. Tout passe par le serveur, avec la clé de
--    service. Une table sans politique et avec RLS actif est fermée par défaut,
--    ce qui est exactement l'effet recherché.
--
--  * Aucun secret en clair. Les jetons de connexion et de session ne sont
--    stockés que sous forme d'empreinte SHA-256. Une fuite de la base ne permet
--    de se connecter à aucun compte.
--
--  * Les durées de vie sont portées par les lignes elles-mêmes et purgées. Une
--    durée annoncée mais non appliquée est précisément le manquement que le
--    produit relève chez les autres.

create table if not exists public.accounts (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  plan        text not null default 'libre'
              check (plan in ('libre', 'starter', 'pro', 'agence')),
  -- Rattachement à l'abonnement Stripe, renseigné par le webhook. Nul tant
  -- qu'aucun paiement n'a eu lieu.
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Liens de connexion à usage unique.
create table if not exists public.login_tokens (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  -- Empreinte SHA-256 en hexadécimal. Jamais le jeton.
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  -- Marqué à la consommation. Un jeton déjà utilisé ne revaut plus rien, même
  -- avant expiration.
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists login_tokens_expires_idx on public.login_tokens (expires_at);

create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts (id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists sessions_expires_idx on public.sessions (expires_at);
create index if not exists sessions_account_idx on public.sessions (account_id);

-- Création ou récupération d'un compte, sans révéler lequel des deux a eu lieu.
-- Renvoyer « ce compte existe déjà » donnerait un moyen de tester si une
-- adresse est cliente.
create or replace function public.konsent_upsert_account(p_email text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.accounts (email)
  values (lower(trim(p_email)))
  on conflict (email) do update set updated_at = now();
$$;

-- La fonction est en SECURITY DEFINER : elle contourne donc RLS. Elle ne doit
-- pas être appelable par le rôle anonyme via l'API REST. C'est exactement la
-- faille relevée par l'auditeur Supabase sur la fonction de purge lors de la
-- mise en place de la surveillance.
revoke execute on function public.konsent_upsert_account(text) from public;
revoke execute on function public.konsent_upsert_account(text) from anon;
revoke execute on function public.konsent_upsert_account(text) from authenticated;
grant  execute on function public.konsent_upsert_account(text) to service_role;

alter table public.accounts     enable row level security;
alter table public.login_tokens enable row level security;
alter table public.sessions     enable row level security;

-- Aucune politique n'est créée, volontairement : RLS actif sans politique
-- ferme la table à tout rôle autre que service_role.
