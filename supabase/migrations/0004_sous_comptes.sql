-- Sous-comptes agence, et rattachement des domaines à leur propriétaire.
--
-- La décision d'accès vit dans `lib/agency/tenancy.ts`, éprouvée par
-- `scripts/test-tenancy.mjs`. Ce fichier pose ce que le schéma peut garantir
-- de son côté, parce qu'une règle applicative se contourne dès qu'une requête
-- est écrite ailleurs — et c'est toujours ce qui arrive.
--
--  * RLS activé, aucune politique : tout passe par `service_role`. Une table
--    de comptes lisible par le rôle anonyme livrerait le portefeuille de
--    toutes les agences.
--
--  * Le cloisonnement s'arrête à UN niveau, et c'est la base qui l'impose. Une
--    hiérarchie profonde ferait dépendre une décision d'accès d'un parcours
--    d'arbre, donc d'un risque de cycle et de fuite par récursion.

alter table public.accounts
  add column if not exists parent_id uuid references public.accounts (id) on delete set null;

create index if not exists accounts_parent_idx on public.accounts (parent_id);

-- Un compte ne peut pas être son propre parent.
alter table public.accounts
  drop constraint if exists accounts_parent_not_self;
alter table public.accounts
  add constraint accounts_parent_not_self check (parent_id is null or parent_id <> id);

-- Un sous-compte ne peut pas avoir de sous-comptes : le parent désigné doit
-- lui-même être de premier niveau. Le déclencheur ferme la chaîne côté base,
-- indépendamment du code applicatif.
create or replace function public.konsent_no_nested_subaccounts()
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

  select parent_id into grandparent from public.accounts where id = new.parent_id;
  if grandparent is not null then
    raise exception
      'Cloisonnement sur un seul niveau : % est déjà rattaché à une agence.', new.parent_id;
  end if;

  -- Et symétriquement : un compte qui a déjà des enfants ne peut pas être
  -- rattaché à une agence, sinon la chaîne se forme par l'autre bout.
  select exists (select 1 from public.accounts where parent_id = new.id) into has_children;
  if has_children then
    raise exception 'Ce compte porte déjà des sous-comptes : il ne peut pas être rattaché.';
  end if;

  return new;
end;
$$;

drop trigger if exists accounts_no_nesting on public.accounts;
create trigger accounts_no_nesting
  before insert or update of parent_id on public.accounts
  for each row execute function public.konsent_no_nested_subaccounts();

-- Rattachement des domaines surveillés à leur propriétaire.
--
-- Nul pour les lignes antérieures : elles restent inaccessibles par la voie
-- des comptes, ce qui est le bon défaut. Une ressource sans propriétaire n'est
-- accessible à personne — le réflexe inverse est la manière la plus courante
-- de laisser fuir des données par une migration.
alter table public.monitored_domains
  add column if not exists account_id uuid references public.accounts (id) on delete cascade;

create index if not exists monitored_domains_account_idx
  on public.monitored_domains (account_id);

-- Un même domaine ne peut pas être surveillé deux fois par le même compte.
create unique index if not exists monitored_domains_account_host_idx
  on public.monitored_domains (account_id, hostname)
  where account_id is not null;

alter table public.accounts enable row level security;

-- Aucune politique créée, volontairement : RLS actif sans politique ferme la
-- table à tout rôle autre que service_role.
