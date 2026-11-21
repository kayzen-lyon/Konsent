import Link from "next/link";
import { PLANS, formatAmount } from "@/lib/billing/plans";
import { readiness } from "@/lib/billing/readiness";
import type { Metadata } from "next";
import { Disclaimer } from "@/components/primitives";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Tarifs Konsent : analyse RGPD gratuite et sans inscription, abonnements de surveillance des traceurs et prestations de mise en conformité à prix affichés.",
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

/**
 * Comparatif croisé. Les offres sont cumulatives : chacune inclut celle qui
 * la précède. Une promesse non livrée reste marquée « à venir », comme sur
 * les cartes : le tableau ne doit jamais être plus optimiste qu'elles.
 */
type Cell = string | boolean | "soon";
const COMPARISON: readonly { label: string; cells: readonly [Cell, Cell, Cell, Cell] }[] = [
  { label: "Analyse à la demande et rapport complet", cells: [true, true, true, true] },
  { label: "Outils libres et référentiel", cells: [true, true, true, true] },
  { label: "Domaines surveillés", cells: [false, "1", "5", "25"] },
  { label: "Analyse automatique", cells: [false, "Mensuelle", "Hebdomadaire", "Hebdomadaire"] },
  { label: "Alerte en cas de nouveau traceur", cells: [false, true, true, true] },
  { label: "Historique de score (13 mois)", cells: [false, true, true, true] },
  { label: "Détection de régression", cells: [false, false, true, true] },
  { label: "Archive de preuve signée", cells: [false, false, true, true] },
  { label: "Documents générés", cells: ["Brouillon cookies", "6", "soon", "soon"] },
  { label: "Accès API avec clé", cells: [false, false, "soon", "soon"] },
  { label: "250 pages par analyse", cells: [false, false, "soon", "soon"] },
  { label: "Protocole complet en trois phases", cells: [false, "soon", "soon", "soon"] },
  { label: "Vue portefeuille et sous-comptes clients", cells: [false, false, false, true] },
  { label: "Marque blanche et devis à votre grille", cells: [false, false, false, true] },
];

function ComparisonCell({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <>
        <span aria-hidden="true" className="font-bold text-ok">✓</span>
        <span className="sr-only">Inclus</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <span aria-hidden="true" className="text-muted">—</span>
        <span className="sr-only">Non inclus</span>
      </>
    );
  }
  if (value === "soon") return <span className="text-[12px] text-muted">À venir</span>;
  return <span className="font-semibold text-ink-2">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-2 sm:text-4xl">Tarifs</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          L&apos;analyse est gratuite parce qu&apos;elle coûte quelques millièmes d&apos;euro à
          produire. Ce qui se facture, c&apos;est la surveillance dans le temps et la correction.
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          Le prix ne dépend pas de votre trafic. Une entreprise de vingt personnes encourt les
          mêmes sanctions qu&apos;un site à fort trafic ; lui facturer le contrôle au nombre de
          pages vues reviendrait à vendre un outil, pas un contrôle.
        </p>
      </header>

      <div className="mt-8 max-w-3xl rounded-lg border border-line bg-slate-50 p-5 text-[14px] leading-relaxed text-muted">
        <p className="text-ink-2">
          <strong>Ce que nous ne facturons pas encore.</strong>
        </p>
        <p className="mt-2">
          Chaque offre indique en clair ce qui n&apos;est pas encore livré, et la souscription en
          ligne reste fermée tant qu&apos;une promesse n&apos;est pas tenue. Nous préférons
          l&apos;écrire que le découvrir avec vous après le premier prélèvement. Écrivez-nous si
          une offre vous intéresse : nous vous dirons où elle en est.
        </p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-4">
        {PLANS.map((p) => {
          const state = readiness(p);
          const delivered = p.features.filter((f) => f.delivered);
          const upcoming = p.features.filter((f) => !f.delivered);
          return (
            <div
              key={p.id}
              className={`flex flex-col rounded-xl border bg-surface p-5 ${
                p.highlighted ? "border-secondary ring-1 ring-secondary" : "border-line"
              }`}
            >
              {p.highlighted ? (
                <span className="mb-2 inline-flex w-fit rounded-full bg-flame-bg px-2 py-0.5 text-[11px] font-semibold text-flame-deep">
                  Le plus demandé
                </span>
              ) : null}
              <h2 className="text-[15px] font-semibold text-ink-2">{p.name}</h2>
              <p className="mt-2">
                <span className="tabular text-3xl font-semibold text-ink-2">
                  {formatAmount(p.amountCents)}
                </span>
                <span className="text-sm text-muted">{p.amountCents === null ? "" : " / mois"}</span>
              </p>
              <p className="mt-1.5 text-[13px] text-muted">{p.pitch}</p>

              <ul className="mt-4 space-y-1.5">
                {delivered.map((f) => (
                  <li key={f.label} className="text-[13px] leading-snug text-ink-2">
                    · {f.label}
                  </li>
                ))}
              </ul>

              {upcoming.length > 0 ? (
                <div className="mt-4 flex-1 rounded-lg bg-slate-50 p-3">
                  <p className="tech text-[10px] text-muted">Pas encore livré</p>
                  <ul className="mt-1.5 space-y-1">
                    {upcoming.map((f) => (
                      <li key={f.label} className="text-[13px] leading-snug text-muted">
                        · {f.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex-1" />
              )}

              <Link
                href={p.amountCents === null ? "/#scan" : "mailto:contact@kayzen-lyon.fr"}
                className={`mt-5 rounded-lg px-4 py-2 text-center text-sm font-semibold transition ${
                  p.highlighted
                    ? "bg-flame text-white hover:bg-flame-dark"
                    : "border-2 border-flame text-flame hover:bg-surface-high"
                }`}
              >
                {p.amountCents === null
                  ? "Analyser un site"
                  : state.sellable
                    ? "Souscrire"
                    : "Nous écrire"}
              </Link>
            </div>
          );
        })}
      </div>

      <section className="mt-14" aria-labelledby="comparatif">
        <h2 id="comparatif" className="text-xl font-semibold tracking-tight text-ink-2">
          Comparatif détaillé
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Chaque offre inclut celle qui la précède. « À venir » signale une promesse qui
          n&apos;est pas encore livrée : elle n&apos;est pas facturée tant qu&apos;elle ne l&apos;est pas.
        </p>
        <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Comparatif des offres Konsent</caption>
            <thead className="bg-surface-low">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-2">
                  Fonctionnalité
                </th>
                {PLANS.map((p) => (
                  <th key={p.id} scope="col" className="px-4 py-3 text-center font-semibold text-ink-2">
                    {p.name}
                    <span className="block text-[12px] font-normal text-muted">
                      {formatAmount(p.amountCents)}
                      {p.amountCents === null ? "" : " / mois"}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {COMPARISON.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="px-4 py-2.5 font-normal text-ink-2">
                    {row.label}
                  </th>
                  {row.cells.map((c, i) => (
                    <td key={PLANS[i]?.id ?? i} className="px-4 py-2.5 text-center">
                      <ComparisonCell value={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight text-ink-2">
          Prestations de correction
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Constater un écart ne le corrige pas. Ces prestations sont réalisées par l&apos;équipe
          technique de KAYZEN, puis validées par une nouvelle analyse.
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
