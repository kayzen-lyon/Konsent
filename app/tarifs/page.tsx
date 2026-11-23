import Link from "next/link";
import { FREE_PLAN } from "@/lib/billing/plans";
import { misconfigured } from "@/lib/billing/readiness";
import type { Metadata } from "next";
import { Disclaimer } from "@/components/primitives";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Konsent est gratuit : analyse RGPD des cookies et traceurs, surveillance, archive de preuve et espace agence, sans abonnement. Code source public sous licence FSL-1.1-MIT.",
};

/**
 * La grille n'est plus définie ici : elle vient de `lib/billing/plans.ts`, que
 * lisent aussi le paiement et le contrôle de sincérité. Deux définitions
 * auraient fini par diverger, et l'écart ne se serait vu qu'au premier litige.
 */


const SERVICES = [
  ["Mise en conformité technique standard", "1 490 €"],
  ["Mise en conformité e-commerce ou multi-domaines", "2 900 €"],
  ["Pose et configuration d'un bandeau (agnostique)", "890 €"],
  ["Pack documentaire rédigé et personnalisé", "690 €"],
  ["Accompagnement en cas de contrôle", "1 900 €"],
  ["Référent RGPD externalisé", "190 € / mois"],
];

export default function PricingPage() {
  const delivered = FREE_PLAN.features.filter((f) => f.delivered);
  const upcoming = FREE_PLAN.features.filter((f) => !f.delivered);
  const notConfigured = new Set(misconfigured(FREE_PLAN).map((m) => m.label));

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="tech text-[11px] text-flame">Tarifs</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-2 sm:text-4xl">
          Konsent est gratuit.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          Toutes les fonctionnalités, pour tous : analyse, surveillance, archive de preuve,
          espace agence. Sans abonnement ni carte bancaire.
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          Le code source est public, sous licence{" "}
          <a
            href="https://fsl.software/"
            className="font-semibold text-flame underline-offset-2 hover:underline"
            rel="noopener noreferrer"
          >
            FSL-1.1-MIT
          </a>{" "}
          : vous pouvez le lire, l&apos;utiliser et le modifier, sauf pour en faire un service
          concurrent ; chaque version devient libre sous licence MIT deux ans après sa
          publication.
        </p>
      </header>

      <div className="mt-10 grid gap-5 lg:grid-cols-[3fr_2fr]">
        <section
          aria-labelledby="inclus"
          className="rounded-xl border border-secondary bg-surface p-6 ring-1 ring-secondary"
        >
          <h2 id="inclus" className="display text-2xl text-ink-2">
            Ce qui est inclus
          </h2>
          <p className="mt-1 tabular text-3xl font-semibold text-ink-2">0 €</p>
          <ul className="mt-5 space-y-2">
            {delivered.map((f) => (
              <li key={f.label} className="text-sm leading-snug text-ink-2">
                <span aria-hidden="true" className="mr-2 font-bold text-ok">✓</span>
                {f.label}
                {notConfigured.has(f.label) ? (
                  <span className="mt-0.5 block pl-6 text-[13px] text-muted">
                    Prête, pas encore activée sur ce site.
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/#scan"
              className="rounded-full bg-flame px-5 py-2.5 text-sm font-semibold text-white hover:bg-flame-dark"
            >
              Analyser un site
            </Link>
            <Link
              href="/connexion"
              className="rounded-full border-2 border-flame px-5 py-2.5 text-sm font-semibold text-flame hover:bg-surface-high"
            >
              Créer un compte
            </Link>
          </div>
        </section>

        <section aria-labelledby="a-venir" className="rounded-xl border border-line bg-surface p-6">
          <h2 id="a-venir" className="display text-2xl text-ink-2">
            Pas encore livré
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Ce que nous ne savons pas encore faire, écrit en clair plutôt que promis.
          </p>
          <ul className="mt-4 space-y-3">
            {upcoming.map((f) => (
              <li key={f.label} className="text-sm leading-snug text-ink-2">
                {f.label}
                {f.gap ? <span className="mt-0.5 block text-[13px] text-muted">{f.gap}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight text-ink-2">
          Prestations de correction, facultatives
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Konsent reste gratuit. Pour qui préfère déléguer la correction, l&apos;équipe
          technique de KAYZEN propose ces prestations à part, validées ensuite par une nouvelle
          analyse. Rien ne vous oblige à y recourir : chaque constat du rapport donne sa
          procédure de correction.
        </p>
        <div className="mt-5 overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Prestations de correction et tarifs indicatifs</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Prestation</th>
                <th scope="col">Tarif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {SERVICES.map(([label, price]) => (
                <tr key={label}>
                  <th scope="row" className="px-5 py-3 font-normal text-ink-2">
                    {label}
                  </th>
                  <td className="tabular px-5 py-3 text-right font-semibold text-ink-2">
                    {price}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          Tarifs indicatifs nets — TVA non applicable, art. 293 B du CGI — susceptibles d&apos;évoluer selon le périmètre réel.
        </p>
      </section>

      <div className="mt-12">
        <Disclaimer variant="short" />
      </div>
    </div>
  );
}
