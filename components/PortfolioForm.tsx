"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** Saisie d'un portefeuille de domaines, avec réglages de marque blanche. */
export function PortfolioForm({ max }: { max: number }) {
  const [domains, setDomains] = useState("");
  const [agency, setAgency] = useState("");
  const [colour, setColour] = useState("#2563eb");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const parsed = domains
    .split(/[\s,;]+/)
    .map((d) => d.trim())
    .filter((d) => d.includes("."));

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (parsed.length === 0) {
      setError("Indiquez au moins un domaine, un par ligne.");
      return;
    }
    setError(null);

    const params = new URLSearchParams({ domaines: parsed.slice(0, max).join(",") });
    if (agency.trim()) params.set("agence", agency.trim());
    if (colour && colour !== "#2563eb") params.set("couleur", colour.replace("#", ""));

    startTransition(() => router.push(`/agence?${params.toString()}`));
  }

  return (
    <form onSubmit={submit} className="rounded-xl bg-surface p-6 ring-1 ring-line" noValidate>
      <h2 className="display text-xl text-ink-2">Analyser un portefeuille</h2>

      <div className="mt-5">
        <label htmlFor="domaines" className="tech text-[10px] text-muted">
          Domaines — un par ligne, {max} au maximum
        </label>
        <textarea
          id="domaines"
          rows={6}
          spellCheck={false}
          placeholder={"client-un.fr\nclient-deux.com\nclient-trois.fr"}
          value={domains}
          onChange={(e) => setDomains(e.target.value)}
          className="mt-1.5 w-full resize-y rounded-lg border border-line px-4 py-3 font-mono text-[14px] text-ink-2 outline-none transition placeholder:text-slate-400 focus:border-flame"
        />
        <p className="tech mt-1.5 text-[9px] text-muted">
          {parsed.length} domaine{parsed.length > 1 ? "s" : ""} reconnu
          {parsed.length > 1 ? "s" : ""}
          {parsed.length > max ? ` · seuls les ${max} premiers seront analysés` : ""}
        </p>
      </div>

      <fieldset className="mt-6 grid gap-4 sm:grid-cols-2">
        <legend className="tech text-[10px] text-muted">
          Marque blanche — facultatif
        </legend>
        <div>
          <label htmlFor="agence" className="text-[13px] font-medium text-ink-2">
            Nom de votre agence
          </label>
          <input
            id="agence"
            type="text"
            maxLength={48}
            placeholder="Studio Dupont"
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-[14px] text-ink-2 outline-none transition placeholder:text-slate-400 focus:border-flame"
          />
        </div>
        <div>
          <label htmlFor="couleur" className="text-[13px] font-medium text-ink-2">
            Couleur d&apos;accent
          </label>
          <div className="mt-1.5 flex items-center gap-3">
            <input
              id="couleur"
              type="color"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-line bg-white p-1"
            />
            <span className="font-mono text-[13px] text-muted">{colour}</span>
          </div>
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-crit">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="tech mt-6 w-full rounded bg-flame px-6 py-3.5 text-[11px] text-white transition hover:bg-flame-dark disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Analyse du portefeuille…" : "Analyser le portefeuille"}
      </button>
    </form>
  );
}
