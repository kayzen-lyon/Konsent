"use client";

import { useState } from "react";
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from "@/lib/contact/fields";

/**
 * Formulaire de contact, conforme RGPD et accessible.
 *
 * Le pot de miel est le point délicat : il doit être invisible pour un humain
 * SANS être une barrière d'accessibilité. Trois précautions cumulées :
 *
 *  · `aria-hidden="true"` le retire de l'arbre d'accessibilité — un lecteur
 *    d'écran ne l'annonce jamais, donc ne peut pas le faire remplir.
 *  · `tabIndex={-1}` le sort de l'ordre de tabulation — impossible de
 *    l'atteindre au clavier par inadvertance.
 *  · Il est déporté hors écran plutôt que masqué par `display:none`, parce
 *    qu'un robot ignore souvent les champs en `display:none` et tomberait
 *    moins dans le piège.
 *
 * `autoComplete="off"` évite en outre qu'un gestionnaire de mots de passe le
 * remplisse tout seul, ce qui bloquerait un utilisateur légitime.
 */
export function ContactForm({ token }: { token: string }) {
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
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setState({ tone: "error", message: body.error ?? "Envoi impossible." });
        return;
      }
      form.reset();
      setConsent(false);
      setState({
        tone: "ok",
        message:
          "Message reçu. Nous répondons sous deux jours ouvrés à l'adresse que vous avez indiquée.",
      });
    } catch {
      setState({ tone: "error", message: "Le service n'a pas répondu. Réessayez dans un instant." });
    }
  }

  const field =
    "mt-1.5 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink-2 placeholder:text-muted/70";

  return (
    <form onSubmit={submit} noValidate={false} className="space-y-5">
      {/* Champ leurre — voir l'en-tête du composant. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD}>Ne pas remplir</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <input type="hidden" name={TIMESTAMP_FIELD} defaultValue={token} />

      <div>
        <label htmlFor="nom" className="tech text-[10px] text-muted">
          Nom <span aria-hidden="true">*</span>
          <span className="sr-only">(obligatoire)</span>
        </label>
        <input id="nom" name="nom" type="text" required maxLength={120} autoComplete="name" className={field} />
      </div>

      <div>
        <label htmlFor="email" className="tech text-[10px] text-muted">
          Adresse électronique <span aria-hidden="true">*</span>
          <span className="sr-only">(obligatoire)</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          // `inputMode` et `autoComplete` sont des critères RGAA à part
          // entière : ils permettent la saisie assistée, exigée par le
          // critère 11.13 sur l'identification de la finalité des champs.
          inputMode="email"
          className={field}
        />
      </div>

      <div>
        <label htmlFor="message" className="tech text-[10px] text-muted">
          Message <span aria-hidden="true">*</span>
          <span className="sr-only">(obligatoire)</span>
        </label>
        <textarea id="message" name="message" required rows={6} maxLength={4000} className={field} />
        <p id="message-aide" className="mt-1.5 text-[12px] text-muted">
          4 000 caractères au plus. N&apos;indiquez aucune donnée sensible ni identifiant.
        </p>
      </div>

      {/* Case JAMAIS pré-cochée : un consentement pré-coché n'est pas un
          consentement (RGPD, considérant 32). */}
      <div className="flex items-start gap-3">
        <input
          id="consentement"
          name="consentement"
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#2563eb]"
        />
        <label htmlFor="consentement" className="text-[14px] leading-relaxed text-ink-2">
          J&apos;accepte que les informations ci-dessus soient utilisées pour répondre à ma demande.
          Elles ne servent à rien d&apos;autre et ne sont transmises à personne.
        </label>
      </div>

      <button
        type="submit"
        disabled={state.tone === "sending"}
        className="tech rounded-full bg-flame shadow-md px-5 py-3 text-[11px] text-white transition hover:bg-flame-dark disabled:opacity-50"
      >
        {state.tone === "sending" ? "Envoi…" : "Envoyer le message"}
      </button>

      {/* `role="status"` fait annoncer le résultat par un lecteur d'écran sans
          déplacer le focus : critère RGAA 7.4 sur les changements de contexte. */}
      <p
        role="status"
        aria-live="polite"
        className={`text-[14px] leading-relaxed ${
          state.tone === "error" ? "text-crit" : state.tone === "ok" ? "text-ok" : "text-muted"
        }`}
      >
        {state.message ?? ""}
      </p>
    </form>
  );
}
