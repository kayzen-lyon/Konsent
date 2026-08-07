import { chromium, type Browser, type BrowserContext } from "playwright";
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
  "Mozilla/5.0 (compatible; KonsentBot/1.0; +https://konsent.fr/bot) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const SETTLE_MS = 6_000;

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
}

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
  return context;
}

async function capture(
  context: BrowserContext,
  phase: Snapshot["phase"],
  requests: CapturedRequest[],
  page: import("playwright").Page,
): Promise<Snapshot> {
  const cookies = (await context.cookies()).map((c) => ({
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

  const tcString = await page
    .evaluate(
      () =>
        new Promise<string | null>((resolve) => {
          const api = (window as unknown as { __tcfapi?: Function }).__tcfapi;
          if (typeof api !== "function") return resolve(null);
          const timer = setTimeout(() => resolve(null), 2000);
          try {
            api("getTCData", 2, (data: { tcString?: string }, ok: boolean) => {
              clearTimeout(timer);
              resolve(ok && data?.tcString ? data.tcString : null);
            });
          } catch {
            clearTimeout(timer);
            resolve(null);
          }
        }),
    )
    .catch(() => null);

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
  await context.close();
  return { snapshot, banner };
}

export async function runThreePhaseScan(url: string) {
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage"] });

  try {
    // Phase A — aucune interaction avec le bandeau.
    const a = await runPhase(browser, url, "A");

    // Phase B — refus, puis navigation interne pour tester la persistance.
    const b = await runPhase(browser, url, "B", async (page) => {
      const clicked = await clickByLexicon(page, REJECT_WORDS);
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
    });

    // Phase C — acceptation globale, pour l'inventaire exhaustif.
    const c = await runPhase(browser, url, "C", async (page) => {
      await clickByLexicon(page, ACCEPT_WORDS);
    });

    return {
      url,
      mode: "headless" as const,
      scannedAt: new Date().toISOString(),
      bannerResolution: a.banner.resolution,
      banner: a.banner,
      snapshots: [a.snapshot, b.snapshot, c.snapshot],
    };
  } finally {
    await browser.close();
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
