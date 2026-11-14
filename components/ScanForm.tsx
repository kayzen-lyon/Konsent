"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

/**
 * Formulaire d'analyse. Aucune inscription, aucune adresse e-mail exigée
 * pour voir le résultat — contrairement à l'usage du marché, qui place le
 * rapport derrière un formulaire de capture.
 */
export function ScanForm({
  autoFocus = false,
  tone = "light",
}: {
  autoFocus?: boolean;
  tone?: "light" | "dark";
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  // Identifiants uniques : le formulaire figure deux fois sur l'accueil.
  const uid = useId();
  const inputId = `scan-url-${uid}`;
  const errorId = `scan-error-${uid}`;

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
    startTransition(() => router.push(`/scan?url=${encodeURIComponent(raw)}`));
  }

  const dark = tone === "dark";

  return (
    <form onSubmit={submit} className="w-full" noValidate>
      <div
        className={`flex flex-col gap-2 sm:flex-row sm:gap-0 sm:rounded-full sm:p-1.5 ${
          dark ? "sm:bg-white/10 sm:ring-1 sm:ring-white/40" : "sm:bg-surface sm:shadow-md sm:ring-1 sm:ring-line-2"
        }`}
      >
        <label htmlFor={inputId} className="sr-only">
          Adresse du site à analyser
        </label>
        <input
          id={inputId}
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
          aria-describedby={error ? errorId : undefined}
          className={`min-w-0 flex-1 rounded-full px-5 py-3.5 font-mono text-[15px] transition ${
            dark
              ? "border border-white/40 bg-white/5 text-white placeholder:text-white/60 focus:bg-white/10 sm:border-0"
              : "border border-line-2 bg-surface text-ink-2 placeholder:text-muted sm:border-0"
          }`}
        />
        <button
          type="submit"
          disabled={pending}
          className="tech shrink-0 rounded-full bg-flame shadow-md px-6 py-3.5 text-[11px] text-white transition hover:bg-flame-dark disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? "Analyse…" : "Lancer l'audit gratuit"}
        </button>
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className={`mt-2 text-sm ${dark ? "text-red-300" : "text-crit"}`}
        >
          {error}
        </p>
      ) : (
        <p className={`mt-2.5 text-[13px] ${dark ? "text-white/50" : "text-muted"}`}>
          Sans inscription, sans e-mail, sans carte bancaire. Résultat immédiat à l&apos;écran.
        </p>
      )}
    </form>
  );
}
