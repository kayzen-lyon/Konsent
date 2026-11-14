/**
 * Générateur de bandeau cookies : configuration → extrait HTML/CSS/JS autonome.
 *
 * Logique pure, sans dépendance au DOM : elle sert à la fois l'aperçu (CSS et
 * balisage injectés dans un shadow root) et le code copié par l'utilisateur.
 *
 * L'extrait produit suit les lignes directrices CNIL du 17 septembre 2020
 * (délibération n° 2020-091) prises pour l'application de l'article 82 de la
 * loi Informatique et Libertés :
 *  - « Tout refuser » au même niveau, à la même taille et dans le même style
 *    que « Tout accepter » ;
 *  - aucune case pré-cochée, choix par finalité ;
 *  - aucun cookie ni traceur déposé avant le choix (seul le cookie qui
 *    mémorise le choix lui-même est écrit, et seulement après le clic) ;
 *  - choix conservé au plus 6 mois, puis redemandé ;
 *  - retrait aussi simple que l'accord (bouton « Gérer les cookies »).
 *
 * Aucune ressource externe, aucun `eval` : les scripts tiers bloqués sont
 * recréés par `document.createElement('script')`.
 */

export type BannerPosition = "bottom" | "center" | "corner";
export type BannerLang = "fr" | "en";
export type CategoryId = "analytics" | "advertising" | "social" | "personalization";

export interface BannerConfig {
  siteName: string;
  policyUrl: string;
  /** Couleur principale, au format #rrggbb. */
  color: string;
  position: BannerPosition;
  categories: CategoryId[];
  /** Durée de conservation du choix, en mois (1 à 6). */
  retentionMonths: number;
  /** Texte principal personnalisé ; vide = texte par défaut. */
  customText: string;
  lang: BannerLang;
}

export const DEFAULT_COLOR = "#b7481f";
export const MAX_RETENTION_MONTHS = 6;
export const CONSENT_COOKIE = "konsent_consent";

export const DEFAULT_CONFIG: BannerConfig = {
  siteName: "Mon site",
  policyUrl: "/politique-cookies",
  color: DEFAULT_COLOR,
  position: "bottom",
  categories: ["analytics", "advertising"],
  retentionMonths: MAX_RETENTION_MONTHS,
  customText: "",
  lang: "fr",
};

export const CATEGORY_IDS: readonly CategoryId[] = [
  "analytics",
  "advertising",
  "social",
  "personalization",
];

interface CategoryText {
  label: string;
  description: string;
}

const CATEGORIES: Record<BannerLang, Record<CategoryId, CategoryText>> = {
  fr: {
    analytics: {
      label: "Mesure d'audience",
      description: "Statistiques de fréquentation pour comprendre l'usage du site.",
    },
    advertising: {
      label: "Publicité",
      description: "Publicités adaptées à vos centres d'intérêt et mesure de leur performance.",
    },
    social: {
      label: "Réseaux sociaux",
      description: "Boutons de partage et contenus intégrés depuis les réseaux sociaux.",
    },
    personalization: {
      label: "Personnalisation",
      description: "Contenus et recommandations adaptés à votre navigation.",
    },
  },
  en: {
    analytics: {
      label: "Audience measurement",
      description: "Traffic statistics to understand how the site is used.",
    },
    advertising: {
      label: "Advertising",
      description: "Ads tailored to your interests and measurement of their performance.",
    },
    social: {
      label: "Social media",
      description: "Share buttons and content embedded from social networks.",
    },
    personalization: {
      label: "Personalisation",
      description: "Content and recommendations tailored to your browsing.",
    },
  },
};

interface BannerTexts {
  title: string;
  body: string;
  learnMore: string;
  refuseAll: string;
  acceptAll: string;
  customize: string;
  save: string;
  legend: string;
  necessary: string;
  note: string;
  manage: string;
}

export function categoryText(lang: BannerLang, id: CategoryId): CategoryText {
  return CATEGORIES[lang][id];
}

export function bannerTexts(config: BannerConfig): BannerTexts {
  const site = config.siteName.trim() || (config.lang === "fr" ? "Ce site" : "This site");
  const months = clampMonths(config.retentionMonths);
  const custom = config.customText.trim();
  if (config.lang === "en") {
    return {
      title: `Your cookie choices on ${site}`,
      body:
        custom ||
        `${site} and its partners would like to use cookies to measure audience, show relevant ads and enable some features. You can accept, refuse or choose by purpose. Refusing has no consequence on your access to the site.`,
      learnMore: "Read our cookie policy",
      refuseAll: "Refuse all",
      acceptAll: "Accept all",
      customize: "Customise",
      save: "Save my choices",
      legend: "Choose by purpose",
      necessary: "Strictly necessary cookies (security, saving your choice) are always active.",
      note: `Your choice is kept for ${months} month${months > 1 ? "s" : ""}. You can change it at any time with the “Manage cookies” button.`,
      manage: "Manage cookies",
    };
  }
  return {
    title: `Vos choix concernant les cookies sur ${site}`,
    body:
      custom ||
      `${site} et ses partenaires souhaitent utiliser des cookies pour mesurer l'audience, afficher des publicités pertinentes et activer certaines fonctionnalités. Vous pouvez accepter, refuser ou choisir finalité par finalité. Refuser n'a aucune conséquence sur votre accès au site.`,
    learnMore: "Consulter notre politique cookies",
    refuseAll: "Tout refuser",
    acceptAll: "Tout accepter",
    customize: "Personnaliser",
    save: "Enregistrer mes choix",
    legend: "Choisir par finalité",
    necessary:
      "Les cookies strictement nécessaires (sécurité, mémorisation de votre choix) sont toujours actifs.",
    note: `Votre choix est conservé ${months} mois. Vous pouvez le modifier à tout moment avec le bouton « Gérer les cookies ».`,
    manage: "Gérer les cookies",
  };
}

/* ─────────────────────────────── Utilitaires ─────────────────────────────── */

export function clampMonths(n: number): number {
  if (!Number.isFinite(n)) return MAX_RETENTION_MONTHS;
  return Math.min(MAX_RETENTION_MONTHS, Math.max(1, Math.round(n)));
}

export function normalizeColor(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : DEFAULT_COLOR;
}

/** N'accepte que http(s) ou un chemin relatif au site ; sinon « # ». */
export function safeUrl(value: string): string {
  const v = value.trim();
  if (v === "") return "#";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  return "#";
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(normalizeColor(a));
  const lb = luminance(normalizeColor(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Couleur de texte (blanc ou quasi-noir) offrant le meilleur contraste sur `bg`. */
export function textOn(bg: string): string {
  return contrastRatio(bg, "#ffffff") >= contrastRatio(bg, "#111827") ? "#ffffff" : "#111827";
}

function slugify(s: string): string {
  const slug = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "site";
}

export function downloadFileName(config: BannerConfig): string {
  return `bandeau-cookies-${slugify(config.siteName)}.html`;
}

/* ───────────────────────────────── CSS ───────────────────────────────────── */

export function generateCss(config: BannerConfig): string {
  const color = normalizeColor(config.color);
  const on = textOn(color);
  return `.kz-root{position:fixed;z-index:2147483000;box-sizing:border-box;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1f2937}
.kz-root *,.kz-root *::before,.kz-root *::after{box-sizing:border-box}
.kz-root[hidden],.kz-manage[hidden],.kz-root [hidden]{display:none!important}
.kz-pos-bottom{left:0;right:0;bottom:0}
.kz-pos-bottom .kz-dialog{border-radius:0;border-width:1px 0 0;padding:20px max(24px,calc((100% - 960px)/2))}
.kz-pos-corner{left:16px;right:16px;bottom:16px}
@media (min-width:640px){.kz-pos-corner{left:auto;width:420px}}
.kz-pos-center{top:0;right:0;bottom:0;left:0;display:flex;align-items:center;justify-content:center;padding:16px}
.kz-backdrop{position:absolute;top:0;right:0;bottom:0;left:0;background:rgba(17,24,39,.6)}
.kz-dialog{position:relative;background:#ffffff;border:1px solid #d1d5db;border-radius:16px;padding:20px 24px;box-shadow:0 10px 30px rgba(0,0,0,.18);max-height:90vh;overflow:auto}
.kz-pos-center .kz-dialog{width:100%;max-width:560px}
.kz-title{margin:0 0 8px;font-size:18px;font-weight:700;line-height:1.3;color:#111827}
.kz-text{margin:0 0 4px}
.kz-text a{color:#1f2937;text-decoration:underline;text-underline-offset:2px}
.kz-fieldset{margin:12px 0 0;padding:8px 14px 4px;border:1px solid #d1d5db;border-radius:12px}
.kz-fieldset legend{padding:0 6px;font-weight:700}
.kz-necessary{margin:4px 0 8px;font-size:13px;color:#4b5563}
.kz-cat{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid #e5e7eb}
.kz-cat input{flex:none;width:20px;height:20px;margin:2px 0 0;accent-color:${color};cursor:pointer}
.kz-cat label{cursor:pointer}
.kz-cat-name{display:block;font-weight:600}
.kz-cat-desc{display:block;font-size:13px;color:#4b5563}
.kz-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.kz-btn{flex:1 1 auto;min-height:44px;padding:10px 18px;border:2px solid ${color};border-radius:999px;font:inherit;font-weight:700;cursor:pointer}
.kz-btn-main{background:${color};color:${on}}
.kz-btn-alt{background:#ffffff;color:#1f2937;border-color:#1f2937}
.kz-btn:hover{text-decoration:underline}
.kz-btn:focus-visible,.kz-manage:focus-visible,.kz-cat input:focus-visible,.kz-text a:focus-visible{outline:3px solid #1f2937;outline-offset:2px}
.kz-note{margin:12px 0 0;font-size:13px;color:#4b5563}
.kz-manage{position:fixed;left:16px;bottom:16px;z-index:2147482999;padding:8px 14px;border:1px solid #1f2937;border-radius:999px;background:#ffffff;color:#1f2937;font:600 13px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;cursor:pointer}
@media (max-width:480px){.kz-btn{flex-basis:100%}}`;
}

/* ─────────────────────────────── Balisage ────────────────────────────────── */

export function generateMarkup(config: BannerConfig): string {
  const t = bannerTexts(config);
  const e = escapeHtml;
  const modal = config.position === "center";
  const url = safeUrl(config.policyUrl);
  const cats = CATEGORY_IDS.filter((id) => config.categories.includes(id));

  const catRows = cats
    .map((id) => {
      const c = categoryText(config.lang, id);
      return `        <div class="kz-cat">
          <input type="checkbox" id="kz-cat-${id}" data-kz-cat="${id}">
          <label for="kz-cat-${id}"><span class="kz-cat-name">${e(c.label)}</span><span class="kz-cat-desc">${e(c.description)}</span></label>
        </div>`;
    })
    .join("\n");

  const link = url === "#" ? "" : ` <a href="${e(url)}">${e(t.learnMore)}</a>`;

  return `<div id="konsent-root" class="kz-root kz-pos-${config.position}" hidden>
${modal ? '  <div class="kz-backdrop"></div>\n' : ""}  <div class="kz-dialog" role="dialog"${modal ? ' aria-modal="true"' : ""} aria-labelledby="kz-title" aria-describedby="kz-desc" tabindex="-1">
    <h2 id="kz-title" class="kz-title">${e(t.title)}</h2>
    <p id="kz-desc" class="kz-text">${e(t.body)}${link}</p>
    <div id="kz-panel" hidden>
      <fieldset class="kz-fieldset">
        <legend>${e(t.legend)}</legend>
        <p class="kz-necessary">${e(t.necessary)}</p>
${catRows}
      </fieldset>
    </div>
    <div class="kz-actions">
      <button type="button" class="kz-btn kz-btn-main" data-kz-action="refuse">${e(t.refuseAll)}</button>
${cats.length > 0 ? `      <button type="button" class="kz-btn kz-btn-alt" data-kz-action="customize" aria-expanded="false" aria-controls="kz-panel">${e(t.customize)}</button>
      <button type="button" class="kz-btn kz-btn-alt" data-kz-action="save" hidden>${e(t.save)}</button>\n` : ""}      <button type="button" class="kz-btn kz-btn-main" data-kz-action="accept">${e(t.acceptAll)}</button>
    </div>
    <p class="kz-note">${e(t.note)}</p>
  </div>
</div>
<button type="button" class="kz-manage" data-konsent-open hidden>${e(t.manage)}</button>`;
}

/* ─────────────────────────────── Script ──────────────────────────────────── */

export function generateScript(config: BannerConfig): string {
  const cfg = {
    cookie: CONSENT_COOKIE,
    version: 1,
    // Mois de 30 jours : 6 mois ≈ 180 jours, toujours sous le plafond CNIL.
    maxAgeDays: clampMonths(config.retentionMonths) * 30,
    categories: CATEGORY_IDS.filter((id) => config.categories.includes(id)),
    modal: config.position === "center",
  };
  // « < » échappé pour qu'aucune valeur ne puisse fermer la balise <script>.
  const json = JSON.stringify(cfg).replace(/</g, "\\u003c");

  return `(function () {
  'use strict';
  var CFG = ${json};
  var root, dialog, panel, manage, btnCustomize, btnSave, current = null, lastFocus = null;

  function readChoice() {
    var parts = document.cookie ? document.cookie.split('; ') : [];
    for (var i = 0; i < parts.length; i++) {
      var eq = parts[i].indexOf('=');
      if (parts[i].slice(0, eq) !== CFG.cookie) continue;
      try {
        var v = JSON.parse(decodeURIComponent(parts[i].slice(eq + 1)));
        if (v && v.v === CFG.version && typeof v.t === 'number' && v.c &&
            Date.now() - v.t < CFG.maxAgeDays * 86400000) return v;
      } catch (e) {}
    }
    return null;
  }

  function writeChoice(choices) {
    var v = { v: CFG.version, t: Date.now(), c: choices };
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = CFG.cookie + '=' + encodeURIComponent(JSON.stringify(v)) +
      '; Max-Age=' + (CFG.maxAgeDays * 86400) + '; Path=/; SameSite=Lax' + secure;
    return v;
  }

  function activate(choices) {
    var nodes = document.querySelectorAll('script[type="text/plain"][data-konsent-category]');
    for (var i = 0; i < nodes.length; i++) {
      var old = nodes[i];
      if (!choices[old.getAttribute('data-konsent-category')]) continue;
      var s = document.createElement('script');
      for (var j = 0; j < old.attributes.length; j++) {
        var a = old.attributes[j];
        if (a.name === 'type' || a.name === 'data-konsent-category' || a.name === 'data-konsent-type') continue;
        s.setAttribute(a.name, a.value);
      }
      var type = old.getAttribute('data-konsent-type');
      if (type) s.setAttribute('type', type);
      if (!old.hasAttribute('src')) s.text = old.text;
      old.parentNode.replaceChild(s, old);
    }
  }

  function all(value) {
    var c = {};
    for (var i = 0; i < CFG.categories.length; i++) c[CFG.categories[i]] = value;
    return c;
  }

  function boxes() {
    return root.querySelectorAll('input[data-kz-cat]');
  }

  function fromBoxes() {
    var c = all(false), b = boxes();
    for (var i = 0; i < b.length; i++) c[b[i].getAttribute('data-kz-cat')] = b[i].checked;
    return c;
  }

  function showPanel(show) {
    if (!btnCustomize) return;
    panel.hidden = !show;
    btnCustomize.hidden = show;
    btnCustomize.setAttribute('aria-expanded', show ? 'true' : 'false');
    btnSave.hidden = !show;
    if (show) { var b = boxes(); if (b[0]) b[0].focus(); }
  }

  function open() {
    lastFocus = document.activeElement;
    var b = boxes();
    for (var i = 0; i < b.length; i++) {
      b[i].checked = !!(current && current.c[b[i].getAttribute('data-kz-cat')]);
    }
    showPanel(false);
    root.hidden = false;
    if (manage) manage.hidden = true;
    dialog.focus();
  }

  function close() {
    root.hidden = true;
    if (manage) manage.hidden = false;
    if (lastFocus && lastFocus !== document.body && document.contains(lastFocus)) lastFocus.focus();
    else if (manage) manage.focus();
  }

  function decide(choices) {
    var prev = current, revoked = false;
    for (var i = 0; prev && i < CFG.categories.length; i++) {
      var k = CFG.categories[i];
      if (prev.c[k] && !choices[k]) revoked = true;
    }
    current = writeChoice(choices);
    close();
    try { document.dispatchEvent(new CustomEvent('konsent:change', { detail: choices })); } catch (e) {}
    // Un script déjà exécuté ne se décharge pas : on recharge pour appliquer le retrait.
    if (revoked) { location.reload(); return; }
    activate(choices);
  }

  function focusables() {
    var list = dialog.querySelectorAll('a[href], button, input');
    var out = [];
    for (var i = 0; i < list.length; i++) if (list[i].offsetParent !== null) out.push(list[i]);
    return out;
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      // Fermer sans choisir vaut refus (lignes directrices CNIL 2020).
      if (current) close(); else decide(all(false));
      return;
    }
    if (e.key === 'Tab' && CFG.modal) {
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  }

  function init() {
    root = document.getElementById('konsent-root');
    if (!root) return;
    dialog = root.querySelector('.kz-dialog');
    panel = document.getElementById('kz-panel');
    manage = document.querySelector('.kz-manage');
    btnCustomize = root.querySelector('[data-kz-action="customize"]');
    btnSave = root.querySelector('[data-kz-action="save"]');

    root.addEventListener('keydown', onKey);
    root.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-kz-action]') : null;
      if (!t) return;
      var action = t.getAttribute('data-kz-action');
      if (action === 'accept') decide(all(true));
      else if (action === 'refuse') decide(all(false));
      else if (action === 'save') decide(fromBoxes());
      else if (action === 'customize') showPanel(true);
    });
    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-konsent-open]') : null;
      if (t) { e.preventDefault(); open(); }
    });

    window.Konsent = {
      open: open,
      get: function () { return current ? current.c : null; }
    };

    current = readChoice();
    if (current) {
      activate(current.c);
      if (manage) manage.hidden = false;
    } else {
      open();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();`;
}

/* ───────────────────────────── Assemblage ────────────────────────────────── */

/** Extrait à coller juste avant </body>. */
export function generateSnippet(config: BannerConfig): string {
  const cats = CATEGORY_IDS.filter((id) => config.categories.includes(id));
  const usage = cats
    .map((id) => `       ${id.padEnd(16)} ${categoryText("fr", id).label}`)
    .join("\n");
  return `<!-- Bandeau cookies généré par Konsent (KAYZEN), sans dépendance externe.
     À coller juste avant </body>, sur toutes les pages.

     Bloquer un script tiers jusqu'au consentement :
       <script type="text/plain" data-konsent-category="analytics" src="https://exemple.tld/tag.js"></script>
     Catégories disponibles :
${usage || "       (aucune)"}
     Lien de retrait, par exemple en pied de page :
       <a href="#" data-konsent-open>Gérer les cookies</a>
     Le choix est lisible en JavaScript par window.Konsent.get() et
     l'événement « konsent:change » est émis sur document à chaque choix. -->
<style>
${generateCss(config)}
</style>
${generateMarkup(config)}
<script>
${generateScript(config)}
</script>`;
}

/** Page HTML complète, pour le fichier téléchargé : démonstration prête à ouvrir. */
export function generateDocument(config: BannerConfig): string {
  const lang = config.lang;
  const site = escapeHtml(config.siteName.trim() || "Mon site");
  const firstCat = CATEGORY_IDS.find((id) => config.categories.includes(id));
  const demo = firstCat
    ? `
  <!-- Exemple de script bloqué : il ne s'exécute qu'après accord pour « ${firstCat} ». -->
  <script type="text/plain" data-konsent-category="${firstCat}">
    document.getElementById('demo-status').textContent = '${lang === "fr" ? "Script « " + firstCat + " » exécuté après consentement." : "“" + firstCat + "” script executed after consent."}';
  </script>`
    : "";
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${lang === "fr" ? "Bandeau cookies" : "Cookie banner"} · ${site}</title>
</head>
<body style="margin:0;padding:32px;font:16px/1.5 system-ui,sans-serif;color:#1f2937;background:#f9fafb">
  <h1>${site}</h1>
  <p id="demo-status">${lang === "fr" ? "Aucun script tiers exécuté pour l'instant." : "No third-party script executed yet."}</p>
  <p><a href="#" data-konsent-open>${lang === "fr" ? "Gérer les cookies" : "Manage cookies"}</a></p>
${demo}

${generateSnippet(config)}
</body>
</html>
`;
}
