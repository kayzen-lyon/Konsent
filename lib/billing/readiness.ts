import { PLANS, type Plan, type PlanId } from "./plans";

/**
 * Contrôle de sincérité commerciale.
 *
 * Le point de départ est un constat gênant : la page /tarifs promettait
 * « 24 documents générés » quand 7 existent, « sous-comptes clients
 * cloisonnés » quand aucun système de comptes n'existe, et « accès API »
 * quand les routes n'ont ni clé ni quota. Le paiement n'était pas branché,
 * donc personne n'avait encore payé pour ça. Le brancher tel quel aurait
 * transformé une inexactitude de page marketing en vente.
 *
 * Ce module refuse donc d'ouvrir le paiement d'une offre dont une promesse
 * n'est pas tenue. Ce n'est pas de la prudence excessive : le garde-fou n°2 du
 * PRD §3.2 interdit d'afficher un plafond légal sans la moyenne observée, au
 * motif que ce serait une pratique commerciale trompeuse au sens de l'article
 * L121-1 du code de la consommation. Vendre une fonctionnalité absente relève
 * exactement du même article.
 *
 * La levée du blocage ne se fait pas ici : elle se fait en écrivant la
 * fonctionnalité, puis en basculant `delivered` dans `plans.ts`.
 */

export interface PlanReadiness {
  plan: Plan;
  /** L'offre peut-elle être vendue en ligne aujourd'hui ? */
  sellable: boolean;
  unmet: readonly { label: string; gap: string }[];
}

export function readiness(plan: Plan): PlanReadiness {
  const unmet = plan.features
    .filter((f) => !f.delivered)
    .map((f) => ({ label: f.label, gap: f.gap ?? "Non livrée." }));
  return { plan, sellable: unmet.length === 0, unmet };
}

/**
 * Promesses que le code tient mais que la CONFIGURATION ne tient pas.
 *
 * Séparé de `unmet` à dessein : ce n'est pas une dette de développement mais
 * un déploiement incomplet, et cela se corrige en posant une variable, pas en
 * écrivant du code. Les deux bloquent la vente ; ils ne se règlent pas au
 * même endroit ni par les mêmes personnes.
 */
export function misconfigured(plan: Plan): readonly { label: string; missing: readonly string[] }[] {
  return plan.features
    .filter((f) => f.delivered && f.requiresEnv?.length)
    .map((f) => ({
      label: f.label,
      missing: (f.requiresEnv ?? []).filter((key) => !process.env[key]),
    }))
    .filter((f) => f.missing.length > 0);
}

export function allReadiness(): readonly PlanReadiness[] {
  return PLANS.map(readiness);
}

export function isSellable(id: PlanId): boolean {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan || plan.amountCents === null) return false;
  return readiness(plan).sellable;
}

/**
 * Offres réellement achetables : promesses tenues ET tarif Stripe configuré.
 *
 * Les deux conditions sont nécessaires et aucune n'est suffisante. Un tarif
 * configuré sur une offre incomplète reste fermé.
 */
export function purchasablePlans(): readonly Plan[] {
  return PLANS.filter((plan) => {
    if (plan.amountCents === null || !plan.priceEnvVar) return false;
    if (!readiness(plan).sellable) return false;
    // Une promesse tenue par le code mais pas par le déploiement reste une
    // promesse non tenue du point de vue du client qui paie.
    if (misconfigured(plan).length > 0) return false;
    return Boolean(process.env[plan.priceEnvVar]);
  });
}
