"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Actions du rapport : partager, copier le lien, télécharger les données
 * brutes, comparer, afficher un badge. Rien n'est envoyé à un tiers : le
 * partage passe par la feuille de partage du système (Web Share API) quand
 * elle existe, par le presse-papiers sinon.
 */
export function ReportActions({ target, hostname }: { target: string; hostname: string }) {
  const [status, setStatus] = useState("");
  const enc = encodeURIComponent(target);

  async function share() {
    const url = window.location.href;
    const title = `Audit Konsent de ${hostname}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus("Lien du rapport copié.");
    } catch {
      /* partage annulé : rien à signaler */
    }
  }

  const pill =
    "font-display inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-semibold text-ink-2 transition-colors hover:border-flame hover:text-flame";

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button type="button" onClick={share} className={pill}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" />
        </svg>
        Partager
      </button>
      <a href={`/api/scan?url=${enc}`} download={`konsent-${hostname}.json`} className={pill}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
        Données JSON
      </a>
      <Link href={`/comparer?a=${enc}`} className={pill}>
        Comparer à un autre site
      </Link>
      <Link href={`/badge?url=${enc}`} className={pill}>
        Obtenir le badge
      </Link>
      <span role="status" className="text-[13px] text-muted">
        {status}
      </span>
    </div>
  );
}
