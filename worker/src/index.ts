import { chromium, type Browser, type BrowserContext } from "playwright-core";
import { isReachablePublicHost } from "./network.ts";
import { ACCEPT_WORDS, REJECT_WORDS, clickByLexicon, resolveBanner, type BannerInfo } from "./banner.ts";

/**
 * Worker d'analyse en navigateur — protocole en trois phases (§5.1 du PRD).
 *
 * Chaque phase s'exécute dans un contexte navigateur NEUF : aucun état n'est
 * partagé, ce qui est la condition pour que l'écart entre phases signifie
 * quelque chose.
 *
 * Ce worker observe, il n'altère pas : les API de fingerprinting sont
 * instrumentées pour être comptées, jamais bloquées.
 */

const USER_AGENT =
  "Mozilla/5.0 (compatible; KonsentBot/1.0; +https://konsent.kayzen-lyon.com/bot) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const SETTLE_MS = 6_000;
const SCREENSHOT_TIMEOUT_MS = 12_000;
/** Attente dans la file et capture comprises : au-delà, la phase s'en passe. */
const SCREENSHOT_BUDGET_MS = 20_000;
/** Fermer un navigateur bloqué ne doit pas retenir une analyse terminée. */
const CLOSE_TIMEOUT_MS = 3_000;

/** Attend la promesse au plus `ms`, puis rend la main sans échouer. */
async function settleWithin(promise: Promise<unknown>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    promise.catch(() => {}),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, ms);
    }),
  ]);
  clearTimeout(timer);
}

interface CapturedRequest {
  url: string;
  hostname: string;
  resourceType: string;
  tMs: number;
}

interface CapturedCookie {
  name: string;
  domain: string;
  path: string;
  expires: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
}

interface Snapshot {
  phase: "A" | "B" | "C";
  requests: CapturedRequest[];
  cookies: CapturedCookie[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  serviceWorkers: string[];
  /** Compteur d'appels aux API d'empreinte, par technique. */
  fingerprinting: Record<string, number>;
  consentMode: Record<string, unknown> | null;
  tcString: string | null;
  /** `window.__tcfapi` exposé par la page. */
  tcfApiPresent: boolean;
  /** La CMP a répondu avec succès à au moins un appel. */
  tcfResponded: boolean;
  /** Origine de la chaîne : réponse de l'API ou cookie `euconsent-v2`. */
  tcStringSource?: "api" | "cookie";
  /**
   * Capture de l'écran visible au moment de l'instantané (JPEG, base64).
   * C'est la preuve visuelle : le bandeau tel que le visiteur l'a vu en
   * phase A, la page après refus en B, après acceptation en C.
   */
  screenshot?: string;
}

/** Qualité JPEG des captures : lisibles, ~60 à 150 Ko à 1440 × 900. */
const SCREENSHOT_QUALITY = 55;

/**
 * Instrumentation injectée avant tout script de la page. On compte les
 * appels aux API servant à l'empreinte du terminal sans jamais en modifier
 * le résultat : observer, pas altérer.
 */
const INSTRUMENTATION = `
(() => {
  const counters = Object.create(null);
  const bump = (k) => { counters[k] = (counters[k] || 0) + 1; };
  Object.defineProperty(window, '__konsentFp', { get: () => counters, configurable: false });

  const wrap = (obj, prop, key) => {
    if (!obj || !obj.prototype) return;
    const original = obj.prototype[prop];
    if (typeof original !== 'function') return;
    obj.prototype[prop] = function (...args) { bump(key); return original.apply(this, args); };
  };

  wrap(HTMLCanvasElement, 'toDataURL', 'canvas.toDataURL');
  wrap(CanvasRenderingContext2D, 'getImageData', 'canvas.getImageData');
  wrap(WebGLRenderingContext, 'getParameter', 'webgl.getParameter');
  wrap(AudioContext, 'createOscillator', 'audio.createOscillator');
  wrap(RTCPeerConnection, 'createDataChannel', 'webrtc.createDataChannel');

  ['plugins', 'mimeTypes', 'hardwareConcurrency', 'deviceMemory'].forEach((p) => {
    try {
      const d = Object.getOwnPropertyDescriptor(Navigator.prototype, p);
      if (!d || !d.get) return;
      Object.defineProperty(Navigator.prototype, p, {
        get() { bump('navigator.' + p); return d.get.call(this); },
      });
    } catch {}
  });
})();
`;

async function newContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(INSTRUMENTATION);
  // Toute requête du navigateur (redirections et sous-ressources comprises)
  // vers une adresse non publique est annulée. Une résolution DNS reste
  // possible entre ce contrôle et la connexion de Chromium : la sortie
  // réseau du worker doit en plus interdire les plages privées et l'adresse
  // des métadonnées de l'hébergeur (voir worker/README.md).
  await context.route("**/*", async (route) => {
    let allowed = false;
    try {
      const url = new URL(route.request().url());
      allowed =
        url.protocol === "data:" ||
        url.protocol === "blob:" ||
        ((url.protocol === "http:" || url.protocol === "https:") &&
          (await isReachablePublicHost(url.hostname)));
    } catch {
      allowed = false;
    }
    if (allowed) await route.continue();
    else await route.abort("blockedbyclient");
  });
  return context;
}

/**
 * Captures une par une. Les trois phases tournent en parallèle et le rendu
 * est logiciel : trois captures simultanées se privent mutuellement de
 * processeur et dépassent toutes leur délai.
 */
let screenshotQueue: Promise<unknown> = Promise.resolve();
function inScreenshotQueue<T>(task: () => Promise<T>): Promise<T> {
  const run = screenshotQueue.then(task, task);
  screenshotQueue = run.catch(() => {});
  return run;
}

/** Message d'erreur de capture sur une ligne : sans couleurs ni adresses, borné. */
export function describeCaptureError(error: unknown): string {
  if (!(error instanceof Error)) return "inconnue";
  return error.message
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/(?:https?|wss?|blob|data|file):\S+/gi, "[adresse]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

async function takeScreenshot(
  page: import("playwright").Page,
  phase: Snapshot["phase"],
  deadline: number,
): Promise<string | null> {
  const started = Date.now();
  const remaining = Math.min(SCREENSHOT_TIMEOUT_MS, deadline - started);
  if (remaining < 1_000) {
    process.stderr.write(`capture ${phase} : abandonnée, délai épuisé dans la file\n`);
    return null;
  }
  try {
    const buf = await page.screenshot({
      type: "jpeg",
      quality: SCREENSHOT_QUALITY,
      timeout: remaining,
    });
    return buf.toString("base64");
  } catch (error) {
    // Durée, motif et étapes de Playwright (polices, image…) : c'est l'étape
    // bloquée qui renseigne. Adresses masquées : jamais le site analysé.
    const reason = describeCaptureError(error);
    process.stderr.write(`capture ${phase} : échec après ${Date.now() - started} ms (${reason})\n`);
    return null;
  }
}

async function capture(
  context: BrowserContext,
  phase: Snapshot["phase"],
  requests: CapturedRequest[],
  page: import("playwright").Page,
): Promise<Snapshot> {
  const rawCookies = await context.cookies();
  // Les valeurs de cookies ne sortent pas du worker, à une exception près :
  // la chaîne TCF, qui n'identifie personne et constitue la preuve elle-même.
  // Seul un cookie du site lui-même vaut : une chaîne posée par un tiers sur
  // son propre domaine ne dit rien du consentement recueilli ici.
  const pageHost = new URL(page.url()).hostname.replace(/^www\./, "");
  const consentCookie =
    rawCookies.find((c) => {
      const d = c.domain.replace(/^./, "");
      return c.name === "euconsent-v2" && (pageHost === d || pageHost.endsWith(`.${d}`) || d.endsWith(`.${pageHost}`) || d === `www.${pageHost}`);
    })?.value ?? null;
  const cookies = rawCookies.map((c) => ({
    name: c.name,
    domain: c.domain,
    path: c.path,
    expires: c.expires,
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite: String(c.sameSite),
  }));

  const storage = await page.evaluate(() => {
    const dump = (s: Storage) => {
      const out: Record<string, string> = {};
      for (let i = 0; i < s.length; i += 1) {
        const k = s.key(i);
        if (k) out[k] = (s.getItem(k) ?? "").slice(0, 300);
      }
      return out;
    };
    return {
      local: dump(window.localStorage),
      session: dump(window.sessionStorage),
      fp: (window as unknown as { __konsentFp?: Record<string, number> }).__konsentFp ?? {},
      dataLayer: (window as unknown as { dataLayer?: unknown[] }).dataLayer ?? null,
    };
  });

  const serviceWorkers = await page.evaluate(async () => {
    if (!navigator.serviceWorker) return [];
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.map((r) => r.scope);
  });

  // Chaîne TCF. `getTCData` peut renvoyer une chaîne transitoire (CMP encore
  // en chargement) : on écoute d'abord les événements de la CMP et l'on ne
  // retient qu'une chaîne `tcloaded` ou `useractioncomplete`, comme le
  // prévoit la spécification CMP API v2. Repli sur le cookie `euconsent-v2`
  // quand l'API est absente ou muette.
  const tcf = await page
    .evaluate(
      () =>
        new Promise<{ apiPresent: boolean; responded: boolean; tcString: string | null }>((resolve) => {
          type TcData = { tcString?: string; eventStatus?: string; listenerId?: number };
          const api = (window as unknown as {
            __tcfapi?: (cmd: string, v: number, cb: (d: TcData, ok: boolean) => void, p?: unknown) => void;
          }).__tcfapi;
          if (typeof api !== "function") return resolve({ apiPresent: false, responded: false, tcString: null });

          let settled = false;
          // La CMP a-t-elle répondu avec succès au moins une fois ? Un simple
          // stub `__tcfapi` qui ne répond jamais ne permet de rien conclure.
          let responded = false;
          let listenerId: number | undefined;
          const finish = (tcString: string | null) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (listenerId !== undefined) {
              try {
                api("removeEventListener", 2, () => {}, listenerId);
              } catch {
                // Retrait best-effort : le contexte est fermé juste après.
              }
            }
            resolve({ apiPresent: true, responded, tcString });
          };
          const timer = setTimeout(() => {
            // Aucun événement final : dernière chance avec getTCData.
            try {
              api("getTCData", 2, (d, ok) => {
                if (ok) responded = true;
                finish(ok && d?.tcString ? d.tcString : null);
              });
              setTimeout(() => finish(null), 500);
            } catch {
              finish(null);
            }
          }, 2000);
          try {
            api("addEventListener", 2, (d, ok) => {
              if (d?.listenerId !== undefined) listenerId = d.listenerId;
              if (ok) responded = true;
              if (!ok || !d?.tcString) return;
              if (d.eventStatus === "tcloaded" || d.eventStatus === "useractioncomplete") {
                finish(d.tcString);
              }
            });
          } catch {
            // L'API existe mais rejette l'écoute : le minuteur prend le relais.
          }
        }),
    )
    .catch(() => ({ apiPresent: false, responded: false, tcString: null }));

  const cookieTcString = consentCookie;
  const tcString = tcf.tcString ?? cookieTcString;
  const tcStringSource: Snapshot["tcStringSource"] = tcf.tcString
    ? "api"
    : cookieTcString
      ? "cookie"
      : undefined;

  // Capture d'écran visible, en DERNIER : un rendu bloqué peut figer la page,
  // et toute lecture qui suivrait attendrait sans limite. Un échec n'empêche
  // pas l'instantané : la preuve visuelle est un complément.
  const deadline = Date.now() + SCREENSHOT_BUDGET_MS;
  const screenshot = await inScreenshotQueue(() => takeScreenshot(page, phase, deadline));

  return {
    phase,
    requests: [...requests],
    cookies,
    localStorage: storage.local,
    sessionStorage: storage.session,
    serviceWorkers,
    fingerprinting: storage.fp,
    consentMode: storage.dataLayer ? { dataLayer: storage.dataLayer } : null,
    tcString,
    tcfApiPresent: tcf.apiPresent,
    tcfResponded: tcf.responded,
    ...(screenshot ? { screenshot } : {}),
    ...(tcStringSource ? { tcStringSource } : {}),
  };
}

async function runPhase(
  browser: Browser,
  url: string,
  phase: Snapshot["phase"],
  action?: (page: import("playwright").Page) => Promise<void>,
): Promise<{ snapshot: Snapshot; banner: BannerInfo }> {
  const context = await newContext(browser);
  const page = await context.newPage();
  const requests: CapturedRequest[] = [];
  const started = Date.now();

  page.on("request", (req) => {
    try {
      requests.push({
        url: req.url(),
        hostname: new URL(req.url()).hostname,
        resourceType: req.resourceType(),
        tMs: Date.now() - started,
      });
    } catch {
      // URL non analysable (data:, blob:) : ignorée.
    }
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

  const banner = await resolveBanner(page);

  if (phase === "A") {
    // Défilement passif : teste la « poursuite de navigation » assimilée à
    // un consentement (KZC-DEPOT-007). Aucun clic.
    await page.mouse.wheel(0, 1200);
  }

  if (action) await action(page);

  await page.waitForTimeout(SETTLE_MS);

  const snapshot = await capture(context, phase, requests, page);
  await settleWithin(context.close(), CLOSE_TIMEOUT_MS);
  return { snapshot, banner };
}

/**
 * Lancement du navigateur. Par défaut, le Chromium installé par Playwright
 * (poste de travail, conteneur Docker) ; sur une fonction Vercel, un Chromium
 * allégé fourni par `@sparticuz/chromium` (voir `src/vercel.ts`).
 */
export interface LaunchOptions {
  executablePath?: string;
  args?: readonly string[];
  /**
   * Phases lancées en parallèle. Elles sont indépendantes (chacune dans son
   * propre navigateur) et passent l'essentiel de leur temps à attendre le
   * réseau : en parallèle, la durée totale est celle de la phase la plus
   * longue. Activé sur Vercel, où le délai est compté.
   */
  parallel?: boolean;
}

export async function runThreePhaseScan(url: string, launch: LaunchOptions = {}) {
  // Un navigateur neuf PAR PHASE. Isolation maximale, et condition du
  // Chromium allégé des fonctions Vercel, lancé en processus unique : y
  // fermer le contexte de la phase A ferme le navigateur entier.
  const inOwnBrowser = async <T,>(fn: (browser: Browser) => Promise<T>): Promise<T> => {
    const browser = await chromium.launch({
      args: [...(launch.args ?? []), "--disable-dev-shm-usage"],
      ...(launch.executablePath ? { executablePath: launch.executablePath } : {}),
    });
    try {
      return await fn(browser);
    } finally {
      await settleWithin(browser.close(), CLOSE_TIMEOUT_MS);
    }
  };

  {
    // Phase A — aucune interaction avec le bandeau.
    const phaseA = () => inOwnBrowser((browser) => runPhase(browser, url, "A"));

    // Phase B — refus, puis navigation interne pour tester la persistance.
    // Le refus a-t-il réellement été cliqué ? Sans clic, la phase B n'est
    // qu'une seconde phase A : rien de ce qu'elle observe ne vaut « après refus ».
    let refusalClicked = false;
    const phaseB = () => inOwnBrowser((browser) => runPhase(browser, url, "B", async (page) => {
      const clicked = await clickByLexicon(page, REJECT_WORDS);
      refusalClicked = Boolean(clicked);
      if (clicked) {
        await page.waitForTimeout(2000);
        const internal = await page.evaluate(() => {
          const origin = window.location.origin;
          const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
            .map((el) => el.href)
            .filter((h) => h.startsWith(origin) && h !== window.location.href);
          return links[0] ?? null;
        });
        if (internal) {
          await page.goto(internal, { waitUntil: "domcontentloaded", timeout: 20_000 }).catch(() => {});
        }
      }
    }));

    // Phase C — acceptation globale, pour l'inventaire exhaustif.
    const phaseC = () => inOwnBrowser((browser) => runPhase(browser, url, "C", async (page) => {
      await clickByLexicon(page, ACCEPT_WORDS);
    }));

    const [a, b, c] = launch.parallel
      ? await Promise.all([phaseA(), phaseB(), phaseC()])
      : [await phaseA(), await phaseB(), await phaseC()];

    return {
      url,
      mode: "headless" as const,
      scannedAt: new Date().toISOString(),
      bannerResolution: a.banner.resolution,
      refusalClicked,
      banner: a.banner,
      snapshots: [a.snapshot, b.snapshot, c.snapshot],
    };
  }
}

// Exécution directe en ligne de commande.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  const target = process.argv[2];
  if (!target) {
    process.stderr.write("Usage : node src/index.ts <url>\n");
    process.exit(1);
  }
  runThreePhaseScan(target.startsWith("http") ? target : `https://${target}`)
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error: unknown) => {
      process.stderr.write(`Échec de l'analyse : ${String(error)}\n`);
      process.exit(1);
    });
}
