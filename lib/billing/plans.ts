/**
 * Catalogue des offres — source unique.
 *
 * La page /tarifs, le paiement et Stripe lisent tous ce fichier. Sans quoi la
 * grille affichée et la grille facturée finissent par diverger, et c'est le
 * genre d'écart qu'on ne découvre qu'au premier litige.
 *
 * Le champ `delivered` de chaque promesse n'est pas de la documentation : il
 * pilote l'ouverture du paiement. Une offre dont une promesse n'est pas tenue
 * ne peut pas être achetée en ligne — voir `readiness.ts`.
 */

export type PlanId = "libre" | "starter" | "pro" | "agence";

export interface PlanFeature {
  label: string;
  /**
   * La fonctionnalité est-elle RÉELLEMENT livrée aujourd'hui ?
   *
   * Ce champ se remplit en regardant le code, pas la feuille de route. Une
   * promesse marquée `true` alors qu'elle n'existe pas transforme une vente en
   * pratique commerciale trompeuse au sens de l'article L121-1 du code de la
   * consommation — précisément le reproche que le produit adresse aux autres.
   */
  delivered: boolean;
  /** Ce qui manque, quand la promesse n'est pas tenue. Affiché en interne. */
  gap?: string;
  /**
   * Variables d'environnement sans lesquelles la promesse ne tient pas, même
   * si le code existe.
   *
   * Distinction qui compte : « l'envoi d'alerte est écrit » et « l'alerte
   * part » sont deux choses différentes. La surveillance a enregistré ses
   * alertes en base pendant des semaines sans jamais en envoyer une seule.
   * Le code seul ne suffit donc pas à tenir une promesse.
   */
  requiresEnv?: readonly string[];
}

export interface Plan {
  id: PlanId;
  name: string;
  /** Montant mensuel en centimes. `null` pour l'offre libre. */
  amountCents: number | null;
  pitch: string;
  features: readonly PlanFeature[];
  /**
   * Variable d'environnement portant l'identifiant de tarif Stripe.
   * Les identifiants diffèrent entre test et production : ils ne sont donc
   * jamais écrits en dur.
   */
  priceEnvVar?: string;
  highlighted: boolean;
}

export const PLANS: readonly Plan[] = [
  {
    id: "libre",
    name: "Analyse libre",
    amountCents: null,
    pitch: "Pour savoir où vous en êtes.",
    features: [
      { label: "Analyse à la demande, sans inscription", delivered: true },
      { label: "Rapport complet à l'écran", delivered: true },
      { label: "Référentiel et base des traceurs en accès libre", delivered: true },
      { label: "Brouillon de politique cookies", delivered: true },
      { label: "Outils libres : décodeur TCF, simulateur", delivered: true },
    ],
    highlighted: false,
  },
  {
    id: "starter",
    name: "Starter",
    amountCents: 2900,
    pitch: "Pour un site unique à surveiller.",
    priceEnvVar: "STRIPE_PRICE_STARTER",
    features: [
      { label: "1 domaine, propriété vérifiée", delivered: true },
      { label: "Analyse mensuelle automatique", delivered: true },
      {
        label: "Alerte en cas de nouveau traceur",
        delivered: true,
        requiresEnv: ["RESEND_API_KEY", "KONSENT_MAIL_FROM"],
      },
      { label: "Historique de score conservé 13 mois", delivered: true },
      {
        label: "Protocole complet en trois phases",
        delivered: false,
        gap: "Le worker Playwright existe et alimente le même évaluateur, mais n'est pas hébergé : le client devrait l'exécuter lui-même. Ce n'est pas un service.",
      },
      {
        label: "6 documents générés",
        delivered: true,
      },
    ],
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    amountCents: 8900,
    pitch: "Pour un site marchand ou plusieurs marques.",
    priceEnvVar: "STRIPE_PRICE_PRO",
    features: [
      { label: "5 domaines", delivered: true },
      { label: "Analyse hebdomadaire et détection de régression", delivered: true },
      { label: "Archive de preuve signée Ed25519", delivered: true },
      {
        label: "24 documents générés",
        delivered: false,
        gap:
          "15 gabarits existent. Les huit restants sont les plus exposés : CGU et CGV sont des " +
          "contrats commerciaux, l'AIPD une méthode d'analyse, et les annexes CCT reproduisent " +
          "une décision d'exécution européenne qui ne se réécrit pas de mémoire. Ils supposent " +
          "une source officielle et une relecture d'avocat, pas de la rédaction.",
      },
      {
        label: "Accès API",
        delivered: false,
        gap:
          "Les clés, portées, quotas, journal d'appels et description OpenAPI existent désormais. " +
          "Ce qui manque n'est plus technique : les onze routes restent OUVERTES sans clé, si bien " +
          "qu'une clé n'apporte aujourd'hui qu'attribution et quota. Vendre cet accès suppose de " +
          "trancher ce qui reste gratuit — arbitrage commercial, à faire avant d'ouvrir l'offre.",
      },
      {
        label: "250 pages par analyse",
        delivered: false,
        gap: "Le crawl multi-pages n'est pas écrit : le moteur analyse la page d'accueil et les pages légales.",
      },
    ],
    highlighted: true,
  },
  {
    id: "agence",
    name: "Agence",
    amountCents: 24900,
    pitch: "Pour gérer un portefeuille de clients.",
    priceEnvVar: "STRIPE_PRICE_AGENCE",
    features: [
      { label: "Vue portefeuille multi-domaines", delivered: true },
      { label: "Marque blanche par URL", delivered: true },
      { label: "Devis générés à votre grille tarifaire", delivered: true },
      {
        label: "Sous-comptes clients cloisonnés",
        delivered: true,
        requiresEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      },
      {
        label: "25 domaines",
        delivered: true,
        requiresEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      },
    ],
    highlighted: false,
  },
];

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function formatAmount(cents: number | null): string {
  if (cents === null) return "0 €";
  return `${(cents / 100).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
}
