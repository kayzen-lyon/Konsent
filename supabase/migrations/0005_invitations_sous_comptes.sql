-- Rattachement d'un sous-compte par INVITATION.
--
-- Jusqu'ici, une agence pouvait écrire `parent_id` sur n'importe quel compte
-- de premier niveau à partir de sa seule adresse : le client était capté
-- sans le savoir, son quota tombait et ses domaines apparaissaient dans le
-- portefeuille de l'agence. Désormais l'agence n'écrit que
-- `invited_parent_id` ; seul le titulaire du compte, connecté avec sa propre
-- session, transforme l'invitation en rattachement.

alter table public.accounts
  add column if not exists invited_parent_id uuid references public.accounts (id) on delete set null;

alter table public.accounts
  drop constraint if exists accounts_invited_not_self;
alter table public.accounts
  add constraint accounts_invited_not_self check (invited_parent_id is null or invited_parent_id <> id);

create index if not exists accounts_invited_parent_idx on public.accounts (invited_parent_id);
