"use client";

import { useId, useState } from "react";

/**
 * Composeur du badge : adresse, aperçu, codes à copier.
 *
 * L'aperçu pointe vers /api/badge, même origine : compatible avec la CSP
 * `img-src 'self' data:`.
 */
export function BadgeBuilder({ siteOrigin }: { siteOrigin: string }) {
  const uid = useId();
  const inputId = `badge-url-${uid}`;
  const errorId = `badge-error-${uid}`;
  const [value, setValue] = useState("");
  const [host, setHost] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = value.trim();
    if (!raw || !raw.includes(".")) {
      setError("Indiquez l'adresse complète du site, par exemple exemple.fr.");
      return;
    }
    setError(null);
    setStatus("");
    setHost(raw.replace(/^https?:\/\//i, "").replace(/\/+$/, ""));
  }

  const query = host ? `url=${encodeURIComponent(host)}` : "";
  const badgeUrl = `${siteOrigin}/api/badge?${query}`;
  const reportUrl = `${siteOrigin}/scan?${query}`;
  const alt = host ? `Badge Konsent : score d'analyse RGPD et cookies de ${host}` : "";
  const snippets = host
    ? [
        {
          label: "HTML",
          code: `<a href="${reportUrl}"><img src="${badgeUrl}" alt="${alt.replace(/"/g, "&quot;")}"></a>`,
        },
        { label: "Markdown", code: `[![${alt}](${badgeUrl})](${reportUrl})` },
      ]
    : [];

  async function copy(label: string, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setStatus(`Code ${label} copié dans le presse-papiers.`);
    } catch {
      setStatus(`La copie a échoué : sélectionnez le code ${label} et copiez-le manuellement.`);
    }
  }

  return (
    <div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          Adresse de votre site
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          placeholder="exemple.fr"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 rounded-full border border-line-2 bg-surface px-5 py-3 font-mono text-[15px] text-ink-2 placeholder:text-muted"
        />
        <button
          type="submit"
          className="btn-primary tech shrink-0 rounded-full bg-flame px-6 py-3 text-[11px] text-on-primary hover:bg-flame-dark"
        >
          Générer le badge
        </button>
      </form>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-crit">
          {error}
        </p>
      ) : null}

      {host ? (
        <div className="mt-8 space-y-6">
          <div>
            <h2 className="tech text-[10px] text-muted">Aperçu</h2>
            {/* La première analyse peut prendre jusqu'à une minute. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/badge?${query}`} alt={alt} className="mt-3" height={20} />
            <p className="mt-2 text-xs text-muted">
              La première génération lance une analyse et peut prendre jusqu&apos;à une minute.
            </p>
          </div>

          {snippets.map((s) => (
            <div key={s.label}>
              <div className="flex items-center justify-between gap-4">
                <h2 className="tech text-[10px] text-muted">{s.label}</h2>
                <button
                  type="button"
                  onClick={() => copy(s.label, s.code)}
                  className="tech rounded-full px-4 py-1.5 text-[10px] text-flame ring-1 ring-line-2 hover:bg-surface-high"
                >
                  Copier<span className="sr-only"> le code {s.label}</span>
                </button>
              </div>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-low p-4 font-mono text-[13px] text-ink-2">
                <code>{s.code}</code>
              </pre>
            </div>
          ))}
        </div>
      ) : null}

      <p role="status" className="mt-4 text-sm text-ink-2">
        {status}
      </p>
    </div>
  );
}
