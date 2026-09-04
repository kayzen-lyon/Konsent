"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** Saisie d'une comparaison : domaine + jeton de référence. */
export function BaselineInput({ initialUrl = "" }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const u = url.trim();
    const t = token.trim();
    if (!u.includes(".")) {
      setError("Indiquez le domaine à recontrôler.");
      return;
    }
    if (t.length < 20) {
      setError("Collez le jeton de référence figurant en bas d'un rapport d'audit.");
      return;
    }
    setError(null);
    startTransition(() =>
      router.push(`/surveillance?url=${encodeURIComponent(u)}&ref=${encodeURIComponent(t)}`),
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl bg-surface p-6 ring-1 ring-line shadow-md" noValidate>
      <h2 className="display text-xl text-ink-2">Comparer à une référence</h2>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="mon-url" className="tech text-[10px] text-muted">
            Domaine à recontrôler
          </label>
          <input
            id="mon-url"
            type="text"
            inputMode="url"
            spellCheck={false}
            placeholder="exemple.fr"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line px-4 py-3 font-mono text-[15px] text-ink-2 outline-none transition placeholder:text-slate-400 focus:border-flame"
          />
        </div>

        <div>
          <label htmlFor="mon-ref" className="tech text-[10px] text-muted">
            Jeton de référence
          </label>
          <textarea
            id="mon-ref"
            rows={4}
            spellCheck={false}
            placeholder="eyJ2IjoxLCJoIjoi…"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mt-1.5 w-full resize-y rounded-lg border border-line px-4 py-3 font-mono text-[12px] text-ink-2 outline-none transition placeholder:text-slate-400 focus:border-flame"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-crit">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="tech mt-5 w-full rounded-full bg-flame shadow-md px-6 py-3.5 text-[11px] text-white transition hover:bg-flame-dark disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Analyse en cours…" : "Détecter les changements"}
      </button>
    </form>
  );
}

/** Bloc d'export du jeton, affiché en bas d'un rapport d'audit. */
export function BaselineExport({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-xl bg-surface p-6 ring-1 ring-line shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="tech text-[10px] text-accent">Surveillance</p>
          <h3 className="display mt-1.5 text-xl text-ink-2">Jeton de référence</h3>
          <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-muted">
            Conservez ce jeton. En le représentant plus tard sur la page de surveillance, vous
            obtiendrez la liste de ce qui a changé depuis aujourd&apos;hui. Rien n&apos;est
            conservé de notre côté.
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="tech shrink-0 rounded-full border-2 border-flame px-4 py-2 text-[10px] text-flame transition hover:bg-surface-high"
        >
          {copied ? "Copié ✓" : "Copier"}
        </button>
      </div>

      <textarea
        readOnly
        rows={3}
        value={token}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Jeton de référence"
        className="mt-4 w-full resize-y rounded-lg bg-paper p-3 font-mono text-[11px] leading-relaxed text-muted outline-none"
      />
    </div>
  );
}
