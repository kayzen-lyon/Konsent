import { promises as dns } from "node:dns";
import {
  extractInlineScripts,
  extractLinks,
  extractRefs,
  normalize,
  stripTags,
} from "./html";
import {
  CMP_API_SIGNATURES,
  CMP_SELECTOR_HINTS,
  COOKIES_LEXICON,
  LEGAL_LEXICON,
  POLICY_SIGNALS,
  PRIVACY_LEXICON,
  SENSITIVE_TOPICS,
  TERMS_LEXICON,
} from "./lexicons";
import { matchHostname, matchUrl, TRACKERS } from "../trackers/db";
import { trackerForCookieName } from "../seo/cookies";
import type { TrackerEntity } from "../trackers/types";
import type {
  CmpDetection,
  DnsResolution,
  LegalPage,
  Observation,
  ObservedCookie,
  ObservedRequest,
  SecurityHeaders,
} from "./types";

/**
 * User-Agent identifiable, conformément à l'engagement d'éthique du crawl
 * (§5.6) : on se présente, on ne se dissimule pas.
 */
const USER_AGENT =
  "Mozilla/5.0 (compatible; KonsentBot/1.0; +https://konsent.fr/bot) AppleWebKit/537.36";

const FETCH_TIMEOUT_MS = 12_000;
const TOTAL_BUDGET_MS = 45_000;
const MAX_LEGAL_PAGES = 4;
const MAX_CNAME_LOOKUPS = 12;

/**
 * Seuil au-delà duquel le texte extrait d'une page légale est jugé
 * exploitable. En dessous, on est presque toujours face à une coque rendue
 * côté client : l'absence d'un lexique n'y prouve rien.
 */
const MIN_SUBSTANTIVE_TEXT = 1_200;

interface FetchOutcome {
  ok: boolean;
  status: number;
  finalUrl: string;
  html: string;
  headers: Headers;
  durationMs: number;
}

async function fetchPage(url: string, signal?: AbortSignal): Promise<FetchOutcome> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  signal?.addEventListener("abort", onParentAbort, { once: true });

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
    });
    const contentType = res.headers.get("content-type") ?? "";
    const html = contentType.includes("text/") || contentType.includes("xml")
      ? (await res.text()).slice(0, 3_000_000)
      : "";
    return {
      ok: res.ok,
      status: res.status,
      finalUrl: res.url || url,
      html,
      headers: res.headers,
      durationMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onParentAbort);
  }
}

/** Analyse des en-têtes `Set-Cookie` reçus sur la réponse. */
function parseSetCookies(headers: Headers, pageHost: string): ObservedCookie[] {
  const raw: string[] =
    typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  const cookies: ObservedCookie[] = [];

  for (const line of raw) {
    const parts = line.split(";").map((p) => p.trim());
    const first = parts[0];
    if (!first) continue;
    const eq = first.indexOf("=");
    if (eq <= 0) continue;
    const name = first.slice(0, eq);

    let domain = pageHost;
    let path = "/";
    let lifetimeDays: number | null = null;
    let secure = false;
    let httpOnly = false;
    let sameSite: string | null = null;

    for (const attr of parts.slice(1)) {
      const [rawKey, ...rest] = attr.split("=");
      const key = (rawKey ?? "").toLowerCase();
      const value = rest.join("=");
      if (key === "domain" && value) domain = value.replace(/^\./, "");
      else if (key === "path" && value) path = value;
      else if (key === "secure") secure = true;
      else if (key === "httponly") httpOnly = true;
      else if (key === "samesite") sameSite = value || null;
      else if (key === "max-age" && value) {
        const seconds = Number(value);
        if (Number.isFinite(seconds)) lifetimeDays = seconds / 86_400;
      } else if (key === "expires" && value && lifetimeDays === null) {
        const when = Date.parse(value);
        if (Number.isFinite(when)) lifetimeDays = (when - Date.now()) / 86_400_000;
      }
    }

    // Rapprochement par nom d'abord : un cookie posé par un script tiers
    // l'est sur le domaine du site, jamais sur celui du tiers.
    const tracker = trackerForCookieName(name) ?? matchHostname(domain);

    cookies.push({
      name,
      domain,
      path,
      lifetimeDays: lifetimeDays === null ? null : Math.round(lifetimeDays * 10) / 10,
      secure,
      httpOnly,
      sameSite,
      source: "http",
      ...(tracker ? { tracker } : {}),
      phase: "A",
    });
  }
  return cookies;
}

function readSecurityHeaders(headers: Headers): SecurityHeaders {
  return {
    hsts: headers.get("strict-transport-security"),
    csp:
      headers.get("content-security-policy") ??
      headers.get("content-security-policy-report-only"),
    referrerPolicy: headers.get("referrer-policy"),
    permissionsPolicy: headers.get("permissions-policy") ?? headers.get("feature-policy"),
    xContentTypeOptions: headers.get("x-content-type-options"),
  };
}

/**
 * Détection du dispositif de recueil du consentement, en cascade (§5.4).
 * Lorsque rien ne permet de conclure, on renvoie `unresolved` plutôt qu'un
 * faux négatif silencieux.
 */
function detectCmp(html: string, inlineJs: string, refs: readonly string[]): CmpDetection {
  const haystack = html + "\n" + inlineJs + "\n" + refs.join("\n");

  for (const sig of CMP_API_SIGNATURES) {
    if (haystack.includes(sig.marker)) {
      return {
        detected: true,
        name: sig.name,
        ...(sig.slug ? { slug: sig.slug } : {}),
        method: "api_signature",
        confidence: "high",
      };
    }
  }

  const lowered = html.toLowerCase();
  for (const hint of CMP_SELECTOR_HINTS) {
    if (lowered.includes(hint.toLowerCase())) {
      return { detected: true, name: "Bandeau détecté par sélecteur", method: "selector", confidence: "medium" };
    }
  }

  // Heuristique de dernier recours : lexique cookies dans un bloc contenant
  // au moins deux éléments cliquables.
  const text = normalize(stripTags(html));
  const mentionsCookies =
    text.includes("cookie") || text.includes("traceur") || text.includes("consentement");
  const hasButtons = (html.match(/<button\b/gi) ?? []).length >= 2;
  if (mentionsCookies && hasButtons) {
    return {
      detected: true,
      name: "Bandeau probable (heuristique générique)",
      method: "heuristic",
      confidence: "low",
    };
  }
  if (mentionsCookies) {
    return { detected: false, method: "unresolved", confidence: "low" };
  }
  return { detected: false, method: "unresolved", confidence: "medium" };
}

/**
 * Chemins d'URL caractéristiques, par type de page. Le chemin est un signal
 * bien plus fiable que le libellé du lien : un article éditorial intitulé
 * « Données personnelles et IA » n'est pas une politique de confidentialité.
 */
const PATH_HINTS: Record<LegalPage["kind"], readonly string[]> = {
  cookies: ["cookie", "gestion-des-cookies", "politique-cookies", "traceurs"],
  privacy: [
    "politique-de-confidentialite",
    "politique-confidentialite",
    "confidentialite",
    "privacy-policy",
    "privacy",
    "donnees-personnelles",
    "protection-des-donnees",
    "vie-privee",
    "datenschutz",
    "rgpd",
    "gdpr",
  ],
  legal: ["mentions-legales", "mentions_legales", "mentionslegales", "legal-notice", "impressum", "informations-legales"],
  terms: ["conditions-generales", "cgu", "cgv", "conditions-utilisation", "terms"],
};

const TEXT_LEXICONS: Record<LegalPage["kind"], readonly string[]> = {
  cookies: COOKIES_LEXICON,
  privacy: PRIVACY_LEXICON,
  legal: LEGAL_LEXICON,
  terms: TERMS_LEXICON,
};

/** Chemins qui trahissent un contenu éditorial plutôt qu'une page légale. */
const EDITORIAL_MARKERS = [
  "/actualite",
  "/actualites",
  "/article",
  "/blog",
  "/news",
  "/presse",
  "/dossier",
  "/publication",
  "/questions-reponses",
  "/fiche",
];

interface LegalCandidate {
  kind: LegalPage["kind"];
  url: string;
  label: string;
  score: number;
}

/**
 * Note un lien comme page légale candidate. Un score nul signifie « ce n'est
 * pas une page légale ». Plus le score est élevé, plus le candidat est sûr.
 */
function scoreLegalLink(text: string, url: URL): LegalCandidate | null {
  const path = normalize(url.pathname);
  const label = normalize(text);

  // L'ordre compte : « politique cookies » l'emporte sur « politique de
  // confidentialité », dont elle partage le préfixe.
  const kinds: readonly LegalPage["kind"][] = ["cookies", "privacy", "legal", "terms"];

  let best: LegalCandidate | null = null;
  for (const kind of kinds) {
    let score = 0;

    for (const hint of PATH_HINTS[kind]) {
      if (path.includes(hint)) {
        // Un segment de chemin exact vaut mieux qu'une simple inclusion.
        const isSegment = path.split("/").some((seg) => seg === hint);
        score += isSegment ? 100 : 60;
        break;
      }
    }

    for (const term of TEXT_LEXICONS[kind]) {
      const t = normalize(term);
      // Un libellé court et entièrement dédié est un bon signal ;
      // une mention noyée dans un titre d'article ne l'est pas.
      if (label === t) {
        score += 80;
        break;
      }
      if (label.includes(t) && label.length <= t.length + 24) {
        score += 40;
        break;
      }
    }

    if (score === 0) continue;

    // Pénalités : contenu éditorial, chemin profond, URL très longue.
    if (EDITORIAL_MARKERS.some((m) => path.includes(m))) score -= 90;
    const depth = path.split("/").filter(Boolean).length;
    if (depth > 3) score -= 25;
    if (path.length > 80) score -= 20;

    if (score > 0 && (!best || score > best.score)) {
      best = { kind, url: url.toString(), label: text || url.pathname, score };
    }
  }
  return best;
}

async function inspectLegalPages(
  html: string,
  baseUrl: string,
  deadline: number,
  signal?: AbortSignal,
): Promise<LegalPage[]> {
  const links = extractLinks(html, baseUrl);
  const origin = new URL(baseUrl).origin;

  // On retient, pour chaque type, le meilleur candidat plutôt que le premier
  // rencontré : le pied de page contient souvent plusieurs liens voisins.
  const best = new Map<LegalPage["kind"], LegalCandidate>();
  for (const link of links) {
    let url: URL;
    try {
      url = new URL(link.href);
    } catch {
      continue;
    }
    if (url.origin !== origin) continue;
    const candidate = scoreLegalLink(link.text, url);
    if (!candidate) continue;
    const current = best.get(candidate.kind);
    if (!current || candidate.score > current.score) best.set(candidate.kind, candidate);
  }

  const pages: LegalPage[] = [];
  const ordered = [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LEGAL_PAGES)
    .map((c): LegalPage => ({ kind: c.kind, url: c.url, label: c.label, reachable: false }));

  for (const page of ordered) {
    if (Date.now() > deadline) {
      pages.push(page);
      continue;
    }
    try {
      const res = await fetchPage(page.url, signal);
      const text = normalize(stripTags(res.html));
      const signals = POLICY_SIGNALS.filter((s) =>
        s.terms.some((t) => text.includes(normalize(t))),
      ).map((s) => s.key);
      pages.push({
        ...page,
        reachable: res.ok,
        textLength: text.length,
        substantive: text.length >= MIN_SUBSTANTIVE_TEXT,
        signals,
      });
    } catch {
      pages.push(page);
    }
  }
  return pages;
}

/** Résolution des chaînes CNAME, pour la détection du masquage (§16, n°6). */
async function resolveCnames(
  hostnames: readonly string[],
  pageHost: string,
  deadline: number,
): Promise<DnsResolution[]> {
  const eTld1 = pageHost.split(".").slice(-2).join(".");
  const firstParty = hostnames.filter(
    (h) => h !== pageHost && (h === eTld1 || h.endsWith("." + eTld1)),
  );

  const out: DnsResolution[] = [];
  for (const host of firstParty.slice(0, MAX_CNAME_LOOKUPS)) {
    if (Date.now() > deadline) break;
    try {
      const chain = await dns.resolveCname(host);
      if (chain.length === 0) continue;
      const cloaked = chain
        .map((target) => matchHostname(target))
        .find((t): t is TrackerEntity => Boolean(t));
      out.push({
        hostname: host,
        cnameChain: chain,
        ...(cloaked ? { cloakedTracker: cloaked } : {}),
      });
    } catch {
      // Absence de CNAME ou résolution impossible : cas normal, non signalé.
    }
  }
  return out;
}

function detectConsentMode(html: string, inlineJs: string): Observation["consentMode"] {
  const hay = html + "\n" + inlineJs;
  const gtagPresent =
    hay.includes("googletagmanager.com/gtag") ||
    hay.includes("gtag(") ||
    hay.includes("googletagmanager.com/gtm.js");

  const defaultCall = /gtag\s*\(\s*['"]consent['"]\s*,\s*['"]default['"]/.test(hay);

  // Repère les clés déclarées « granted » dans le bloc de consentement par défaut.
  const granted: string[] = [];
  const defaultBlock = hay.match(
    /gtag\s*\(\s*['"]consent['"]\s*,\s*['"]default['"]\s*,\s*(\{[\s\S]{0,600}?\})/,
  );
  if (defaultBlock?.[1]) {
    const block = defaultBlock[1];
    for (const key of ["ad_storage", "analytics_storage", "ad_user_data", "ad_personalization"]) {
      const re = new RegExp(`['"]?${key}['"]?\\s*:\\s*['"]granted['"]`);
      if (re.test(block)) granted.push(key);
    }
  }

  const handlesAdUserData = hay.includes("ad_user_data") && hay.includes("ad_personalization");
  return { gtagPresent, defaultCallPresent: defaultCall, grantedByDefault: granted, handlesAdUserData };
}

function detectSensitiveTopics(text: string): string[] {
  const found: string[] = [];
  for (const topic of SENSITIVE_TOPICS) {
    const hits = topic.terms.filter((t) => text.includes(normalize(t))).length;
    // Deux occurrences minimum : réduit le bruit d'une mention isolée.
    if (hits >= 2) found.push(topic.key);
  }
  return found;
}

/**
 * Exécute une observation statique complète d'une page.
 *
 * Ce moteur n'exécute AUCUN JavaScript. Il constate ce qui est servi par le
 * serveur, ce que le DNS révèle et ce que les pages légales contiennent.
 * Tout ce qui dépend de l'exécution — dépôt réel de cookies JS, comportement
 * après refus, empreinte du terminal — relève du moteur headless et est
 * reporté en « non évalué ».
 */
export async function runStaticScan(
  targetUrl: string,
  signal?: AbortSignal,
): Promise<Observation> {
  const started = Date.now();
  const deadline = started + TOTAL_BUDGET_MS;

  const main = await fetchPage(targetUrl, signal);
  const baseUrl = main.finalUrl;
  const pageHost = new URL(baseUrl).hostname;

  const refs = extractRefs(main.html, baseUrl);
  const inlineJs = extractInlineScripts(main.html);
  const plainText = normalize(stripTags(main.html));

  // ── Requêtes sortantes observables dans le document ──
  const requests: ObservedRequest[] = [];
  const seenUrls = new Set<string>();
  for (const ref of refs) {
    if (seenUrls.has(ref.url)) continue;
    seenUrls.add(ref.url);
    let host: string;
    try {
      host = new URL(ref.url).hostname;
    } catch {
      continue;
    }
    const tracker = matchUrl(ref.url);
    // Une préconnexion n'est qu'un signal : elle prépare une connexion sans
    // encore transmettre de données applicatives. On la classe à part pour ne
    // pas la traiter comme un chargement effectif.
    const isPreconnect =
      ref.kind === "link" &&
      Boolean(ref.rel && /preconnect|dns-prefetch|preload|prefetch/.test(ref.rel));
    const origin: ObservedRequest["origin"] =
      ref.kind === "script"
        ? "script"
        : ref.kind === "iframe"
          ? "iframe"
          : ref.kind === "img"
            ? "img"
            : ref.kind === "form"
              ? "form"
              : isPreconnect
                ? "connect"
                : "link";
    requests.push({
      url: ref.url,
      hostname: host,
      origin,
      ...(tracker ? { tracker } : {}),
      phase: "A",
    });
  }

  // Marqueurs dans le JS inline : révèle des services chargés dynamiquement,
  // que la seule lecture des balises <script src> manquerait.
  const haystack = main.html + "\n" + inlineJs;
  for (const tracker of TRACKERS) {
    if (!tracker.markers) continue;
    if (!tracker.markers.some((m) => haystack.includes(m))) continue;
    const already = requests.some((r) => r.tracker?.slug === tracker.slug);
    if (already) continue;
    requests.push({
      url: `inline:${tracker.slug}`,
      hostname: tracker.domains[0] ?? tracker.slug,
      origin: "inline",
      tracker,
      phase: "A",
    });
  }

  const cookies = parseSetCookies(main.headers, pageHost);
  const thirdPartyHosts = [...new Set(requests.map((r) => r.hostname))];

  const [legalPages, dnsResolutions] = await Promise.all([
    inspectLegalPages(main.html, baseUrl, deadline, signal),
    resolveCnames(thirdPartyHosts, pageHost, deadline),
  ]);

  const formsInsecure = refs
    .filter((r) => r.kind === "form" && r.url.startsWith("http://"))
    .map((r) => r.url);

  return {
    url: targetUrl,
    finalUrl: baseUrl,
    hostname: pageHost,
    mode: "static",
    httpStatus: main.status,
    durationMs: Date.now() - started,
    requests,
    cookies,
    cmp: detectCmp(main.html, inlineJs, refs.map((r) => r.url)),
    legalPages,
    dns: dnsResolutions,
    headers: readSecurityHeaders(main.headers),
    consentMode: detectConsentMode(main.html, inlineJs),
    sensitiveTopics: detectSensitiveTopics(plainText),
    formsInsecure,
    pagesAnalyzed: 1 + legalPages.filter((p) => p.reachable).length,
  };
}
