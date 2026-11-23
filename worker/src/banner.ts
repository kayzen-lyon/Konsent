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
  /**
   * Mesures du premier niveau du bandeau, sans aucune interaction. Absentes
   * quand le conteneur ou l'un des deux boutons n'a pas pu être situé (iframe,
   * shadow DOM, bandeau introuvable) : les règles correspondantes restent
   * alors non évaluées.
   */
  metrics?: BannerMetrics;
}

export interface ButtonMetrics {
  /** Surface affichée, en px². */
  area: number;
  /** Contraste du fond du bouton contre le fond du bandeau (saillance). */
  prominence: number;
  /** Le bouton a-t-il un fond ou une bordure visibles ? */
  filled: boolean;
  label: string;
}

export interface BannerMetrics {
  accept: ButtonMetrics;
  reject: ButtonMetrics | null;
  /** Un lien vers une politique (cookies, confidentialité) dans le conteneur. */
  policyLink: boolean;
  /** Plus faible ratio de contraste du texte du bandeau, et son seuil applicable. */
  textContrast: { ratio: number; threshold: number; sample: string } | null;
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

/**
 * Mesure le premier niveau du bandeau : surfaces et saillance des boutons
 * accepter / refuser, lien vers la politique, contraste du texte.
 *
 * Tout est calculé dans la page, sur les styles réellement appliqués. Aucune
 * interaction : la mesure a lieu en phase A, avant tout choix du visiteur.
 */
async function measureBanner(page: Page): Promise<BannerMetrics | undefined> {
  const result = await page
    .evaluate(
      ({ acceptWords, rejectWords, containerSelectors }) => {
        const norm = (s: string) =>
          s.toLowerCase().replace(/[‘’]/g, "'").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();

        type RGBA = [number, number, number, number];
        const parse = (c: string): RGBA | null => {
          const m = c.match(/rgba?\(([^)]+)\)/);
          if (!m) return null;
          const p = m[1]!.split(/[ ,/]+/).filter(Boolean).map(Number);
          return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 1];
        };
        const lum = ([r, g, b]: RGBA) => {
          const ch = (v: number) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
        };
        const ratio = (a: RGBA, b: RGBA) => {
          const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
          return (l1 + 0.05) / (l2 + 0.05);
        };
        /** Fond effectif : premier ancêtre au fond opaque, blanc à défaut. */
        const bgOf = (el: Element | null): RGBA => {
          for (let n = el; n; n = n.parentElement) {
            const c = parse(getComputedStyle(n).backgroundColor);
            if (c && c[3] > 0.5) return c;
          }
          return [255, 255, 255, 1];
        };
        const visible = (el: Element) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05;
        };
        const clickables = Array.from(
          document.querySelectorAll<HTMLElement>("button, a[href], [role='button'], input[type='button'], input[type='submit']"),
        ).filter(visible);
        const labelOf = (el: HTMLElement) => norm(el.innerText || (el as HTMLInputElement).value || el.getAttribute("aria-label") || "");
        const accept = clickables.find((el) => acceptWords.some((w: string) => labelOf(el).includes(w)));
        if (!accept) return null;

        // Conteneur : sélecteur connu, sinon premier ancêtre fixe, collant
        // ou boîte de dialogue.
        let container: HTMLElement | null = null;
        for (const sel of containerSelectors) {
          const c = document.querySelector<HTMLElement>(sel);
          if (c && c.contains(accept)) { container = c; break; }
        }
        for (let n: HTMLElement | null = accept.parentElement; !container && n && n !== document.body; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.position === "fixed" || cs.position === "sticky" || n.getAttribute("role") === "dialog" || n.tagName === "DIALOG") container = n;
        }
        if (!container) return null;

        const reject = clickables.find((el) => container!.contains(el) && rejectWords.some((w: string) => labelOf(el).includes(w))) ?? null;
        const panelBg = bgOf(container);

        const measure = (el: HTMLElement) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          const own = parse(cs.backgroundColor);
          const ownBg: RGBA = own && own[3] > 0.5 ? own : bgOf(el);
          const border = parseFloat(cs.borderTopWidth) > 0 && (parse(cs.borderTopColor)?.[3] ?? 0) > 0.5;
          return {
            area: Math.round(r.width * r.height),
            prominence: Math.round(ratio(ownBg, panelBg) * 100) / 100,
            filled: Boolean(own && own[3] > 0.5 && ratio(own, panelBg) > 1.1) || border,
            label: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 60),
          };
        };

        const policyLink = Array.from(container.querySelectorAll<HTMLAnchorElement>("a[href]")).some((a) =>
          /cookie|confidentialit|privacy|politique|donnees personnelles|vie privee/.test(norm(`${a.innerText} ${a.getAttribute("href") ?? ""}`)),
        );

        // Contraste du texte : plus faible ratio parmi les blocs de texte
        // visibles du bandeau (seuil 3:1 pour un grand texte, 4,5:1 sinon).
        let worst: { ratio: number; threshold: number; sample: string } | null = null;
        for (const el of Array.from(container.querySelectorAll<HTMLElement>("p, span, div, li, label, h1, h2, h3, h4"))) {
          if (!visible(el)) continue;
          const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent ?? "").join("").trim();
          if (own.length < 15) continue;
          const cs = getComputedStyle(el);
          const fg = parse(cs.color);
          if (!fg) continue;
          const size = parseFloat(cs.fontSize);
          const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
          const r = Math.round(ratio(fg, bgOf(el)) * 100) / 100;
          const threshold = large ? 3 : 4.5;
          if (!worst || r / threshold < worst.ratio / worst.threshold) worst = { ratio: r, threshold, sample: own.slice(0, 60) };
        }

        return { accept: measure(accept), reject: reject ? measure(reject) : null, policyLink, textContrast: worst };
      },
      {
        acceptWords: ACCEPT_WORDS as unknown as string[],
        rejectWords: REJECT_WORDS as unknown as string[],
        containerSelectors: CONTAINER_SELECTORS as unknown as string[],
      },
    )
    .catch(() => null);
  return result ?? undefined;
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
  const metrics = resolution === "UNRESOLVED" ? undefined : await measureBanner(page);

  return {
    ...(metrics ? { metrics } : {}),
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
