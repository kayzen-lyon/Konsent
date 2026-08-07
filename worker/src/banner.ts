import type { Page } from "playwright";

/**
 * Résolution du bandeau — le point technique le plus difficile (§5.4).
 *
 * Stratégie en cascade : signature d'interface, puis sélecteur connu, puis
 * heuristique générique. Si rien ne permet de conclure, on renvoie
 * `UNRESOLVED` : un scan qui admet son incertitude est plus crédible qu'un
 * scan qui invente.
 */

export type BannerResolution = "API" | "SELECTOR" | "HEURISTIC" | "UNRESOLVED";

export interface BannerInfo {
  resolution: BannerResolution;
  cmpName?: string;
  /** Nombre de clics nécessaires pour refuser, et pour accepter (§16, n°3). */
  clicksToReject: number | null;
  clicksToAccept: number | null;
  hasRejectAtFirstLevel: boolean;
}

const API_SIGNATURES: readonly { key: string; name: string }[] = [
  { key: "__tcfapi", name: "Plateforme compatible IAB TCF v2.2" },
  { key: "Cookiebot", name: "Cookiebot" },
  { key: "axeptioSDK", name: "Axeptio" },
  { key: "OneTrust", name: "OneTrust" },
  { key: "Didomi", name: "Didomi" },
  { key: "tarteaucitron", name: "tarteaucitron.js" },
  { key: "UC_UI", name: "Usercentrics" },
  { key: "Osano", name: "Osano" },
  { key: "klaro", name: "Klaro" },
];

const CONTAINER_SELECTORS = [
  "#onetrust-banner-sdk",
  "#CybotCookiebotDialog",
  "#axeptio_overlay",
  "#didomi-notice",
  "#tarteaucitronAlertBig",
  "#usercentrics-root",
  "#cmplz-cookiebanner-container",
  ".cky-consent-container",
  "#cookie-banner",
  "#cookie-consent",
  ".cookie-notice",
  "[id*='cookie'][class*='banner']",
  "[class*='cookie-consent']",
  "[class*='consent-banner']",
];

/** Lexique de classification des boutons (§5.4, point 4). */
const REJECT_WORDS = [
  "tout refuser",
  "refuser tout",
  "continuer sans accepter",
  "poursuivre sans accepter",
  "je refuse",
  "refuser",
  "non merci",
  "reject all",
  "decline",
];

const ACCEPT_WORDS = [
  "tout accepter",
  "accepter tout",
  "j'accepte",
  "jaccepte",
  "accepter",
  "ok pour moi",
  "autoriser",
  "accept all",
  "i agree",
];

const SETTINGS_WORDS = [
  "personnaliser",
  "parametrer",
  "paramétrer",
  "gerer mes choix",
  "gérer mes choix",
  "en savoir plus",
  "preferences",
  "préférences",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function detectApi(page: Page): Promise<string | null> {
  return page.evaluate((signatures) => {
    for (const sig of signatures) {
      if ((window as unknown as Record<string, unknown>)[sig.key] !== undefined) {
        return sig.name;
      }
    }
    return null;
  }, API_SIGNATURES as unknown as { key: string; name: string }[]);
}

/**
 * Recherche un conteneur de bandeau par heuristique générique : position
 * fixe, plan élevé, surface notable, lexique cookies, au moins deux
 * éléments cliquables.
 */
async function detectHeuristic(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const LEXICON = ["cookie", "traceur", "consentement", "vie privee", "vie privée", "privacy"];

    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const style = window.getComputedStyle(el);
      if (style.position !== "fixed" && style.position !== "sticky") continue;
      if (Number(style.zIndex) <= 1000) continue;

      const rect = el.getBoundingClientRect();
      const coverage = (rect.width * rect.height) / (vw * vh);
      if (coverage < 0.04) continue;

      const text = (el.innerText || "").toLowerCase();
      if (!LEXICON.some((w) => text.includes(w))) continue;

      const clickable = el.querySelectorAll("button, a[href], [role='button'], input[type='button']");
      if (clickable.length < 2) continue;

      return true;
    }
    return false;
  });
}

/** Classe les éléments cliquables visibles du bandeau. */
async function classifyButtons(page: Page): Promise<{
  reject: number;
  accept: number;
  settings: number;
}> {
  const labels = await page.evaluate(() => {
    const out: string[] = [];
    const nodes = document.querySelectorAll<HTMLElement>(
      "button, a[href], [role='button'], input[type='button'], input[type='submit']",
    );
    for (const n of Array.from(nodes)) {
      const rect = n.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const text = (n.innerText || n.getAttribute("aria-label") || "").trim();
      if (text) out.push(text);
    }
    return out;
  });

  const norm = labels.map(normalize);
  return {
    reject: norm.filter((l) => REJECT_WORDS.some((w) => l.includes(w))).length,
    accept: norm.filter((l) => ACCEPT_WORDS.some((w) => l.includes(w))).length,
    settings: norm.filter((l) => SETTINGS_WORDS.some((w) => l.includes(w))).length,
  };
}

export async function resolveBanner(page: Page): Promise<BannerInfo> {
  const apiName = await detectApi(page);

  let resolution: BannerResolution = "UNRESOLVED";
  if (apiName) resolution = "API";
  else {
    for (const sel of CONTAINER_SELECTORS) {
      if ((await page.locator(sel).count()) > 0) {
        resolution = "SELECTOR";
        break;
      }
    }
    if (resolution === "UNRESOLVED" && (await detectHeuristic(page))) {
      resolution = "HEURISTIC";
    }
  }

  const buttons = await classifyButtons(page);

  return {
    resolution,
    ...(apiName ? { cmpName: apiName } : {}),
    // Un refus atteignable au premier niveau coûte un clic ; sinon il faut
    // d'abord ouvrir le panneau de réglages, d'où le comptage à deux.
    clicksToReject: buttons.reject > 0 ? 1 : buttons.settings > 0 ? 2 : null,
    clicksToAccept: buttons.accept > 0 ? 1 : null,
    hasRejectAtFirstLevel: buttons.reject > 0,
  };
}

/** Clique sur le premier élément correspondant au lexique fourni. */
export async function clickByLexicon(
  page: Page,
  words: readonly string[],
): Promise<boolean> {
  const handle = await page.evaluateHandle((lexicon: string[]) => {
    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/[‘’]/g, "'")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\s+/g, " ")
        .trim();

    const nodes = document.querySelectorAll<HTMLElement>(
      "button, a[href], [role='button'], input[type='button'], input[type='submit']",
    );
    for (const n of Array.from(nodes)) {
      const rect = n.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const text = norm(n.innerText || n.getAttribute("aria-label") || "");
      if (lexicon.some((w) => text.includes(w))) return n;
    }
    return null;
  }, words as string[]);

  const element = handle.asElement();
  if (!element) return false;
  try {
    await element.click({ timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

export { REJECT_WORDS, ACCEPT_WORDS };
