"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
        className={`flex flex-col gap-2 sm:flex-row sm:gap-0 sm:rounded-lg sm:p-1.5 ${
          dark ? "sm:bg-white/10" : "sm:bg-white sm:shadow-lg sm:ring-1 sm:ring-ink/10"
        }`}
      >
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
          className={`min-w-0 flex-1 rounded-lg px-4 py-3.5 font-mono text-[15px] outline-none transition sm:rounded-md ${
            dark
              ? "bg-white/5 text-white placeholder:text-white/35 focus:bg-white/10"
              : "bg-white text-ink-2 placeholder:text-slate-400"
          }`}
        />
        <button
          type="submit"
          disabled={pending}
          className="tech shrink-0 rounded-lg bg-flame px-6 py-3.5 text-[11px] text-white transition hover:bg-flame-dark disabled:cursor-wait disabled:opacity-70 sm:rounded-md"
        >
          {pending ? "Analyse…" : "Lancer l'audit gratuit"}
        </button>
      </div>

      {error ? (
        <p
          id="scan-error"
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
