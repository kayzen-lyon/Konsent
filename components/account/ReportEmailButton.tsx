"use client";

import { useState } from "react";

/**
 * « M'envoyer le rapport par e-mail » pour un domaine surveillé.
 *
 * Le destinataire est toujours l'adresse du compte : aucun champ ne permet
 * d'en saisir une autre. Désactivé, avec son motif, si l'envoi d'e-mails
 * n'est pas configuré sur l'instance.
 */
export function ReportEmailButton({
  domainId,
  hostname,
  configured,
}: {
  domainId: string;
  hostname: string;
  configured: boolean;
}) {
  const [state, setState] = useState<{ tone: "idle" | "sending" | "ok" | "error"; message?: string }>(
    { tone: "idle" },
  );
  const helpId = `rapport-email-${domainId}`;

  async function send() {
    setState({ tone: "sending" });
    try {
      const res = await fetch("/api/espace/rapport-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domaine: domainId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; to?: string };
      if (!res.ok) {
        setState({ tone: "error", message: body.error ?? "Envoi impossible." });
        return;
      }
      setState({ tone: "ok", message: `Résumé de ${hostname} envoyé à ${body.to ?? "votre adresse"}.` });
    } catch {
      setState({ tone: "error", message: "Le service n'a pas répondu. Réessayez dans un instant." });
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={send}
        disabled={!configured || state.tone === "sending"}
        aria-describedby={configured ? undefined : helpId}
        className="rounded-full border-2 border-flame px-4 py-2 text-sm font-semibold text-flame transition hover:bg-surface-high disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state.tone === "sending" ? "Envoi…" : "M'envoyer le rapport par e-mail"}
        <span className="sr-only"> ({hostname})</span>
      </button>
      {configured ? null : (
        <p id={helpId} className="mt-1.5 text-[13px] text-muted">
          L&apos;envoi d&apos;e-mails n&apos;est pas encore activé sur cette instance ; ce bouton
          fonctionnera dès qu&apos;il le sera.
        </p>
      )}
      <p
        role="status"
        aria-live="polite"
        className={`mt-1.5 text-[13px] ${state.tone === "error" ? "text-crit" : "text-muted"}`}
      >
        {state.message ?? ""}
      </p>
    </div>
  );
}
