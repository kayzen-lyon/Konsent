"use client";

import { useState } from "react";

/**
 * Demande d'un lien de connexion.
 *
 * Aucun mot de passe n'est demandé, et l'interface le dit plutôt que de
 * laisser l'utilisateur chercher le champ manquant.
 */
export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("pending");
    setMessage(null);

    try {
      const response = await fetch("/api/auth/lien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setState("error");
        setMessage(payload.error ?? "La demande n'a pas abouti.");
        return;
      }
      setState("sent");
      setMessage(payload.message ?? null);
    } catch {
      setState("error");
      setMessage("La demande n'a pas pu être envoyée. Vérifiez votre connexion.");
    }
  }

  if (state === "sent") {
    return (
      <div className="mt-8 rounded-lg border border-ok/30 bg-ok-bg/50 p-6" role="status">
        <p className="font-medium text-ok">Demande enregistrée</p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{message}</p>
        <p className="mt-3 text-sm text-muted">
          Le lien expire dans 15 minutes et ne fonctionne qu&apos;une fois, <strong>dans ce navigateur</strong> : ouvrez l&apos;e-mail ici, sans changer d&apos;appareil.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8">
      <label htmlFor="email" className="block text-sm font-medium text-ink-2">
        Adresse e-mail
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="vous@entreprise.fr"
        aria-invalid={state === "error" ? true : undefined}
        aria-describedby={state === "error" && message ? "connexion-erreur" : undefined}
        className="mt-2 w-full rounded-lg border border-line-2 bg-surface px-4 py-3 text-[15px] text-ink-2 focus:border-flame focus:ring-1 focus:ring-flame"
      />

      <button
        type="submit"
        disabled={state === "pending"}
        className="mt-4 w-full rounded-full bg-flame shadow-md px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-flame-dark disabled:opacity-60"
      >
        {state === "pending" ? "Envoi en cours…" : "Recevoir un lien de connexion"}
      </button>

      {state === "error" && message ? (
        <p id="connexion-erreur" role="alert" className="mt-3 text-sm text-crit">
          {message}
        </p>
      ) : null}

      <p className="mt-5 text-sm leading-relaxed text-muted">
        Il n&apos;y a pas de mot de passe. Nous vous envoyons un lien à usage unique — nous
        n&apos;avons donc aucun mot de passe à protéger, ni à vous faire réinitialiser.
      </p>
    </form>
  );
}
