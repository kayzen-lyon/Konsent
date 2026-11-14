import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Compte supprimé",
  robots: { index: false, follow: false },
};

/** Confirmation après exercice du droit à l'effacement depuis l'espace client. */
export default function AccountDeletedPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center sm:py-28" role="status">
      <p className="tech text-[11px] text-flame">Droit à l&apos;effacement</p>
      <h1 className="display mt-4 text-3xl text-ink-2 sm:text-4xl">Votre compte a été supprimé.</h1>
      <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-muted">
        Vos domaines surveillés, leur historique, vos alertes, vos clés d&apos;API et vos sessions
        ont été effacés. Le journal technique des appels d&apos;API est conservé sous forme
        anonyme jusqu&apos;à sa purge, et vos factures éventuelles restent chez notre prestataire
        de paiement pendant la durée légale de conservation comptable.
      </p>
      <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
        L&apos;audit gratuit reste accessible sans compte.
      </p>
      <Link
        href="/"
        className="font-display btn-primary mt-8 inline-flex min-h-11 items-center rounded-full bg-flame px-6 text-sm font-bold text-on-primary"
      >
        Revenir à l&apos;accueil
      </Link>
    </div>
  );
}
