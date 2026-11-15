"use client";

import { useState } from "react";
import { HONEYPOT_FIELD } from "@/lib/contact/fields";

/**
 * Inscription à la lettre mensuelle de la veille.
 *
 * Même pot de miel que le formulaire de contact (hors écran, hors arbre
 * d'accessibilité, hors tabulation). Case de consentement jamais pré-cochée.
 * Le résultat est annoncé par une région `aria-live`, sans déplacer le focus.
 */
export function NewsletterForm() {
  const [state, setState] = useState<{ tone: "idle" | "sending" | "ok" | "error"; message?: string }>(
    { tone: "idle" },
  );
  const [consent, setConsent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    setState({ tone: "sending" });
    try {
      const res = await fetch("/api/veille/abonnement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setState({ tone: "error", message: body.error ?? "Inscription impossible." });
        return;
      }
      form.reset();
      setConsent(false);
      setState({ tone: "ok", message: body.message ?? "Demande enregistrée." });
    } catch {
      setState({ tone: "error", message: "Le service n'a pas répondu. Réessayez dans un instant." });
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`veille-${HONEYPOT_FIELD}`}>Ne pas remplir</label>
        <input
          id={`veille-${HONEYPOT_FIELD}`}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div>
        <label htmlFor="veille-email" className="tech text-[10px] text-white/70">
          Adresse électronique <span aria-hidden="true">*</span>
          <span className="sr-only">(obligatoire)</span>
        </label>
        <input
          id="veille-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          inputMode="email"
          className="mt-1.5 w-full max-w-md rounded-lg border border-line-2 bg-surface px-3.5 py-2.5 text-[15px] text-ink-2"
        />
      </div>

      <div className="flex items-start gap-3">
        <input
          id="veille-consentement"
          name="consentement"
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-flame"
        />
        <label htmlFor="veille-consentement" className="text-[14px] leading-relaxed text-white/80">
          J&apos;accepte de recevoir la lettre mensuelle de la veille à cette adresse. Elle ne sert
          à rien d&apos;autre ; chaque lettre contient un lien de désabonnement qui efface
          l&apos;adresse. <span aria-hidden="true">*</span>
          <span className="sr-only">(obligatoire)</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={state.tone === "sending"}
        className="tech rounded-full bg-flame px-5 py-3 text-[11px] text-white shadow-md transition hover:bg-flame-dark disabled:opacity-50"
      >
        {state.tone === "sending" ? "Envoi…" : "M'inscrire"}
      </button>

      <p
        role="status"
        aria-live="polite"
        className={`text-[14px] leading-relaxed ${state.tone === "error" ? "text-flame-soft" : "text-white/80"}`}
      >
        {state.message ?? ""}
      </p>
    </form>
  );
}
