"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Formulaire d'analyse. Aucune inscription, aucune carte bancaire (§16, n°101).
 * La navigation vers /scan déclenche l'exécution côté serveur.
 */
export function ScanForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = value.trim();
    if (!raw) {
      setError("Indiquez l'adresse d'un site à analyser.");
      return;
    }
    if (!raw.includes(".")) {
      setError("Cette adresse semble incomplète — il manque un nom de domaine.");
      return;
    }
    setError(null);
    startTransition(() => {
      router.push(`/scan?url=${encodeURIComponent(raw)}`);
    });
  }

  return (
    <form onSubmit={submit} className="w-full" noValidate>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="scan-url" className="sr-only">
            Adresse du site à analyser
          </label>
          <input
            id="scan-url"
            name="url"
            type="text"
            inputMode="url"
            autoComplete="url"
            autoFocus={autoFocus}
            spellCheck={false}
            placeholder="exemple.fr"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "scan-error" : undefined}
            className="w-full rounded-lg border border-k-line bg-white px-4 py-3 text-[15px] text-k-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-k-primary focus:ring-2 focus:ring-k-primary/20"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-k-primary px-6 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-k-primary-dark disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? "Analyse en cours…" : "Analyser gratuitement"}
        </button>
      </div>

      {error ? (
        <p id="scan-error" role="alert" className="mt-2 text-sm text-k-danger">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-[13px] text-k-muted">
          Sans inscription, sans carte bancaire. Résultat en une trentaine de secondes.
        </p>
      )}
    </form>
  );
}
