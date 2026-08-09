/**
 * Registre de la surface publique de l'API.
 *
 * Source unique dont dérive la description OpenAPI. Le point n'est pas la
 * commodité : une spécification écrite à la main dérive toujours du code, et
 * une API qui documente une route disparue — ou tait une route existante —
 * ment à ses intégrateurs exactement comme un rapport qui compte une règle
 * non vérifiée comme satisfaite.
 *
 * `scripts/test-api.mjs` confronte ce registre au système de fichiers et
 * échoue dans les deux sens : route déclarée sans fichier, fichier sans
 * déclaration, méthode déclarée que la route n'exporte pas.
 */

/** Portées, au sens du moindre privilège. Une clé ne porte que ce dont elle a besoin. */
export const SCOPES = [
  "scan:read",
  "rules:read",
  "vendors:read",
  "documents:read",
  "evidence:read",
  "monitors:write",
] as const;

export type Scope = (typeof SCOPES)[number];

export const SCOPE_LABELS: Record<Scope, string> = {
  "scan:read": "Lancer une analyse et lire son rapport",
  "rules:read": "Lire le référentiel, la veille et les juridictions",
  "vendors:read": "Lire la base des destinataires",
  "documents:read": "Générer les brouillons documentaires",
  "evidence:read": "Télécharger une archive de preuve",
  "monitors:write": "Inscrire un domaine à la surveillance",
};

export interface ApiParam {
  name: string;
  in: "query";
  required: boolean;
  description: string;
  schema: { type: "string" | "integer" | "boolean" };
}

export interface ApiRoute {
  /** Chemin relatif à la racine du site, tel qu'appelé. */
  path: string;
  method: "GET" | "POST";
  summary: string;
  description: string;
  /**
   * Portée exigée d'une clé qui se présente.
   *
   * `null` marque une route dont l'accès ne PEUT pas être conditionné : le
   * verdict sans e-mail ni compte est la promesse produit n°1 (§0.2.2), et
   * la fermer derrière une clé serait exactement la faille reprochée au
   * concurrent principal.
   */
  scope: Scope | null;
  /** Ouverte sans clé. Toutes le sont aujourd'hui — voir `API_ACCESS_NOTE`. */
  open: boolean;
  params?: readonly ApiParam[];
  /** Corps attendu, décrit sommairement. */
  requestExample?: string;
}

const URL_PARAM: ApiParam = {
  name: "url",
  in: "query",
  required: true,
  description: "Domaine ou adresse complète à analyser. « exemple.fr » suffit.",
  schema: { type: "string" },
};

/**
 * Routes internes, délibérément hors de la surface publique.
 *
 * Les exclure est un choix, pas un oubli : une route de webhook Stripe ou de
 * tâche planifiée décrite dans un document public invite à la sonder. Le
 * contrôle de dérive connaît cette liste et vérifie qu'elle correspond à des
 * fichiers réels — sans quoi on pourrait y cacher n'importe quoi.
 */
export const INTERNAL_ROUTES: readonly string[] = [
  // Gestion des sous-comptes d'une agence : exige une session, pas une clé.
  // La décrire publiquement reviendrait à dessiner la surface d'attaque du
  // portefeuille de nos clients.
  "/api/agence/sous-comptes",
  "/api/auth/lien",
  "/api/auth/session",
  // Fiche de contact de l'éditeur. Ne sert aucune donnée d'audit et ne
  // renvoie que ce que les mentions légales affichent déjà.
  "/api/vcard",
  "/api/billing/checkout",
  "/api/billing/webhook",
  "/api/cron/monitor",
  "/api/ingest",
];

export const API_ROUTES: readonly ApiRoute[] = [
  {
    path: "/api/scan",
    method: "GET",
    summary: "Analyser une adresse",
    description:
      "Exécute le protocole en trois phases lorsque le worker navigateur est déployé, le moteur statique sinon. Le champ `scan.mode` dit lequel a tourné, et `degraded` pourquoi le cas échéant.",
    scope: "scan:read",
    open: true,
    params: [URL_PARAM],
  },
  {
    path: "/api/rulepack",
    method: "GET",
    summary: "Lire le référentiel de règles",
    description:
      "Les 139 règles versionnées, avec leur référence normative, leur sévérité et leur statut sous la proposition « Digital Omnibus ».",
    scope: "rules:read",
    open: true,
  },
  {
    path: "/api/vendors",
    method: "GET",
    summary: "Lire la base des destinataires",
    description:
      "Entité contractante, juridiction effective une fois la chaîne capitalistique remontée, statut d'adéquation et finalité rédigée en français.",
    scope: "vendors:read",
    open: true,
    params: [
      {
        name: "q",
        in: "query",
        required: false,
        description: "Filtre : nom, domaine ou entité. Sans lui, la base entière est renvoyée.",
        schema: { type: "string" },
      },
    ],
  },
  {
    path: "/api/juridictions",
    method: "GET",
    summary: "Lire la couche multi-juridiction",
    description:
      "Le fait constaté est le même partout ; la norme applicable ne l'est pas. FR et UE sont qualifiées, les autres explicitement indicatives.",
    scope: "rules:read",
    open: true,
    params: [
      {
        name: "code",
        in: "query",
        required: false,
        description: "Juridiction : FR, EU, QC, CA, CH, US_CA.",
        schema: { type: "string" },
      },
      {
        name: "rule",
        in: "query",
        required: false,
        description: "Identifiant de règle, pour n'obtenir que ses variantes nationales.",
        schema: { type: "string" },
      },
    ],
  },
  {
    path: "/api/regwatch",
    method: "GET",
    summary: "Lire la veille réglementaire",
    description:
      "Entrées rattachées aux règles du référentiel, avec statut en vigueur, en projet ou retiré.",
    scope: "rules:read",
    open: true,
    params: [
      {
        name: "rule",
        in: "query",
        required: false,
        description: "Identifiant de règle, pour n'obtenir que sa veille.",
        schema: { type: "string" },
      },
      {
        name: "since",
        in: "query",
        required: false,
        description: "Date ISO : n'obtenir que les entrées postérieures.",
        schema: { type: "string" },
      },
    ],
  },
  {
    path: "/api/remediation",
    method: "GET",
    summary: "Estimer la remise en conformité",
    description:
      "Devis calculé depuis les constats, sans saisie commerciale : il ne peut pas diverger du rapport.",
    scope: "scan:read",
    open: true,
    params: [
      URL_PARAM,
      {
        name: "stack",
        in: "query",
        required: false,
        description: "Pile technique détectée ou imposée : wordpress, shopify, custom…",
        schema: { type: "string" },
      },
      {
        name: "ca",
        in: "query",
        required: false,
        description:
          "Chiffre d'affaires annuel en euros. Sert au seul calcul d'exposition théorique, toujours encadré par la fourchette réellement observée.",
        schema: { type: "integer" },
      },
    ],
  },
  {
    path: "/api/documents",
    method: "GET",
    summary: "Générer un brouillon documentaire",
    description:
      "Gabarits déterministes alimentés par le scan. Aucun modèle de langage n'intervient. Tout champ inconnu est signalé en clair plutôt que rempli. Sans `slug`, renvoie le catalogue en distinguant les gabarits écrits de ceux seulement prévus.",
    scope: "documents:read",
    open: true,
    params: [
      { ...URL_PARAM, required: false, description: `${URL_PARAM.description} Requis avec « slug ».` },
      {
        name: "slug",
        in: "query",
        required: false,
        description: "Gabarit à générer. Absent, la route renvoie le catalogue.",
        schema: { type: "string" },
      },
    ],
  },
  {
    path: "/api/evidence",
    method: "GET",
    summary: "Télécharger une archive de preuve",
    description:
      "ZIP signé Ed25519 : constats, observation brute, empreintes SHA-256. Vérifiable hors ligne, sans nous faire confiance.",
    scope: "evidence:read",
    open: true,
    params: [URL_PARAM],
  },
  {
    path: "/api/diff",
    method: "GET",
    summary: "Comparer à une référence",
    description:
      "Différentiel entre un jeton de référence et une analyse courante. Refuse de conclure si les deux n'ont pas été produits par le même moteur.",
    scope: "scan:read",
    open: true,
    params: [
      URL_PARAM,
      {
        name: "ref",
        in: "query",
        required: true,
        description: "Jeton de référence obtenu au bas d'un rapport.",
        schema: { type: "string" },
      },
    ],
  },
  {
    path: "/api/tcf",
    method: "POST",
    summary: "Décoder une chaîne TCF",
    description:
      "Décodeur TCF v2.2 : finalités, consentement légitime, identifiants de fournisseurs. Offert sans contrepartie.",
    scope: "rules:read",
    open: true,
    requestExample: '{ "tcString": "CQJH8AAQJH8AAAHABBENBhFgAAAAAAAAACiQ..." }',
  },
  {
    path: "/api/monitors",
    method: "POST",
    summary: "Inscrire un domaine à la surveillance",
    description:
      "L'inscription suppose une preuve de propriété du domaine (TXT DNS ou fichier `.well-known`). Sans elle, aucune donnée n'est conservée.",
    scope: "monitors:write",
    open: true,
    requestExample: '{ "hostname": "exemple.fr", "alertEmail": "dpo@exemple.fr", "frequency": "weekly" }',
  },
];

/**
 * Ce que l'API garantit aujourd'hui, dit sans arrondi.
 *
 * Le champ `open` vaut `true` partout : présenter une clé attribue et compte
 * l'appel, ne pas en présenter ne ferme rien. Décider de fermer une route est
 * un arbitrage commercial, pas une correction technique — et le taire ferait
 * croire à un contrôle d'accès qui n'existe pas.
 */
export const API_ACCESS_NOTE =
  "Toutes les routes listées sont ouvertes sans clé. Une clé présentée est vérifiée, " +
  "rattachée à son organisation, décomptée de son quota et journalisée ; son absence ne " +
  "restreint rien à ce jour.";

export const API_VERSION = "1";
