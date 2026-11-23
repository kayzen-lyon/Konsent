import { chromium, type Browser, type BrowserContext } from "playwright";
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
  await context.close();
  return { snapshot, banner };
}

export async function runThreePhaseScan(url: string) {
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage"] });

  try {
    // Phase A — aucune interaction avec le bandeau.
    const a = await runPhase(browser, url, "A");

    // Phase B — refus, puis navigation interne pour tester la persistance.
    // Le refus a-t-il réellement été cliqué ? Sans clic, la phase B n'est
    // qu'une seconde phase A : rien de ce qu'elle observe ne vaut « après refus ».
    let refusalClicked = false;
    const b = await runPhase(browser, url, "B", async (page) => {
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
      refusalClicked,
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
