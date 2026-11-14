"use client";

import { useEffect, useState } from "react";

/**
 * Copie d'un correctif dans le presse-papiers.
 *
 * Absent sans JavaScript (il ne pourrait rien faire) et à l'impression : le
 * texte du correctif reste lisible dans le rapport, ce bouton n'est qu'un
 * raccourci.
 */
export function CopyFixButton({ text, label = "Copier le correctif" }: { text: string; label?: string }) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => setReady(true), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Correctif copié dans le presse-papiers.");
    } catch {
      setStatus("La copie a échoué : sélectionnez le texte manuellement.");
    }
  }

  return (
    <span className="mt-2 flex flex-wrap items-center gap-2 print:hidden">
      {ready ? (
        <button
          type="button"
          onClick={copy}
          className="font-display inline-flex min-h-9 items-center rounded-full border border-line px-3 text-[12px] font-semibold text-ink-2 transition-colors hover:border-flame hover:text-flame"
        >
          {label}
        </button>
      ) : null}
      <span role="status" className="text-[11px] text-muted">
        {status}
      </span>
    </span>
  );
}
