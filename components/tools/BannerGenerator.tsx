"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORY_IDS,
  DEFAULT_CONFIG,
  MAX_RETENTION_MONTHS,
  bannerTexts,
  categoryText,
  contrastRatio,
  downloadFileName,
  generateCss,
  generateDocument,
  generateMarkup,
  generateSnippet,
  normalizeColor,
  safeUrl,
  textOn,
  type BannerConfig,
  type BannerLang,
  type BannerPosition,
  type CategoryId,
} from "@/lib/tools/banner-generator";

/**
 * Générateur de bandeau cookies, entièrement côté client : la configuration
 * ne quitte pas le navigateur, le code est assemblé localement.
 */

const POSITIONS: { id: BannerPosition; label: string }[] = [
  { id: "bottom", label: "Bandeau en bas de page" },
  { id: "center", label: "Fenêtre centrée (modale)" },
  { id: "corner", label: "Encart dans le coin" },
];

const LANGS: { id: BannerLang; label: string }[] = [
  { id: "fr", label: "Français" },
  { id: "en", label: "Anglais" },
];

const inputClass =
  "mt-2 w-full rounded-2xl border border-line-2 bg-surface px-4 py-3 text-[15px] text-ink-2 outline-none";
const choiceClass =
  "h-5 w-5 shrink-0 accent-flame focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";
const buttonClass =
  "btn-primary inline-flex min-h-11 items-center justify-center rounded-full bg-flame px-6 py-3 text-sm font-semibold text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";

/* Dans l'aperçu, le bandeau est confiné au cadre au lieu de la fenêtre. */
const PREVIEW_CSS = `
.kz-root,.kz-manage{position:absolute!important}
.kz-pos-bottom .kz-dialog{padding:20px 24px}
.kz-dialog{max-height:100%}`;

export default function BannerGenerator() {
  const [config, setConfig] = useState<BannerConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState("");

  const set = <K extends keyof BannerConfig>(key: K, value: BannerConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const toggleCategory = (id: CategoryId, on: boolean) =>
    setConfig((c) => ({
      ...c,
      categories: on
        ? CATEGORY_IDS.filter((x) => x === id || c.categories.includes(x))
        : c.categories.filter((x) => x !== id),
    }));

  const snippet = useMemo(() => generateSnippet(config), [config]);
  const color = normalizeColor(config.color);
  const ratio = contrastRatio(color, textOn(color));
  const urlRejected = config.policyUrl.trim() !== "" && safeUrl(config.policyUrl) === "#";
  const defaultBody = bannerTexts({ ...config, customText: "" }).body;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setStatus("Code copié dans le presse-papiers.");
    } catch {
      setStatus(
        "La copie automatique a échoué. Sélectionnez le code ci-dessous et copiez-le manuellement.",
      );
    }
  }

  function download() {
    const blob = new Blob([generateDocument(config)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadFileName(config);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus(`Fichier ${downloadFileName(config)} téléchargé.`);
  }

  return (
    <div className="mt-10">
      <div className="grid gap-8 lg:grid-cols-2">
        <form
          className="space-y-6 rounded-3xl border border-line bg-surface p-6"
          onSubmit={(e) => e.preventDefault()}
          aria-labelledby="bg-form-title"
        >
          <h2 id="bg-form-title" className="display text-xl text-ink-2">
            Configuration
          </h2>

          <div>
            <label htmlFor="bg-site" className="block text-sm font-medium text-ink-2">
              Nom du site
            </label>
            <input
              id="bg-site"
              type="text"
              value={config.siteName}
              maxLength={80}
              autoComplete="organization"
              onChange={(e) => set("siteName", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="bg-url" className="block text-sm font-medium text-ink-2">
              Adresse de la politique cookies
            </label>
            <p id="bg-url-help" className="mt-1 text-sm text-muted">
              Adresse complète (https://…) ou chemin du site (/politique-cookies).
            </p>
            <input
              id="bg-url"
              type="text"
              inputMode="url"
              value={config.policyUrl}
              maxLength={300}
              aria-describedby={urlRejected ? "bg-url-help bg-url-error" : "bg-url-help"}
              aria-invalid={urlRejected || undefined}
              onChange={(e) => set("policyUrl", e.target.value)}
              className={inputClass}
            />
            {urlRejected ? (
              <p id="bg-url-error" className="mt-2 text-sm text-crit-text">
                Erreur : adresse non reconnue. Le lien sera omis du bandeau.
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="bg-color" className="block text-sm font-medium text-ink-2">
              Couleur principale
            </label>
            <div className="mt-2 flex items-center gap-4">
              <input
                id="bg-color"
                type="color"
                value={color}
                aria-describedby="bg-color-help"
                onChange={(e) => set("color", e.target.value)}
                className="h-11 w-16 cursor-pointer rounded-xl border border-line-2 bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
              />
              <p id="bg-color-help" className="text-sm text-muted">
                <span className="font-mono text-ink-2">{color}</span> · texte des boutons en{" "}
                {textOn(color) === "#ffffff" ? "blanc" : "noir"}, contraste{" "}
                {ratio.toFixed(1).replace(".", ",")}:1{" "}
                {ratio >= 4.5 ? "(conforme AA)" : "(insuffisant, choisissez une autre teinte)"}
              </p>
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-ink-2">Position du bandeau</legend>
            <div className="mt-2 space-y-2">
              {POSITIONS.map((p) => (
                <label key={p.id} className="flex items-center gap-3 text-[15px] text-ink-2">
                  <input
                    type="radio"
                    name="bg-position"
                    value={p.id}
                    checked={config.position === p.id}
                    onChange={() => set("position", p.id)}
                    className={choiceClass}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-ink-2">
              Finalités soumises au consentement
            </legend>
            <p className="mt-1 text-sm text-muted">
              Cochez celles que votre site utilise réellement. Dans le bandeau généré, aucune ne
              sera pré-cochée.
            </p>
            <div className="mt-2 space-y-2">
              {CATEGORY_IDS.map((id) => (
                <label key={id} className="flex items-start gap-3 text-[15px] text-ink-2">
                  <input
                    type="checkbox"
                    checked={config.categories.includes(id)}
                    onChange={(e) => toggleCategory(id, e.target.checked)}
                    className={`${choiceClass} mt-0.5`}
                  />
                  <span>
                    {categoryText("fr", id).label}{" "}
                    <code className="rounded bg-surface-low px-1.5 py-0.5 text-xs text-muted">
                      {id}
                    </code>
                  </span>
                </label>
              ))}
            </div>
            {config.categories.length === 0 ? (
              <p className="mt-3 text-sm text-warn">
                Attention : aucune finalité cochée. Si votre site ne dépose que des cookies
                strictement nécessaires, aucun bandeau n&apos;est exigé.
              </p>
            ) : null}
          </fieldset>

          <div>
            <label htmlFor="bg-retention" className="block text-sm font-medium text-ink-2">
              Durée de conservation du choix
            </label>
            <select
              id="bg-retention"
              value={config.retentionMonths}
              onChange={(e) => set("retentionMonths", Number(e.target.value))}
              className={inputClass}
            >
              {Array.from({ length: MAX_RETENTION_MONTHS }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m} mois{m === MAX_RETENTION_MONTHS ? " (maximum recommandé par la CNIL)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bg-text" className="block text-sm font-medium text-ink-2">
              Texte du bandeau (facultatif)
            </label>
            <p id="bg-text-help" className="mt-1 text-sm text-muted">
              Laissez vide pour utiliser le texte par défaut. Nommez les finalités et rappelez
              que le refus est sans conséquence.
            </p>
            <textarea
              id="bg-text"
              rows={4}
              maxLength={600}
              value={config.customText}
              placeholder={defaultBody}
              aria-describedby="bg-text-help"
              onChange={(e) => set("customText", e.target.value)}
              className={inputClass}
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-ink-2">Langue du bandeau</legend>
            <div className="mt-2 flex flex-wrap gap-6">
              {LANGS.map((l) => (
                <label key={l.id} className="flex items-center gap-3 text-[15px] text-ink-2">
                  <input
                    type="radio"
                    name="bg-lang"
                    value={l.id}
                    checked={config.lang === l.id}
                    onChange={() => set("lang", l.id)}
                    className={choiceClass}
                  />
                  {l.label}
                </label>
              ))}
            </div>
          </fieldset>
        </form>

        <section aria-labelledby="bg-preview-title" className="lg:sticky lg:top-24 lg:self-start">
          <h2 id="bg-preview-title" className="display text-xl text-ink-2">
            Aperçu en direct
          </h2>
          <p className="mt-2 text-sm text-muted">
            Les boutons de l&apos;aperçu sont actifs ; aucun cookie n&apos;est déposé ici.
          </p>
          <Preview config={config} />
        </section>
      </div>

      <section aria-labelledby="bg-code-title" className="mt-10">
        <h2 id="bg-code-title" className="display text-xl text-ink-2">
          Votre code
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Collez cet extrait juste avant <code className="text-ink-2">&lt;/body&gt;</code> sur
          toutes les pages. Puis remplacez, pour chaque script tiers,{" "}
          <code className="text-ink-2">&lt;script src=&quot;…&quot;&gt;</code> par{" "}
          <code className="text-ink-2">
            &lt;script type=&quot;text/plain&quot; data-konsent-category=&quot;analytics&quot;
            src=&quot;…&quot;&gt;
          </code>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={copy} className={buttonClass}>
            Copier le code
          </button>
          <button type="button" onClick={download} className={buttonClass}>
            Télécharger le fichier .html
          </button>
        </div>
        <p role="status" className="mt-3 min-h-6 text-sm text-ink-2">
          {status}
        </p>
        <pre
          tabIndex={0}
          aria-label="Code HTML, CSS et JavaScript généré"
          className="mt-2 max-h-[28rem] overflow-auto rounded-3xl border border-line bg-surface-low p-5 font-mono text-xs leading-relaxed text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
        >
          <code>{snippet}</code>
        </pre>
        <p className="mt-3 text-sm text-muted">
          Sous une politique CSP stricte (sans <code>&apos;unsafe-inline&apos;</code>), placez le
          contenu des balises <code>&lt;style&gt;</code> et <code>&lt;script&gt;</code> dans des
          fichiers servis par votre domaine, ou ajoutez-leur un nonce. Les scripts réactivés
          recopient l&apos;attribut <code>nonce</code> d&apos;origine.
        </p>
      </section>
    </div>
  );
}

/**
 * Aperçu isolé dans un shadow root : le CSS généré ne fuit pas sur la page et
 * le CSS du site ne le déforme pas. Seuls le balisage et le style sont
 * injectés (contenu échappé par le générateur) ; le comportement est simulé
 * ici, sans exécuter le script généré.
 */
function Preview({ config }: { config: BannerConfig }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [lastAction, setLastAction] = useState("");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>${generateCss(config)}\n${PREVIEW_CSS}</style>${generateMarkup(config)}`;

    const root = shadow.getElementById("konsent-root");
    const panel = shadow.getElementById("kz-panel");
    const manage = shadow.querySelector<HTMLButtonElement>(".kz-manage");
    const customize = shadow.querySelector<HTMLButtonElement>('[data-kz-action="customize"]');
    const save = shadow.querySelector<HTMLButtonElement>('[data-kz-action="save"]');
    if (!root) return;
    root.hidden = false;

    const showPanel = (show: boolean) => {
      if (!panel || !customize || !save) return;
      panel.hidden = !show;
      customize.hidden = show;
      customize.setAttribute("aria-expanded", String(show));
      save.hidden = !show;
    };

    const finish = (label: string) => {
      root.hidden = true;
      if (manage) {
        manage.hidden = false;
        manage.focus();
      }
      setLastAction(label);
    };

    const onClick = (e: Event) => {
      const target = e.target as Element | null;
      if (target?.closest("[data-konsent-open]")) {
        showPanel(false);
        root.hidden = false;
        if (manage) manage.hidden = true;
        root.querySelector<HTMLElement>(".kz-dialog")?.focus();
        setLastAction("");
        return;
      }
      if (target?.closest(".kz-text a")) {
        e.preventDefault();
        return;
      }
      const action = target?.closest("[data-kz-action]")?.getAttribute("data-kz-action");
      if (action === "customize") {
        showPanel(true);
        shadow.querySelector<HTMLInputElement>("input[data-kz-cat]")?.focus();
      } else if (action === "accept") finish("Aperçu : « Tout accepter » simulé.");
      else if (action === "refuse") finish("Aperçu : « Tout refuser » simulé.");
      else if (action === "save") {
        const chosen = Array.from(
          shadow.querySelectorAll<HTMLInputElement>("input[data-kz-cat]:checked"),
        ).map((i) => i.getAttribute("data-kz-cat"));
        finish(
          `Aperçu : choix enregistré (${chosen.length > 0 ? chosen.join(", ") : "aucune finalité acceptée"}).`,
        );
      }
    };
    const onKey = (e: Event) => {
      if ((e as KeyboardEvent).key === "Escape" && !root.hidden) {
        e.preventDefault();
        finish("Aperçu : fermeture par Échap, traitée comme un refus.");
      }
    };

    setLastAction("");
    shadow.addEventListener("click", onClick);
    shadow.addEventListener("keydown", onKey);
    return () => {
      shadow.removeEventListener("click", onClick);
      shadow.removeEventListener("keydown", onKey);
    };
  }, [config]);

  return (
    <>
      <div
        className="relative mt-4 h-[30rem] overflow-hidden rounded-3xl border border-line-2 bg-surface-low"
        role="group"
        aria-label="Aperçu du bandeau sur une page fictive"
      >
        <div aria-hidden="true" className="space-y-3 p-6">
          <div className="h-5 w-1/3 rounded-full bg-line" />
          <div className="h-3 w-5/6 rounded-full bg-line" />
          <div className="h-3 w-4/6 rounded-full bg-line" />
          <div className="h-3 w-3/4 rounded-full bg-line" />
        </div>
        <div ref={hostRef} className="absolute inset-0" />
      </div>
      <p role="status" className="mt-2 min-h-6 text-sm text-muted">
        {lastAction}
      </p>
    </>
  );
}
