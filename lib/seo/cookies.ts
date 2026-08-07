import { TRACKERS, getTrackerBySlug } from "../trackers/db";
import type { TrackerEntity } from "../trackers/types";

/**
 * Index des cookies nommés.
 *
 * Un dirigeant qui découvre `_fbp` dans son navigateur cherche « c'est quoi
 * le cookie _fbp ». C'est une requête à intention informationnelle claire,
 * et personne n'y répond correctement en français.
 *
 * L'index se construit à partir des fiches de destinataires — donc sans
 * duplication de vérité — et se complète des cookies très répandus qui ne
 * sont rattachés à aucune fiche.
 */

export interface CookieEntry {
  /** Nom exact, ou motif avec joker pour les familles de cookies. */
  name: string;
  /** Identifiant d'URL : /cookies/{slug}. */
  slug: string;
  vendorSlug?: string;
  vendorName: string;
  purposeFr: string;
  /** Durée maximale observée, en jours. null pour un cookie de session. */
  maxLifetimeDays: number | null;
  isIdentifier: boolean;
  /** Le dépôt suppose-t-il un consentement préalable ? */
  requiresConsent: boolean;
  category: string;
  /** Précision propre au cookie, au-delà de la fiche du destinataire. */
  noteFr?: string;
}

/** Convertit un nom de cookie en segment d'URL stable. */
export function cookieSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\*/g, "x")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Cookies très répandus sans fiche de destinataire dédiée, ou méritant une
 * note spécifique. Rédigés à la main, une fois.
 */
const EXTRA: readonly Omit<CookieEntry, "slug">[] = [
  {
    name: "PHPSESSID",
    vendorName: "Serveur applicatif PHP",
    purposeFr:
      "Identifie la session d'un visiteur côté serveur, le temps de sa visite. C'est ce qui permet à un panier de rester rempli d'une page à l'autre.",
    maxLifetimeDays: null,
    isIdentifier: true,
    requiresConsent: false,
    category: "technique",
    noteFr:
      "Cookie strictement nécessaire au fonctionnement du service demandé : il relève de l'exemption prévue par l'article 82 et ne requiert pas de consentement. Il doit néanmoins figurer dans votre politique cookies.",
  },
  {
    name: "JSESSIONID",
    vendorName: "Serveur applicatif Java",
    purposeFr: "Équivalent de PHPSESSID pour les applications Java.",
    maxLifetimeDays: null,
    isIdentifier: true,
    requiresConsent: false,
    category: "technique",
    noteFr: "Strictement nécessaire, exempté de consentement.",
  },
  {
    name: "csrftoken",
    vendorName: "Cadre applicatif (Django, Laravel…)",
    purposeFr:
      "Protège les formulaires contre les soumissions falsifiées depuis un autre site.",
    maxLifetimeDays: 365,
    isIdentifier: false,
    requiresConsent: false,
    category: "sécurité",
    noteFr:
      "Mesure de sécurité relevant de l'article 32 du RGPD. Exempté de consentement.",
  },
  {
    name: "wordpress_logged_in_*",
    vendorName: "WordPress",
    purposeFr: "Maintient la session d'un utilisateur authentifié dans l'administration.",
    maxLifetimeDays: 14,
    isIdentifier: true,
    requiresConsent: false,
    category: "technique",
    noteFr: "Ne concerne que les comptes connectés. Strictement nécessaire.",
  },
  {
    name: "wp-settings-*",
    vendorName: "WordPress",
    purposeFr: "Mémorise les préférences d'affichage de l'administration.",
    maxLifetimeDays: 365,
    isIdentifier: false,
    requiresConsent: false,
    category: "préférences",
  },
  {
    name: "PrestaShop-*",
    vendorName: "PrestaShop",
    purposeFr: "Session boutique : panier, devise, langue et client connecté.",
    maxLifetimeDays: 20,
    isIdentifier: true,
    requiresConsent: false,
    category: "technique",
    noteFr: "Strictement nécessaire au fonctionnement de la boutique.",
  },
  {
    name: "cart",
    vendorName: "Shopify",
    purposeFr: "Conserve le contenu du panier entre deux pages.",
    maxLifetimeDays: 14,
    isIdentifier: true,
    requiresConsent: false,
    category: "technique",
    noteFr: "Strictement nécessaire.",
  },
  {
    name: "_shopify_y",
    vendorSlug: "shopify",
    vendorName: "Shopify",
    purposeFr:
      "Identifiant de visiteur utilisé par la mesure d'audience intégrée de Shopify.",
    maxLifetimeDays: 365,
    isIdentifier: true,
    requiresConsent: true,
    category: "analytics",
    noteFr:
      "Souvent confondu avec un cookie technique. Il relève de la mesure d'audience et suppose un consentement, sauf configuration exemptée.",
  },
  {
    name: "NID",
    vendorSlug: "google-ads",
    vendorName: "Google",
    purposeFr:
      "Mémorise les préférences de recherche et sert au ciblage publicitaire sur les services Google.",
    maxLifetimeDays: 183,
    isIdentifier: true,
    requiresConsent: true,
    category: "advertising",
  },
  {
    name: "1P_JAR",
    vendorSlug: "google-ads",
    vendorName: "Google",
    purposeFr: "Relie l'activité publicitaire à la date de visite.",
    maxLifetimeDays: 30,
    isIdentifier: true,
    requiresConsent: true,
    category: "advertising",
  },
  {
    name: "CONSENT",
    vendorSlug: "youtube",
    vendorName: "Google",
    purposeFr: "Enregistre l'état de consentement pour les services Google.",
    maxLifetimeDays: 730,
    isIdentifier: false,
    requiresConsent: false,
    category: "cmp",
    noteFr:
      "Cookie de mémorisation du choix : exempté, mais sa présence indique qu'un service Google est chargé.",
  },
  {
    name: "datr",
    vendorSlug: "meta-pixel",
    vendorName: "Meta",
    purposeFr:
      "Identifie le navigateur pour la sécurité et la détection de comptes automatisés — et alimente aussi le graphe publicitaire.",
    maxLifetimeDays: 730,
    isIdentifier: true,
    requiresConsent: true,
    category: "social",
  },
  {
    name: "_gat",
    vendorSlug: "google-analytics-4",
    vendorName: "Google",
    purposeFr: "Limite le nombre de requêtes envoyées à Google Analytics.",
    maxLifetimeDays: 1,
    isIdentifier: false,
    requiresConsent: true,
    category: "analytics",
    noteFr:
      "Ne contient pas d'identifiant, mais accompagne toujours _ga : sa présence trahit un outil de mesure soumis à consentement.",
  },
  {
    name: "_hjSession_*",
    vendorSlug: "hotjar",
    vendorName: "Hotjar",
    purposeFr: "Identifie la session en cours d'enregistrement.",
    maxLifetimeDays: 1,
    isIdentifier: true,
    requiresConsent: true,
    category: "session_replay",
  },
  {
    name: "MUID",
    vendorSlug: "microsoft-advertising",
    vendorName: "Microsoft",
    purposeFr:
      "Identifiant unique de navigateur, partagé entre Bing, Clarity et la régie Microsoft.",
    maxLifetimeDays: 390,
    isIdentifier: true,
    requiresConsent: true,
    category: "advertising",
  },
  {
    name: "_clck",
    vendorSlug: "microsoft-clarity",
    vendorName: "Microsoft",
    purposeFr: "Relie les enregistrements de session Clarity à un même visiteur.",
    maxLifetimeDays: 365,
    isIdentifier: true,
    requiresConsent: true,
    category: "session_replay",
  },
  {
    name: "_pk_ses",
    vendorSlug: "matomo",
    vendorName: "Matomo",
    purposeFr: "Identifie une session de mesure d'audience Matomo, de courte durée.",
    maxLifetimeDays: 1,
    isIdentifier: true,
    requiresConsent: false,
    category: "analytics",
    noteFr:
      "Peut relever de l'exemption de mesure d'audience si Matomo est auto-hébergé et correctement configuré.",
  },
  {
    name: "axeptio_authorized_vendors",
    vendorSlug: "axeptio",
    vendorName: "Axeptio",
    purposeFr: "Mémorise la liste des services que le visiteur a acceptés.",
    maxLifetimeDays: 365,
    isIdentifier: false,
    requiresConsent: false,
    category: "cmp",
    noteFr:
      "Cookie de mémorisation du choix : strictement nécessaire, donc exempté. Son absence après un refus est en revanche un constat.",
  },
  {
    name: "OptanonConsent",
    vendorSlug: "onetrust",
    vendorName: "OneTrust",
    purposeFr: "Enregistre les catégories de traceurs acceptées par le visiteur.",
    maxLifetimeDays: 365,
    isIdentifier: false,
    requiresConsent: false,
    category: "cmp",
  },
  {
    name: "CookieConsent",
    vendorSlug: "cookiebot",
    vendorName: "Cookiebot",
    purposeFr: "Enregistre l'état du consentement par catégorie.",
    maxLifetimeDays: 365,
    isIdentifier: false,
    requiresConsent: false,
    category: "cmp",
  },
  {
    name: "didomi_token",
    vendorSlug: "didomi",
    vendorName: "Didomi",
    purposeFr: "Conserve le choix de consentement et sa date.",
    maxLifetimeDays: 365,
    isIdentifier: false,
    requiresConsent: false,
    category: "cmp",
  },
  {
    name: "euconsent-v2",
    vendorName: "Cadre de transparence IAB (TCF v2.2)",
    purposeFr:
      "Contient la chaîne de consentement transmise aux partenaires publicitaires, au format du cadre de transparence de l'IAB.",
    maxLifetimeDays: 390,
    isIdentifier: false,
    requiresConsent: false,
    category: "cmp",
    noteFr:
      "Sa présence indique que le site participe à l'écosystème publicitaire TCF. Son contenu doit refléter fidèlement le choix exprimé : une chaîne indiquant un accord après un refus est un manquement caractérisé.",
  },
  {
    name: "__cfruid",
    vendorSlug: "cloudflare",
    vendorName: "Cloudflare",
    purposeFr: "Associe une requête à une origine, pour la répartition de charge.",
    maxLifetimeDays: null,
    isIdentifier: false,
    requiresConsent: false,
    category: "technique",
    noteFr: "Strictement nécessaire, exempté.",
  },
  {
    name: "AWSALB",
    vendorName: "Amazon Web Services",
    purposeFr:
      "Maintient l'affinité de session avec un serveur donné derrière un répartiteur de charge.",
    maxLifetimeDays: 7,
    isIdentifier: false,
    requiresConsent: false,
    category: "technique",
    noteFr: "Strictement nécessaire, exempté.",
  },
];

function requiresConsentFor(tracker: TrackerEntity): boolean {
  if (tracker.exemptEligible) return false;
  return tracker.categories.some((c) =>
    ["advertising", "social", "session_replay", "rtb", "ab_testing", "marketing_automation", "analytics"].includes(
      c,
    ),
  );
}

/** Index complet, dérivé des fiches puis complété. */
export const COOKIES: readonly CookieEntry[] = (() => {
  const out: CookieEntry[] = [];
  const seen = new Set<string>();

  for (const tracker of TRACKERS) {
    for (const cookie of tracker.cookies ?? []) {
      const slug = cookieSlug(cookie.name);
      if (seen.has(slug)) continue;
      seen.add(slug);
      out.push({
        name: cookie.name,
        slug,
        vendorSlug: tracker.slug,
        vendorName: tracker.name,
        purposeFr: cookie.purposeFr,
        maxLifetimeDays: cookie.maxLifetimeDays,
        isIdentifier: cookie.isIdentifier,
        requiresConsent: requiresConsentFor(tracker),
        category: tracker.categories[0] ?? "autre",
      });
    }
  }

  for (const extra of EXTRA) {
    const slug = cookieSlug(extra.name);
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({ ...extra, slug });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name, "fr"));
})();

export function getCookie(slug: string): CookieEntry | undefined {
  return COOKIES.find((c) => c.slug === slug);
}

/**
 * Rapproche un cookie observé de son éditeur, PAR SON NOM.
 *
 * C'est le seul rapprochement qui fonctionne en pratique : `_fbp`, `_ga` ou
 * `_gcl_au` sont posés par des scripts tiers mais sur le domaine du site
 * lui-même. Les chercher par domaine ne donne jamais rien, alors que ce sont
 * précisément les cookies qui portent les constats les plus lourds.
 *
 * Les motifs à joker (`_ga_*`, `_hjSessionUser_*`) sont pris en charge.
 */
export function matchCookieName(name: string): CookieEntry | undefined {
  const exact = COOKIES.find((c) => c.name === name);
  if (exact) return exact;

  for (const cookie of COOKIES) {
    if (!cookie.name.includes("*")) continue;
    const pattern = new RegExp(
      `^${cookie.name.split("*").map(escapeRegex).join(".*")}$`,
      "i",
    );
    if (pattern.test(name)) return cookie;
  }
  return undefined;
}

function escapeRegex(part: string): string {
  return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Éditeur d'un cookie observé, résolu par son nom. */
export function trackerForCookieName(name: string): TrackerEntity | undefined {
  const entry = matchCookieName(name);
  return entry?.vendorSlug ? getTrackerBySlug(entry.vendorSlug) : undefined;
}

export function vendorOf(cookie: CookieEntry): TrackerEntity | undefined {
  return cookie.vendorSlug ? getTrackerBySlug(cookie.vendorSlug) : undefined;
}

export function lifetimeLabel(days: number | null): string {
  if (days === null) return "le temps de la session";
  if (days < 1) return "moins d'une journée";
  if (days === 1) return "1 jour";
  if (days < 60) return `${days} jours`;
  const months = Math.round(days / 30.44);
  if (months < 24) return `environ ${months} mois`;
  return `environ ${Math.round(days / 365)} ans`;
}

/** Le cookie dépasse-t-il la durée de vie recommandée de 13 mois ? */
export function exceedsRecommendedLifetime(cookie: CookieEntry): boolean {
  return cookie.maxLifetimeDays !== null && cookie.maxLifetimeDays > 396;
}
