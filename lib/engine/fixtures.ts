import type { TrackerEntity } from "../trackers/types";
import { POLICY_SIGNALS } from "./lexicons";
import type { Observation } from "./types";

/**
 * Fixtures du moteur — cas positif et cas négatif par règle décidable.
 *
 * Le PRD §20 classe « faux positifs décrédibilisants » en probabilité élevée
 * et impact fort, et désigne les fixtures en CI comme mitigation n°1. Elles
 * n'existaient pas.
 *
 * Le principe : chaque cas part d'une observation NEUTRE — un site sans
 * traceur, sans manquement, avec ses pages légales complètes — et n'en modifie
 * que ce qui doit déclencher la règle. Si un cas positif déclenche autre chose
 * que la règle visée, c'est un effet de bord, et le test le signale. C'est ce
 * contrôle-là qui attrape les faux positifs, pas le simple « la règle se
 * déclenche ».
 */

/**
 * Le vocabulaire des signaux n'est PAS libre : il est défini une fois dans
 * `lexicons.ts` et le moteur ne connaît que ces clés. Les recopier à la main
 * dans les fixtures nous a déjà fabriqué quatre faux positifs fantômes ; on
 * les dérive donc de la source.
 */
const NEUTRAL_PRIVACY_SIGNALS: readonly string[] = POLICY_SIGNALS.map((s) => s.key).filter(
  // Les mentions légales portent l'hébergeur, pas la politique de confidentialité.
  (key) => key !== "host",
);

const TRACKER_ADS: TrackerEntity = {
  slug: "fixture-pixel-publicitaire",
  name: "Pixel publicitaire (fixture)",
  entity: "Fixture Ads Ireland Ltd",
  ultimateParent: "Fixture Ads Inc.",
  hqJurisdiction: "IE",
  effectiveJurisdiction: "US",
  adequacy: "DPF_CONDITIONAL",
  categories: ["advertising", "social"],
  domains: ["fixture-ads.example"],
  exemptEligible: false,
  purposeFr: "Mesure des conversions publicitaires et ciblage.",
  riskNotesFr: "Recoupement inter-sites ; transfert hors Union européenne.",
  sources: ["fixture"],
};

/**
 * Destinataire NEUTRE : établi dans l'EEE, catégorie qui n'appelle pas de
 * consentement, aucune caractéristique aggravante.
 *
 * `TRACKER_ADS` est commode mais coûteux : publicitaire, irlandais de façade,
 * américain en réalité, DPF non confirmé. L'employer pour éprouver une règle
 * de session replay en déclenche cinq autres, et la cascade masque ce que la
 * fixture prétend démontrer.
 *
 * On part donc d'un traceur qui ne déclenche rien, et on n'y ajoute QUE le
 * trait visé. C'est ce qui rend un effet de bord lisible : s'il en reste un,
 * il est significatif.
 */
function tracker(overrides: Partial<TrackerEntity> & { slug: string }): TrackerEntity {
  return {
    name: `Service ${overrides.slug} (fixture)`,
    entity: `Fixture ${overrides.slug} SAS`,
    hqJurisdiction: "FR",
    effectiveJurisdiction: "FR",
    adequacy: "EEA",
    categories: ["maps"],
    domains: [`${overrides.slug}.example`],
    exemptEligible: false,
    purposeFr: "Service de fixture, sans caractéristique aggravante.",
    riskNotesFr: "Fixture de test.",
    sources: ["fixture"],
    ...overrides,
  };
}

/**
 * Observation neutre : un site qui ne déclenche rien.
 *
 * Elle sert de témoin. Si le moteur produit le moindre constat dessus, c'est
 * que ce constat ne dépend pas de ce qu'il prétend observer.
 */
export function neutralObservation(): Observation {
  return {
    url: "https://exemple.fr",
    finalUrl: "https://exemple.fr/",
    hostname: "exemple.fr",
    mode: "static",
    httpStatus: 200,
    durationMs: 120,
    requests: [],
    cookies: [],
    cmp: { detected: true, name: "Témoin", method: "api_signature", confidence: "high" },
    legalPages: [
      {
        kind: "privacy",
        url: "https://exemple.fr/confidentialite",
        label: "Politique de confidentialité",
        reachable: true,
        textLength: 9000,
        substantive: true,
        signals: NEUTRAL_PRIVACY_SIGNALS,
      },
      {
        kind: "legal",
        url: "https://exemple.fr/mentions-legales",
        label: "Mentions légales",
        reachable: true,
        textLength: 4000,
        substantive: true,
        signals: ["host"],
      },
      {
        kind: "cookies",
        url: "https://exemple.fr/cookies",
        label: "Politique cookies",
        reachable: true,
        textLength: 5000,
        substantive: true,
        signals: [],
      },
    ],
    dns: [],
    headers: {
      hsts: "max-age=63072000; includeSubDomains; preload",
      csp: "default-src 'self'",
      referrerPolicy: "strict-origin-when-cross-origin",
      permissionsPolicy: "geolocation=(), camera=(), microphone=()",
      xContentTypeOptions: "nosniff",
    },
    consentMode: {
      gtagPresent: false,
      defaultCallPresent: false,
      grantedByDefault: [],
      handlesAdUserData: false,
    },
    sensitiveTopics: [],
    formsInsecure: [],
    pagesAnalyzed: 4,
  };
}

export interface Fixture {
  ruleId: string;
  /** Ce que le cas positif met en scène, en une phrase. */
  scenario: string;
  positive: (o: Observation) => Observation;
  /**
   * Cas négatif. Par défaut l'observation neutre, qui ne doit rien déclencher.
   * À surcharger quand la règle exige un négatif plus subtil — typiquement
   * pour prouver qu'on ne confond pas deux situations voisines.
   */
  negative?: (o: Observation) => Observation;
  /**
   * Constats que le scénario implique LÉGITIMEMENT, en plus de la règle visée.
   *
   * Un site qui charge un pixel publicitaire enfreint réellement plusieurs
   * règles à la fois ; l'exiger seul reviendrait à écrire des fixtures
   * irréalistes. Mais tolérer n'importe quelle cascade en silence supprime le
   * seul contrôle qui attrape les faux positifs.
   *
   * D'où ce compromis : la cascade est permise à condition d'être ÉCRITE. Le
   * harnais échoue sur tout constat non déclaré — et aussi sur une déclaration
   * qui ne se vérifie plus, pour qu'une liste ne survive pas à sa raison d'être.
   */
  alsoExpected?: readonly string[];
}

const withRequest = (
  o: Observation,
  patch: Partial<Observation["requests"][number]>,
): Observation => ({
  ...o,
  requests: [
    {
      url: "https://fixture-ads.example/pixel.js",
      hostname: "fixture-ads.example",
      origin: "script",
      tracker: TRACKER_ADS,
      tMs: 310,
      phase: "A" as const,
      ...patch,
    },
  ],
});

/** Plusieurs ressources dans une même observation, pour les règles de seuil. */
const withRequests = (
  o: Observation,
  entries: readonly (Partial<Observation["requests"][number]> & { tracker: TrackerEntity })[],
): Observation => ({
  ...o,
  requests: entries.map((e) => ({
    url: `https://${e.tracker.domains[0]}/asset`,
    hostname: e.tracker.domains[0] ?? "fixture.example",
    // `link` est le mode de chargement le plus discret du moteur : il ne
    // déclenche ni la règle des scripts, ni celle des pixels, ni celle des
    // iframes. C'est le véhicule neutre quand la fixture porte sur la NATURE
    // du destinataire et non sur sa façon d'entrer dans la page.
    origin: "link" as const,
    tMs: 300,
    phase: "A" as const,
    ...e,
  })),
});

const withoutLegalPage = (o: Observation, kind: string): Observation => ({
  ...o,
  legalPages: o.legalPages.filter((p) => p.kind !== kind),
});

const withSignals = (o: Observation, signals: readonly string[]): Observation => ({
  ...o,
  legalPages: o.legalPages.map((p) => (p.kind === "privacy" ? { ...p, signals } : p)),
});

/** Mêmes signaux, mais portés par les mentions légales. */
const withLegalSignals = (o: Observation, signals: readonly string[]): Observation => ({
  ...o,
  legalPages: o.legalPages.map((p) => (p.kind === "legal" ? { ...p, signals } : p)),
});



const without = (signal: string) => NEUTRAL_PRIVACY_SIGNALS.filter((s) => s !== signal);

export const FIXTURES: readonly Fixture[] = [
  {
    ruleId: "KZC-DEPOT-005",
    scenario: "Un script de suivi publicitaire est chargé dès le document initial.",
    positive: (o) => withRequest(o, {}),
    // Le pixel de référence est publicitaire, irlandais de façade et américain
    // en réalité : il enfreint réellement ces quatre règles en plus. Les taire
    // serait confortable ; les écrire les rend contestables en revue.
    alsoExpected: [
      "KZC-DEPOT-004",
      "KZC-TRANSFER-001",
      "KZC-TRANSFER-003",
      "KZC-TRANSFER-006",
    ],
  },
  {
    ruleId: "KZC-DEPOT-008",
    scenario: "Une iframe tierce est intégrée dans la page.",
    positive: (o) =>
      withRequest(o, {
        url: "https://video.fixture.example/embed/abc",
        hostname: "video.fixture.example",
        origin: "iframe",
        tracker: {
          ...TRACKER_ADS,
          slug: "fixture-video",
          name: "Lecteur vidéo (fixture)",
          domains: ["video.fixture.example"],
          categories: ["video", "advertising"],
        },
      }),
    alsoExpected: [
      "KZC-DEPOT-004",
      "KZC-TRANSFER-001",
      "KZC-TRANSFER-003",
      "KZC-TRANSFER-006",
    ],
  },
  {
    ruleId: "KZC-DEPOT-013",
    scenario: "Une préconnexion pointe vers un domaine publicitaire, sans chargement.",
    positive: (o) => withRequest(o, { origin: "connect" }),
    // Négatif exigeant : la même ressource RÉELLEMENT chargée ne doit pas
    // produire un constat de préconnexion, mais un constat de chargement.
    negative: (o) => withRequest(o, { origin: "script" }),
  },
  {
    ruleId: "KZC-DOC-001",
    scenario: "Aucune politique de confidentialité n'est accessible.",
    positive: (o) => withoutLegalPage(o, "privacy"),
  },
  {
    ruleId: "KZC-DOC-002",
    scenario: "Aucunes mentions légales ne sont accessibles.",
    positive: (o) => withoutLegalPage(o, "legal"),
  },
  {
    ruleId: "KZC-DOC-003",
    scenario:
      "Des services soumis à consentement sont présents, sans politique cookies distincte.",
    positive: (o) => withRequest(withoutLegalPage(o, "cookies"), {}),
    // Sans aucun service soumis à consentement, l'absence de politique cookies
    // n'est pas un manquement. Le moteur a raison de ne rien dire, et ce
    // négatif verrouille ce comportement.
    negative: (o) => withoutLegalPage(o, "cookies"),
    // Retirer la politique cookies emporte aussi la disparition du point de
    // retrait du consentement : les deux règles observent la même page.
    alsoExpected: [
      "KZC-DEPOT-004",
      "KZC-DEPOT-005",
      "KZC-BANNER-014",
      "KZC-TRANSFER-001",
      "KZC-TRANSFER-003",
      "KZC-TRANSFER-006",
    ],
  },
  {
    ruleId: "KZC-DOC-005",
    scenario: "La politique ne nomme pas le responsable de traitement.",
    positive: (o) => withSignals(o, without("controller")),
  },
  {
    ruleId: "KZC-DOC-006",
    scenario: "La politique ne donne pas les coordonnées du DPO ou du référent.",
    positive: (o) => withSignals(o, without("dpo")),
  },
  {
    ruleId: "KZC-DOC-009",
    scenario: "La politique n'indique aucune durée de conservation.",
    positive: (o) => withSignals(o, without("retention")),
  },
  {
    ruleId: "KZC-DOC-012",
    scenario: "La politique n'énumère pas les droits des personnes.",
    positive: (o) => withSignals(o, without("rights")),
  },
  {
    ruleId: "KZC-DOC-013",
    scenario: "La politique ne mentionne pas le droit de réclamation auprès de la CNIL.",
    positive: (o) => withSignals(o, without("cnil")),
  },
  {
    ruleId: "KZC-DOC-007",
    scenario: "La politique n'énonce aucune finalité.",
    positive: (o) => withSignals(o, without("purposes")),
  },
  {
    ruleId: "KZC-DOC-008",
    scenario: "La politique parle de consentement mais ne nomme jamais les bases légales.",
    positive: (o) => withSignals(o, without("legal_basis_explicit")),
  },
  {
    ruleId: "KZC-DOC-010",
    scenario: "La politique ne cite aucune catégorie de destinataires.",
    positive: (o) => withSignals(o, without("recipients")),
  },
  {
    ruleId: "KZC-DOC-014",
    scenario: "Les droits sont énumérés, mais aucun canal pour les exercer n'est indiqué.",
    positive: (o) => withSignals(o, without("contact_channel")),
    // Sans droits énumérés, c'est KZC-DOC-012 qui porte le manque : la règle
    // sur les modalités ne doit pas doubler le constat.
    negative: (o) => withSignals(o, without("rights")),
  },
  {
    ruleId: "KZC-DOC-015",
    scenario: "La politique ne porte ni date de mise à jour ni numéro de version.",
    positive: (o) => withSignals(o, without("dated")),
  },
  {
    ruleId: "KZC-SEC-001",
    scenario: "L'en-tête HSTS est absent.",
    positive: (o) => ({ ...o, headers: { ...o.headers, hsts: null } }),
  },
  {
    ruleId: "KZC-SEC-002",
    scenario: "Aucune politique de référent restrictive n'est posée.",
    positive: (o) => ({ ...o, headers: { ...o.headers, referrerPolicy: null } }),
    // Une politique permissive existe mais ne protège pas : elle doit
    // déclencher au même titre que l'absence.
    negative: (o) => ({
      ...o,
      headers: { ...o.headers, referrerPolicy: "strict-origin-when-cross-origin" },
    }),
  },
  {
    ruleId: "KZC-SEC-003",
    scenario: "Aucune politique de sécurité de contenu n'est posée.",
    positive: (o) => ({ ...o, headers: { ...o.headers, csp: null } }),
  },
  {
    ruleId: "KZC-SEC-004",
    scenario: "Un formulaire est transmis en clair.",
    positive: (o) => ({ ...o, formsInsecure: ["http://exemple.fr/contact"] }),
  },
  {
    ruleId: "KZC-SEC-005",
    scenario: "Aucune politique de permissions n'est posée.",
    positive: (o) => ({ ...o, headers: { ...o.headers, permissionsPolicy: null } }),
  },
  {
    ruleId: "KZC-CMV2-001",
    scenario: "gtag est chargé sans état de consentement par défaut.",
    positive: (o) => ({
      ...o,
      consentMode: { ...o.consentMode, gtagPresent: true, defaultCallPresent: false },
    }),
    // Le même gtag AVEC son appel par défaut ne doit rien déclencher : c'est
    // la configuration correcte, et la confondre serait le faux positif le
    // plus coûteux de cette famille.
    negative: (o) => ({
      ...o,
      consentMode: {
        gtagPresent: true,
        defaultCallPresent: true,
        grantedByDefault: [],
        handlesAdUserData: true,
      },
    }),
  },
  {
    ruleId: "KZC-CMV2-002",
    scenario: "Le stockage publicitaire est accordé par défaut.",
    positive: (o) => ({
      ...o,
      consentMode: {
        gtagPresent: true,
        defaultCallPresent: true,
        grantedByDefault: ["ad_storage"],
        handlesAdUserData: true,
      },
    }),
  },
  {
    ruleId: "KZC-CMV2-003",
    scenario: "Les signaux ad_user_data et ad_personalization ne sont pas gérés.",
    positive: (o) => ({
      ...o,
      consentMode: {
        gtagPresent: true,
        defaultCallPresent: true,
        grantedByDefault: [],
        handlesAdUserData: false,
      },
    }),
  },
  {
    ruleId: "KZC-STORAGE-007",
    scenario: "Un sous-domaine first-party pointe en CNAME vers un traceur tiers.",
    positive: (o) => ({
      ...o,
      dns: [
        {
          hostname: "metrics.exemple.fr",
          cnameChain: ["metrics.exemple.fr", "custom.fixture-ads.example", "fixture-ads.example"],
          cloakedTracker: TRACKER_ADS,
        },
      ],
    }),
    // Une chaîne CNAME banale, vers un CDN non traceur, ne doit rien déclencher.
    negative: (o) => ({
      ...o,
      dns: [
        {
          hostname: "www.exemple.fr",
          cnameChain: ["www.exemple.fr", "exemple.fr.cdn.example"],
        },
      ],
    }),
  },
  {
    ruleId: "KZC-BANNER-001",
    scenario: "Des traceurs non exemptés sont présents alors qu'aucun bandeau n'est détecté.",
    positive: (o) =>
      withRequest({ ...o, cmp: { detected: false, method: "unresolved", confidence: "medium" } }, {}),
    alsoExpected: [
      "KZC-DEPOT-004",
      "KZC-DEPOT-005",
      "KZC-TRANSFER-001",
      "KZC-TRANSFER-003",
      "KZC-TRANSFER-006",
    ],
  },

  /* ══════════════════════════ Famille DEPOT ══════════════════════════ */

  {
    ruleId: "KZC-DEPOT-004",
    scenario: "Une ressource publicitaire est appelée, sans script ni pixel ni iframe.",
    positive: (o) =>
      withRequests(o, [{ tracker: tracker({ slug: "pub-eee", categories: ["advertising"] }) }]),
  },
  {
    ruleId: "KZC-DEPOT-006",
    scenario: "Un pixel publicitaire est intégré comme image.",
    positive: (o) =>
      withRequests(o, [
        { tracker: tracker({ slug: "pixel-eee", categories: ["advertising"] }), origin: "img" },
      ]),
    alsoExpected: ["KZC-DEPOT-004"],
  },
  {
    ruleId: "KZC-DEPOT-009",
    scenario: "Une police est chargée depuis un fournisseur hors EEE.",
    positive: (o) =>
      withRequests(o, [
        {
          tracker: tracker({
            slug: "polices-hors-eee",
            categories: ["fonts"],
            hqJurisdiction: "GB",
            effectiveJurisdiction: "GB",
            adequacy: "ADEQUATE",
          }),
        },
      ]),
    // Le même service, hébergé dans l'EEE, est irréprochable. C'est la
    // juridiction qui fait le constat, pas le fait de charger une police —
    // confondre les deux produirait un faux positif sur tout site européen.
    negative: (o) =>
      withRequests(o, [{ tracker: tracker({ slug: "polices-eee", categories: ["fonts"] }) }]),
  },
  {
    ruleId: "KZC-DEPOT-010",
    scenario: "Un CAPTCHA est chargé sur une page qui ne comporte aucun formulaire.",
    positive: (o) =>
      withRequests(o, [{ tracker: tracker({ slug: "captcha-seul", categories: ["captcha"] }) }]),
    // Le même CAPTCHA sur une page AVEC formulaire est justifié. La règle vise
    // le chargement systématique sur tout le site, pas l'usage légitime.
    negative: (o) => ({
      ...withRequests(o, [
        { tracker: tracker({ slug: "captcha-forme", categories: ["captcha"] }) },
        { tracker: tracker({ slug: "formulaire" }), origin: "form" },
      ]),
    }),
  },
  {
    ruleId: "KZC-DEPOT-011",
    scenario: "Un outil d'enregistrement de session est présent.",
    positive: (o) =>
      withRequests(o, [
        { tracker: tracker({ slug: "rejeu-session", categories: ["session_replay"] }) },
      ]),
  },
  {
    ruleId: "KZC-DEPOT-012",
    scenario: "Un module de messagerie instantanée est chargé.",
    positive: (o) =>
      withRequests(o, [{ tracker: tracker({ slug: "messagerie", categories: ["chat"] }) }]),
  },
  {
    ruleId: "KZC-DEPOT-014",
    scenario:
      "Un gestionnaire de balises orchestre des services soumis à consentement, sans état préalable.",
    positive: (o) =>
      withRequests(o, [
        { tracker: tracker({ slug: "gestionnaire-balises", categories: ["tag_manager"] }) },
        { tracker: tracker({ slug: "pub-orchestree", categories: ["advertising"] }) },
      ]),
    // Le même montage AVEC un état de consentement déclaré au préalable est la
    // configuration correcte : le gestionnaire de balises n'est pas fautif en soi.
    negative: (o) => ({
      ...withRequests(o, [
        { tracker: tracker({ slug: "gestionnaire-balises", categories: ["tag_manager"] }) },
        { tracker: tracker({ slug: "pub-orchestree", categories: ["advertising"] }) },
      ]),
      consentMode: {
        gtagPresent: false,
        defaultCallPresent: true,
        grantedByDefault: [],
        handlesAdUserData: true,
      },
    }),
    alsoExpected: ["KZC-DEPOT-004"],
  },

  /* ══════════════════════════ Famille BANNER ═════════════════════════ */

  {
    ruleId: "KZC-BANNER-014",
    scenario:
      "Un bandeau existe et des services soumis à consentement sont présents, sans point de retrait.",
    positive: (o) =>
      withRequests(withoutLegalPage(o, "cookies"), [
        { tracker: tracker({ slug: "pub-sans-retrait", categories: ["advertising"] }) },
      ]),
    // Sans service soumis à consentement, l'absence de point de retrait n'a
    // rien à retirer.
    negative: (o) => withoutLegalPage(o, "cookies"),
    alsoExpected: ["KZC-DEPOT-004", "KZC-DOC-003"],
  },

  /* ══════════════════════════ Famille EXEMPT ═════════════════════════ */

  {
    ruleId: "KZC-EXEMPT-001",
    scenario: "Une mesure d'audience éligible à l'exemption est hébergée dans l'EEE.",
    positive: (o) =>
      withRequests(o, [
        {
          tracker: tracker({
            slug: "mesure-exemptee",
            categories: ["analytics"],
            exemptEligible: true,
          }),
        },
      ]),
  },
  {
    ruleId: "KZC-EXEMPT-002",
    scenario: "La même mesure d'audience est en mode hébergé hors EEE.",
    positive: (o) =>
      withRequests(o, [
        {
          tracker: tracker({
            slug: "mesure-hebergee",
            categories: ["analytics"],
            exemptEligible: true,
            hqJurisdiction: "GB",
            effectiveJurisdiction: "GB",
            adequacy: "ADEQUATE",
          }),
        },
      ]),
  },

  /* ═════════════════════════ Famille TRANSFER ════════════════════════ */

  {
    ruleId: "KZC-TRANSFER-001",
    scenario: "Un service soumis à consentement reçoit des données hors EEE.",
    positive: (o) =>
      withRequests(o, [
        {
          tracker: tracker({
            slug: "pub-hors-eee",
            categories: ["advertising"],
            hqJurisdiction: "GB",
            effectiveJurisdiction: "GB",
            adequacy: "ADEQUATE",
          }),
        },
      ]),
    // Un destinataire hors EEE qui n'appelle PAS de consentement ne relève pas
    // de cette règle. Sans ce négatif, une carte ou un CDN britannique
    // déclencherait un constat de transfert avant consentement.
    negative: (o) =>
      withRequests(o, [
        {
          tracker: tracker({
            slug: "carte-hors-eee",
            hqJurisdiction: "GB",
            effectiveJurisdiction: "GB",
            adequacy: "ADEQUATE",
          }),
        },
      ]),
    alsoExpected: ["KZC-DEPOT-004"],
  },
  {
    ruleId: "KZC-TRANSFER-002",
    scenario: "Un destinataire est établi dans un pays sans décision d'adéquation.",
    positive: (o) =>
      withRequests(o, [
        {
          tracker: tracker({
            slug: "sans-adequation",
            hqJurisdiction: "CN",
            effectiveJurisdiction: "CN",
            adequacy: "NONE",
          }),
        },
      ]),
  },
  {
    ruleId: "KZC-TRANSFER-003",
    scenario: "Un destinataire américain est invoqué sans certification DPF confirmée.",
    positive: (o) =>
      withRequests(o, [
        {
          tracker: tracker({
            slug: "dpf-non-confirme",
            hqJurisdiction: "US",
            effectiveJurisdiction: "US",
            adequacy: "DPF_CONDITIONAL",
          }),
        },
      ]),
    // Le même destinataire AVEC certification vérifiée ne doit rien déclencher.
    // C'est le négatif le plus important de la famille : accuser un
    // destinataire réellement certifié est un constat faux, et vérifiable.
    negative: (o) =>
      withRequests(o, [
        {
          tracker: tracker({
            slug: "dpf-confirme",
            hqJurisdiction: "US",
            effectiveJurisdiction: "US",
            adequacy: "DPF_CONDITIONAL",
            dpf: { certified: true, checkedAt: "2026-08-01" },
          }),
        },
      ]),
  },
  {
    ruleId: "KZC-TRANSFER-005",
    scenario: "Un destinataire relève d'une juridiction organisant un accès étatique étendu.",
    positive: (o) =>
      withRequests(o, [
        {
          tracker: tracker({
            slug: "acces-etendu",
            hqJurisdiction: "CN",
            effectiveJurisdiction: "CN",
            adequacy: "EXTENDED_ACCESS",
          }),
        },
      ]),
  },
  {
    ruleId: "KZC-TRANSFER-006",
    scenario: "Un fournisseur à façade européenne appartient en dernier ressort à un groupe américain.",
    positive: (o) =>
      withRequests(o, [
        {
          tracker: tracker({
            slug: "facade-europeenne",
            hqJurisdiction: "IE",
            effectiveJurisdiction: "US",
            ultimateParent: "Fixture Holdings Inc.",
            adequacy: "DPF_CONDITIONAL",
            // Certification confirmée : la règle porte sur la CHAÎNE
            // capitalistique, pas sur le statut DPF. Le négatif de
            // KZC-TRANSFER-003 le prouve dans l'autre sens.
            dpf: { certified: true, checkedAt: "2026-08-01" },
          }),
        },
      ]),
    // Une entité irlandaise réellement européenne ne doit pas être rattrapée
    // par cette règle : ce serait accuser tout fournisseur établi en Irlande.
    negative: (o) =>
      withRequests(o, [{ tracker: tracker({ slug: "irlandais-reel", hqJurisdiction: "IE" }) }]),
  },
  {
    ruleId: "KZC-TRANSFER-007",
    scenario:
      "Des destinataires hors EEE sont observés et la politique n'évoque aucune garantie de transfert.",
    positive: (o) =>
      withSignals(
        withRequests(o, [
          {
            tracker: tracker({
              slug: "hors-eee-sans-garantie",
              hqJurisdiction: "GB",
              effectiveJurisdiction: "GB",
              adequacy: "ADEQUATE",
            }),
          },
        ]),
        without("transfers"),
      ),
    // Sans destinataire hors EEE, l'absence de mention des garanties de
    // transfert n'est pas un manquement : il n'y a rien à garantir.
    negative: (o) => withSignals(o, without("transfers")),
    // Même condition exacte que KZC-DOC-011 : l'une constate le défaut de
    // garantie, l'autre le défaut d'information. Elles vont nécessairement
    // ensemble, et c'est voulu.
    alsoExpected: ["KZC-DOC-011"],
  },

  /* ══════════════════════════ Famille VENDOR ═════════════════════════ */

  {
    ruleId: "KZC-VENDOR-004",
    scenario: "Un service d'enchères publicitaires en temps réel est présent.",
    positive: (o) => withRequests(o, [{ tracker: tracker({ slug: "rtb", categories: ["rtb"] }) }]),
  },
  {
    ruleId: "KZC-VENDOR-007",
    scenario: "Plus de trente entités distinctes sont contactées depuis la même page.",
    positive: (o) =>
      withRequests(
        o,
        Array.from({ length: 31 }, (_, i) => ({ tracker: tracker({ slug: `destinataire-${i}` }) })),
      ),
    // Juste sous le seuil : la règle ne doit pas se déclencher à 30. Un seuil
    // qui déborde d'une unité est invisible à la lecture du code.
    negative: (o) =>
      withRequests(
        o,
        Array.from({ length: 30 }, (_, i) => ({ tracker: tracker({ slug: `destinataire-${i}` }) })),
      ),
  },

  /* ═══════════════════════════ Famille DOC ═══════════════════════════ */

  {
    ruleId: "KZC-DOC-011",
    scenario: "Des transferts hors UE ont lieu sans que la politique les mentionne.",
    positive: (o) =>
      withSignals(
        withRequests(o, [
          {
            tracker: tracker({
              slug: "hors-eee-non-mentionne",
              hqJurisdiction: "GB",
              effectiveJurisdiction: "GB",
              adequacy: "ADEQUATE",
            }),
          },
        ]),
        without("transfers"),
      ),
    negative: (o) => withSignals(o, without("transfers")),
    alsoExpected: ["KZC-TRANSFER-007"],
  },
  {
    ruleId: "KZC-DOC-017",
    scenario: "Les mentions légales n'identifient pas l'hébergeur.",
    positive: (o) => withLegalSignals(o, []),
    // Sans mentions légales du tout, c'est KZC-DOC-002 qui s'applique, pas
    // celle-ci : on ne reproche pas un hébergeur manquant sur une page absente.
    negative: (o) => withoutLegalPage(o, "legal"),
  },

  /* ═════════════════════════ Famille SPECIAL ═════════════════════════ */

  {
    ruleId: "KZC-SPECIAL-002",
    scenario: "Une thématique de santé coexiste avec des traceurs publicitaires.",
    positive: (o) => ({
      ...withRequests(o, [
        { tracker: tracker({ slug: "pub-sur-site-sante", categories: ["advertising"] }) },
      ]),
      sensitiveTopics: ["health"],
    }),
    // La thématique sensible SEULE, sans traceur publicitaire, n'est pas un
    // manquement. Un site médical sobre ne doit pas être inquiété.
    negative: (o) => ({ ...o, sensitiveTopics: ["health"] }),
    alsoExpected: ["KZC-DEPOT-004"],
  },
  {
    ruleId: "KZC-SPECIAL-005",
    scenario:
      "Une politique de référent permissive expose l'adresse des pages à plusieurs destinataires.",
    positive: (o) => ({
      ...withRequests(o, [
        { tracker: tracker({ slug: "tiers-a" }) },
        { tracker: tracker({ slug: "tiers-b" }) },
        { tracker: tracker({ slug: "tiers-c" }) },
      ]),
      headers: { ...o.headers, referrerPolicy: "unsafe-url" },
    }),
    // La même politique permissive avec deux destinataires seulement reste
    // sous le seuil : c'est le cumul qui fait le constat.
    negative: (o) => ({
      ...withRequests(o, [
        { tracker: tracker({ slug: "tiers-a" }) },
        { tracker: tracker({ slug: "tiers-b" }) },
      ]),
      headers: { ...o.headers, referrerPolicy: "unsafe-url" },
    }),
    // Une politique de référent permissive est aussi un défaut de sécurité en
    // soi : les deux règles observent le même en-tête sous deux angles.
    alsoExpected: ["KZC-SEC-002"],
  },
];
