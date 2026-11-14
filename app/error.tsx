"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Erreur inattendue dans une page. Le détail technique reste côté serveur :
 * on n'affiche que l'empreinte (`digest`) qui permet de retrouver l'incident
 * dans les journaux, jamais le message brut.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center sm:py-28" role="alert">
      <p className="tech text-[11px] text-flame">Incident</p>
      <h1 className="display mt-4 text-3xl text-ink-2 sm:text-4xl">
        Quelque chose s&apos;est mal passé.
      </h1>
      <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-muted">
        Cette page n&apos;a pas pu s&apos;afficher. Réessayez ; si le problème persiste,
        écrivez-nous en indiquant la référence ci-dessous.
      </p>
      {error.digest ? (
        <p className="mt-4 font-mono text-[13px] text-muted">Référence : {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="font-display btn-primary min-h-11 rounded-full bg-flame px-6 text-sm font-bold text-on-primary"
        >
          Réessayer
        </button>
        <Link
          href="/contact"
          className="font-display inline-flex min-h-11 items-center rounded-full border-2 border-line-2 px-6 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-high"
        >
          Signaler le problème
        </Link>
      </div>
    </div>
  );
}
