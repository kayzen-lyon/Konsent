import { matchHostname, matchUrl } from "../trackers/db";
import { matchCookieName, trackerForCookieName } from "../seo/cookies";
import type { TrackerEntity } from "../trackers/types";
import type {
  CmpDetection,
  Observation,
  ObservedCookie,
  ObservedRequest,
} from "./types";

/**
 * Conversion de la sortie du worker navigateur en `Observation`.
 *
 * Le worker et l'application sont volontairement découplés : le worker ne
 * connaît ni le référentiel ni la base des destinataires, il se contente
 * d'observer et de produire un instantané brut. C'est ici que cet
 * instantané est rapproché de la connaissance métier.
 *
 * Bénéfice : le même évaluateur traite les deux moteurs. Une règle écrite
 * une fois vaut pour l'analyse statique comme pour le protocole complet.
 */

export interface WorkerRequest {
  url: string;
  hostname: string;
  resourceType: string;
  tMs: number;
}

export interface WorkerCookie {
  name: string;
  domain: string;
  path: string;
  /** Horodatage Unix en secondes ; -1 pour un cookie de session. */
  expires: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
}

export interface WorkerSnapshot {
  phase: "A" | "B" | "C";
  requests: WorkerRequest[];
  cookies: WorkerCookie[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  serviceWorkers: string[];
  fingerprinting: Record<string, number>;
  consentMode: { dataLayer?: unknown[] } | null;
  tcString: string | null;
  /**
   * `window.__tcfapi` était-il exposé ? Absent des sorties produites par un
   * worker antérieur : on le déduit alors de la présence d'une chaîne.
   */
  tcfApiPresent?: boolean;
  /**
   * La CMP a-t-elle répondu avec succès ? Une interface présente mais muette
   * (stub seul, CMP bloquée) ne permet pas de conclure à l'absence de chaîne.
   */
  tcfResponded?: boolean;
  /** Origine de la chaîne : réponse de l'API, ou repli sur le cookie `euconsent-v2`. */
  tcStringSource?: "api" | "cookie";
}

export interface WorkerBanner {
  resolution: "API" | "SELECTOR" | "HEURISTIC" | "UNRESOLVED";
  cmpName?: string;
  clicksToReject: number | null;
  clicksToAccept: number | null;
  hasRejectAtFirstLevel: boolean;
}

export interface WorkerOutput {
  url: string;
  mode: "headless";
  scannedAt: string;
  bannerResolution: WorkerBanner["resolution"];
  /**
   * Le bouton de refus a-t-il été cliqué en phase B ? Absent des sorties d'un
   * worker antérieur : les constats « après refus » qui en dépendent sont
   * alors déclarés non évalués plutôt que présumés.
   */
  refusalClicked?: boolean;
  banner: WorkerBanner;
  snapshots: WorkerSnapshot[];
}

/** Une valeur ressemble-t-elle à un identifiant persistant ? */
export function looksLikeIdentifier(value: string): boolean {
  if (value.length < 8 || value.length > 512) return false;
  // Forte proportion de caractères de base64 / hexadécimal, peu de mots.
  const entropyish = /^[A-Za-z0-9_.:%-]{8,}$/.test(value);
  const hasDigits = /\d/.test(value);
  const hasLetters = /[A-Za-z]/.test(value);
  return entropyish && hasDigits && hasLetters;
}

function toRequests(snapshot: WorkerSnapshot, pageHost: string): ObservedRequest[] {
  const out: ObservedRequest[] = [];
  const seen = new Set<string>();

  for (const r of snapshot.requests) {
    if (seen.has(r.url)) continue;
    seen.add(r.url);
    if (r.hostname === pageHost) continue;

    const tracker = matchUrl(r.url);
    const origin: ObservedRequest["origin"] =
      r.resourceType === "script"
        ? "script"
        : r.resourceType === "document" || r.resourceType === "sub_frame"
          ? "iframe"
          : r.resourceType === "image"
            ? "img"
            : r.resourceType === "xhr" || r.resourceType === "fetch"
              ? "connect"
              : "link";

    out.push({
      url: r.url,
      hostname: r.hostname,
      origin,
      ...(tracker ? { tracker } : {}),
      tMs: r.tMs,
      phase: snapshot.phase,
    });
  }
  return out;
}

function toCookies(snapshot: WorkerSnapshot): ObservedCookie[] {
  const nowSeconds = Date.now() / 1000;

  return snapshot.cookies.map((c) => {
    const lifetimeDays =
      c.expires === -1 || c.expires === 0
        ? null
        : Math.round(((c.expires - nowSeconds) / 86_400) * 10) / 10;

    const domain = c.domain.replace(/^\./, "");

    // Le rapprochement par NOM prime sur le rapprochement par domaine :
    // les cookies les plus significatifs (_fbp, _ga, _gcl_au) sont posés
    // par des scripts tiers sur le domaine du site lui-même.
    const tracker = trackerForCookieName(c.name) ?? matchHostname(domain);

    return {
      name: c.name,
      domain,
      path: c.path,
      lifetimeDays,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite || null,
      // Un cookie observé dans le navigateur peut provenir d'un en-tête ou
      // d'un script ; le worker ne distingue pas les deux à ce stade.
      source: "js" as const,
      ...(tracker ? { tracker } : {}),
      phase: snapshot.phase,
    };
  });
}

function toCmp(banner: WorkerBanner): CmpDetection {
  const method: CmpDetection["method"] =
    banner.resolution === "API"
      ? "api_signature"
      : banner.resolution === "SELECTOR"
        ? "selector"
        : banner.resolution === "HEURISTIC"
          ? "heuristic"
          : "unresolved";

  return {
    detected: banner.resolution !== "UNRESOLVED",
    ...(banner.cmpName ? { name: banner.cmpName } : {}),
    method,
    confidence:
      banner.resolution === "API" ? "high" : banner.resolution === "SELECTOR" ? "medium" : "low",
  };
}

/**
 * Convertit la sortie du worker en observation exploitable par
 * l'évaluateur.
 *
 * L'observation renvoyée agrège les trois phases : les constats propres à
 * chaque phase restent identifiables par le champ `phase` de chaque requête
 * et de chaque cookie.
 */
export function observationFromWorker(
  output: WorkerOutput,
  statics?: Partial<Pick<Observation, "legalPages" | "dns" | "headers" | "sensitiveTopics" | "formsInsecure">>,
): Observation {
  const url = new URL(output.url);
  const pageHost = url.hostname;

  const phaseA = output.snapshots.find((s) => s.phase === "A");
  const requests: ObservedRequest[] = [];
  const cookies: ObservedCookie[] = [];

  for (const snapshot of output.snapshots) {
    requests.push(...toRequests(snapshot, pageHost));
    cookies.push(...toCookies(snapshot));
  }

  // Consent Mode : on lit le dataLayer capté en phase A.
  const dataLayer = (phaseA?.consentMode?.dataLayer ?? []) as unknown[];
  const serialised = JSON.stringify(dataLayer);
  const grantedByDefault: string[] = [];
  for (const key of ["ad_storage", "analytics_storage", "ad_user_data", "ad_personalization"]) {
    if (new RegExp(`"${key}"\\s*:\\s*"granted"`).test(serialised)) grantedByDefault.push(key);
  }

  return {
    url: output.url,
    finalUrl: output.url,
    hostname: pageHost,
    mode: "headless",
    httpStatus: 200,
    durationMs: 0,
    requests,
    cookies,
    cmp: toCmp(output.banner),
    legalPages: statics?.legalPages ?? [],
    dns: statics?.dns ?? [],
    headers:
      statics?.headers ?? {
        hsts: null,
        csp: null,
        referrerPolicy: null,
        permissionsPolicy: null,
        xContentTypeOptions: null,
      },
    consentMode: {
      gtagPresent: requests.some((r) => r.hostname.includes("googletagmanager.com")),
      defaultCallPresent: serialised.includes("consent") && serialised.includes("default"),
      grantedByDefault,
      handlesAdUserData:
        serialised.includes("ad_user_data") && serialised.includes("ad_personalization"),
    },
    sensitiveTopics: statics?.sensitiveTopics ?? [],
    formsInsecure: statics?.formsInsecure ?? [],
    pagesAnalyzed: output.snapshots.length,
  };
}

/**
 * Constats propres au protocole en trois phases.
 *
 * Ces règles ne sont évaluables qu'en comparant les phases entre elles :
 * c'est tout l'intérêt du protocole, et ce que l'analyse statique ne peut
 * structurellement pas produire.
 */
export interface PhaseComparison {
  /** Traceurs soumis à consentement présents dès la phase A. */
  depositedBeforeConsent: readonly TrackerEntity[];
  /** Traceurs encore présents après un refus explicite. */
  survivingRefusal: readonly TrackerEntity[];
  /** Cookies non exemptés observés en phase A. */
  cookiesBeforeConsent: readonly ObservedCookie[];
  /** Cookies encore présents en phase B. */
  cookiesAfterRefusal: readonly ObservedCookie[];
  /** Identifiants persistants écrits en stockage local dès la phase A. */
  storageIdentifiersBeforeConsent: readonly string[];
  /** Techniques d'empreinte comptées en phase A. */
  fingerprintingBeforeConsent: Record<string, number>;
  /** Techniques d'empreinte toujours actives après refus. */
  fingerprintingAfterRefusal: Record<string, number>;
  serviceWorkersBeforeConsent: readonly string[];
  /** Le refus est-il accessible au premier niveau ? */
  rejectAtFirstLevel: boolean;
  clicksToReject: number | null;
  clicksToAccept: number | null;
  tcStringAfterRefusal: string | null;
  /** Le refus a-t-il été cliqué en phase B ? */
  refusalClicked: boolean;
  /**
   * Cookies vus en phase A ou C, dédoublonnés par nom et domaine. Sert aux
   * contrôles qui portent sur les attributs ou la durée d'un cookie, pas sur
   * le moment de son dépôt.
   */
  cookiesObserved: readonly ObservedCookie[];
  /** Le site est-il servi en HTTPS ? Conditionne le contrôle de `Secure`. */
  https: boolean;
  pageHost: string;
}

const CONSENT_CATEGORIES = new Set([
  "advertising",
  "social",
  "session_replay",
  "rtb",
  "ab_testing",
  "marketing_automation",
]);

function needsConsent(t: TrackerEntity): boolean {
  return !t.exemptEligible && t.categories.some((c) => CONSENT_CATEGORIES.has(c));
}

export function comparePhases(output: WorkerOutput): PhaseComparison {
  const pageHost = new URL(output.url).hostname;
  const a = output.snapshots.find((s) => s.phase === "A");
  const b = output.snapshots.find((s) => s.phase === "B");

  const trackersOf = (snapshot?: WorkerSnapshot): TrackerEntity[] => {
    if (!snapshot) return [];
    const found = new Map<string, TrackerEntity>();
    for (const r of snapshot.requests) {
      if (r.hostname === pageHost) continue;
      const tracker = matchUrl(r.url);
      if (tracker && needsConsent(tracker)) found.set(tracker.slug, tracker);
    }
    return [...found.values()];
  };

  const cookiesOf = (snapshot?: WorkerSnapshot): ObservedCookie[] =>
    snapshot
      ? toCookies(snapshot).filter((c) => {
          const tracker = c.tracker;
          return tracker ? needsConsent(tracker) : false;
        })
      : [];

  const storageIds = Object.entries(a?.localStorage ?? {})
    .filter(([, value]) => looksLikeIdentifier(value))
    .map(([key]) => key);

  return {
    depositedBeforeConsent: trackersOf(a),
    survivingRefusal: trackersOf(b),
    cookiesBeforeConsent: cookiesOf(a),
    cookiesAfterRefusal: cookiesOf(b),
    storageIdentifiersBeforeConsent: storageIds,
    fingerprintingBeforeConsent: a?.fingerprinting ?? {},
    fingerprintingAfterRefusal: b?.fingerprinting ?? {},
    serviceWorkersBeforeConsent: a?.serviceWorkers ?? [],
    rejectAtFirstLevel: output.banner.hasRejectAtFirstLevel,
    clicksToReject: output.banner.clicksToReject,
    clicksToAccept: output.banner.clicksToAccept,
    // Sans refus effectivement cliqué, la chaîne de phase B n'est pas une
    // chaîne « après refus » : elle ne doit pas nourrir KZC-REFUS-006.
    tcStringAfterRefusal: output.refusalClicked === true ? (b?.tcString ?? null) : null,
    refusalClicked: output.refusalClicked === true,
    cookiesObserved: [
      ...new Map(
        [a, output.snapshots.find((s) => s.phase === "C")]
          .flatMap((s) => (s ? toCookies(s) : []))
          .map((c) => [`${c.name}@${c.domain}`, c] as const),
      ).values(),
    ],
    https: new URL(output.url).protocol === "https:",
    pageHost,
  };
}
