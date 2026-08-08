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

const withoutLegalPage = (o: Observation, kind: string): Observation => ({
  ...o,
  legalPages: o.legalPages.filter((p) => p.kind !== kind),
});

const withSignals = (o: Observation, signals: readonly string[]): Observation => ({
  ...o,
  legalPages: o.legalPages.map((p) => (p.kind === "privacy" ? { ...p, signals } : p)),
});



const without = (signal: string) => NEUTRAL_PRIVACY_SIGNALS.filter((s) => s !== signal);

export const FIXTURES: readonly Fixture[] = [
  {
    ruleId: "KZC-DEPOT-005",
    scenario: "Un script de suivi publicitaire est chargé dès le document initial.",
    positive: (o) => withRequest(o, {}),
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
  },
];
