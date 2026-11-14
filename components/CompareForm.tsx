"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

type Errors = { a?: string; b?: string };

function check(raw: string): string | undefined {
  if (!raw) return "Indiquez une adresse.";
  if (!raw.includes(".")) return "Cette adresse semble incomplète — il manque un nom de domaine.";
  return undefined;
}

/** Formulaire de comparaison : deux adresses, une seule navigation. */
export function CompareForm({ defaultA = "", defaultB = "" }: { defaultA?: string; defaultB?: string }) {
  const [a, setA] = useState(defaultA);
  const [b, setB] = useState(defaultB);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const uid = useId();
  const ids = {
    a: `compare-a-${uid}`,
    b: `compare-b-${uid}`,
    aError: `compare-a-error-${uid}`,
    bError: `compare-b-error-${uid}`,
    hint: `compare-hint-${uid}`,
  };

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rawA = a.trim();
    const rawB = b.trim();
    const next: Errors = { a: check(rawA), b: check(rawB) };
    if (!next.b && rawA && rawA.toLowerCase() === rawB.toLowerCase()) {
      next.b = "Les deux adresses sont identiques : indiquez un second site.";
    }
    setErrors(next);
    if (next.a || next.b) return;
    const query = `a=${encodeURIComponent(rawA)}&b=${encodeURIComponent(rawB)}`;
    startTransition(() => router.push(`/comparer?${query}`));
  }

  const inputClass =
    "w-full rounded-full border border-line-2 bg-surface px-5 py-3.5 font-mono text-[15px] text-ink-2 placeholder:text-muted transition";

  return (
    <form onSubmit={submit} className="w-full" noValidate aria-describedby={ids.hint}>
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-start">
        {(["a", "b"] as const).map((side) => {
          const error = errors[side];
          const errorId = side === "a" ? ids.aError : ids.bError;
          return (
            <div key={side}>
              <label htmlFor={ids[side]} className="tech mb-2 block text-[10px] text-muted">
                {side === "a" ? "Site A" : "Site B"}
              </label>
              <input
                id={ids[side]}
                name={side}
                type="text"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                placeholder={side === "a" ? "exemple.fr" : "concurrent.fr"}
                value={side === "a" ? a : b}
                onChange={(e) => (side === "a" ? setA : setB)(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={inputClass}
              />
              {error ? (
                <p id={errorId} role="alert" className="mt-2 text-sm text-crit">
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
        <button
          type="submit"
          disabled={pending}
          className="btn-primary tech shrink-0 rounded-full bg-flame px-6 py-3.5 text-[11px] text-white shadow-md hover:bg-flame-dark disabled:cursor-wait disabled:opacity-70 md:mt-[26px]"
        >
          {pending ? "Analyse…" : "Comparer"}
        </button>
      </div>
      <p id={ids.hint} className="mt-3 text-[13px] text-muted">
        Les deux analyses sont lancées en parallèle. Sans inscription, résultat à l&apos;écran.
      </p>
    </form>
  );
}
