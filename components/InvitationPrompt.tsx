"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Invitation d'une agence, présentée au TITULAIRE du compte. Le rattachement
 * n'a lieu que s'il l'accepte ici, avec sa propre session.
 */
export function InvitationPrompt({ agencyEmail }: { agencyEmail: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(accept: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/agence/invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "La réponse n'a pas pu être enregistrée.");
        return;
      }
      router.refresh();
    } catch {
      setError("Le service n'a pas répondu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="invitation-titre"
      className="mt-6 rounded-xl border-l-2 border-flame bg-flame-bg/60 px-5 py-4"
    >
      <h2 id="invitation-titre" className="text-base font-bold text-ink-2">
        Invitation d&apos;une agence
      </h2>
      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
        Le compte agence <strong>{agencyEmail}</strong> vous invite à rattacher votre compte à son
        portefeuille. Si vous acceptez, cette agence verra vos domaines surveillés et leurs
        résultats ; vous ne verrez ni les siens, ni ceux de ses autres clients. Vous pourrez lui
        demander de vous détacher à tout moment.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => answer(true)}
          className="font-display btn-primary min-h-11 rounded-full bg-flame px-5 text-sm font-bold text-white disabled:opacity-60"
        >
          Accepter le rattachement
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => answer(false)}
          className="font-display min-h-11 rounded-full border-2 border-line-2 px-5 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-high disabled:opacity-60"
        >
          Refuser
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-crit-text">
          {error}
        </p>
      ) : null}
    </section>
  );
}
