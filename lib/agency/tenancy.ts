import type { PlanId } from "../billing/plans";

/**
 * Cloisonnement des sous-comptes agence.
 *
 * C'est la fonctionnalité qui justifie l'écart de prix entre Pro et Agence, et
 * c'est aussi celle dont un défaut coûte le plus cher : une agence qui voit le
 * portefeuille d'une autre, ou un client qui voit ses concurrents dans la même
 * agence, est un incident à notifier au titre de l'article 33 — commis par un
 * produit vendu pour prévenir ce genre de manquement.
 *
 * D'où ce module : la décision d'accès est PURE, isolée de toute base et de
 * tout cadre web, donc éprouvable exhaustivement. `scripts/test-tenancy.mjs`
 * l'attaque par tous les côtés — frère à frère, enfant vers parent, agence
 * vers agence, ressource orpheline.
 *
 * Règle unique dont tout le reste découle : **on ne voit que ce qu'on possède,
 * ou ce que possède un sous-compte dont on est le parent direct.**
 */

export interface Actor {
  id: string;
  plan: PlanId;
  /** Identifiant du compte parent. `null` pour un compte de premier niveau. */
  parentId: string | null;
}

/** Ressource rattachée à exactement un compte. */
export interface OwnedResource {
  accountId: string | null;
}

/**
 * Une agence est un compte AGENCE de premier niveau.
 *
 * La condition sur `parentId` n'est pas redondante : sans elle, un sous-compte
 * dont le champ `plan` porterait « agence » — par héritage, par erreur de
 * saisie ou par manipulation — pourrait créer ses propres sous-comptes et
 * ouvrir une chaîne de privilèges. Le plan seul ne fait pas l'autorité.
 */
export function isAgency(actor: Actor): boolean {
  return actor.plan === "agence" && actor.parentId === null;
}

export function isSubAccount(actor: Actor): boolean {
  return actor.parentId !== null;
}

/**
 * Comptes dont l'acteur peut lire les données.
 *
 * Volontairement sur UN seul niveau. Une hiérarchie profonde ferait dépendre
 * une décision d'accès d'un parcours d'arbre, donc d'un chargement complet et
 * d'un risque de cycle ; deux niveaux couvrent le besoin réel — une agence,
 * ses clients.
 */
export function visibleAccountIds(actor: Actor, children: readonly Actor[]): readonly string[] {
  if (!isAgency(actor)) return [actor.id];

  return [
    actor.id,
    // Seuls les enfants DIRECTS, et seulement ceux qui nous désignent
    // réellement comme parent. Ne jamais faire confiance à la provenance de
    // la liste : elle vient d'une requête, pas d'une preuve.
    ...children.filter((c) => c.parentId === actor.id).map((c) => c.id),
  ];
}

export function canAccessAccount(
  actor: Actor,
  target: Actor,
  children: readonly Actor[] = [],
): boolean {
  return visibleAccountIds(actor, children).includes(target.id);
}

/**
 * Accès à une ressource — domaine surveillé, scan, document, devis.
 *
 * Une ressource sans propriétaire n'est accessible à PERSONNE. Le réflexe
 * inverse — « pas de propriétaire, donc pas de restriction » — est la manière
 * la plus courante de laisser fuir des données par une ligne mal migrée.
 */
export function canAccessResource(
  actor: Actor,
  resource: OwnedResource,
  children: readonly Actor[] = [],
): boolean {
  if (!resource.accountId) return false;
  return visibleAccountIds(actor, children).includes(resource.accountId);
}

export type CreationRefusal =
  | "NOT_AN_AGENCY"
  | "SUB_ACCOUNT_CANNOT_DELEGATE"
  | "QUOTA_REACHED"
  | "SELF_PARENT"
  | "ALREADY_ATTACHED";

export const CREATION_MESSAGES: Record<CreationRefusal, string> = {
  NOT_AN_AGENCY: "Seule une offre Agence permet d'ouvrir des sous-comptes clients.",
  SUB_ACCOUNT_CANNOT_DELEGATE:
    "Un sous-compte ne peut pas en créer à son tour : le cloisonnement s'arrête à un niveau.",
  QUOTA_REACHED: "Le nombre de sous-comptes inclus dans votre offre est atteint.",
  SELF_PARENT: "Un compte ne peut pas être son propre parent.",
  ALREADY_ATTACHED: "Ce compte est déjà rattaché à une agence.",
};

/** Sous-comptes inclus par offre. Une offre sans sous-comptes en autorise zéro. */
export const SUB_ACCOUNT_QUOTA: Record<PlanId, number> = {
  libre: 0,
  starter: 0,
  pro: 0,
  agence: 25,
};

export interface CreationVerdict {
  allowed: boolean;
  refusal?: CreationRefusal;
  message?: string;
}

const refused = (refusal: CreationRefusal): CreationVerdict => ({
  allowed: false,
  refusal,
  message: CREATION_MESSAGES[refusal],
});

/**
 * L'acteur peut-il ouvrir un sous-compte de plus ?
 *
 * `existing` est la liste de ses sous-comptes actuels. Elle est filtrée sur le
 * parent réel plutôt que comptée telle quelle : compter une liste fournie par
 * l'appelant reviendrait à lui laisser choisir son propre quota.
 */
export function canCreateSubAccount(
  actor: Actor,
  existing: readonly Actor[],
): CreationVerdict {
  if (isSubAccount(actor)) return refused("SUB_ACCOUNT_CANNOT_DELEGATE");
  if (!isAgency(actor)) return refused("NOT_AN_AGENCY");

  const owned = existing.filter((c) => c.parentId === actor.id);
  if (owned.length >= SUB_ACCOUNT_QUOTA[actor.plan]) return refused("QUOTA_REACHED");

  return { allowed: true };
}

/** Contrôle du rattachement d'un compte existant à une agence. */
export function canAttach(actor: Actor, target: Actor, existing: readonly Actor[]): CreationVerdict {
  if (target.id === actor.id) return refused("SELF_PARENT");
  if (target.parentId !== null) return refused("ALREADY_ATTACHED");
  return canCreateSubAccount(actor, existing);
}

/**
 * Détachement. Seule l'agence PARENTE peut détacher, et seulement son propre
 * enfant : une agence ne détache pas le client d'une autre.
 */
export function canDetach(actor: Actor, target: Actor): boolean {
  return isAgency(actor) && target.parentId === actor.id;
}

/**
 * Quota de domaines, par compte.
 *
 * Un sous-compte n'hérite pas du quota de son agence : sans cela, un seul
 * client pourrait consommer les 25 domaines de l'offre et priver les autres.
 */
export const DOMAIN_QUOTA: Record<PlanId, number> = {
  libre: 1,
  starter: 1,
  pro: 5,
  agence: 25,
};

export function domainQuotaFor(actor: Actor): number {
  // Un sous-compte est servi au titre de l'offre de son agence, mais domaine
  // par domaine : un client, un domaine, sauf décision contraire de l'agence.
  return isSubAccount(actor) ? 1 : DOMAIN_QUOTA[actor.plan];
}

export function canAddDomain(actor: Actor, owned: readonly OwnedResource[]): boolean {
  const mine = owned.filter((d) => d.accountId === actor.id);
  return mine.length < domainQuotaFor(actor);
}
