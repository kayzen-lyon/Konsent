import Link from "next/link";
import type { Metadata } from "next";
import { Disclaimer } from "@/components/primitives";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Analyse gratuite sans inscription. Abonnements de surveillance et prestations de mise en conformité.",
};

const PLANS = [
  {
    name: "Analyse libre",
    price: "0 €",
    cadence: "",
    pitch: "Pour savoir où vous en êtes.",
    features: [
      "Analyse à la demande, sans inscription",
      "Rapport complet à l'écran",
      "Référentiel et base des traceurs en accès libre",
      "Brouillon de politique cookies",
    ],
    cta: { label: "Analyser un site", href: "/#scan" },
    highlighted: false,
  },
  {
    name: "Starter",
    price: "29 €",
    cadence: "/ mois",
    pitch: "Pour un site unique à surveiller.",
    features: [
      "1 domaine · 25 pages par analyse",
      "Protocole complet en trois phases",
      "Analyse mensuelle automatique",
      "Alerte en cas de nouveau traceur",
      "6 documents générés",
    ],
    cta: { label: "Nous écrire", href: "mailto:contact@kayzen-lyon.fr" },
    highlighted: false,
  },
  {
    name: "Pro",
    price: "89 €",
    cadence: "/ mois",
    pitch: "Pour un site marchand ou plusieurs marques.",
    features: [
      "5 domaines · 250 pages par analyse",
      "Analyse hebdomadaire et détection de régression",
      "Archive de preuve horodatée",
      "24 documents générés",
      "Accès API",
    ],
    cta: { label: "Nous écrire", href: "mailto:contact@kayzen-lyon.fr" },
    highlighted: true,
  },
  {
    name: "Agence",
    price: "249 €",
    cadence: "/ mois",
    pitch: "Pour gérer un portefeuille de clients.",
    features: [
      "25 domaines · vue portefeuille",
      "Rapports à votre marque",
      "Sous-comptes clients cloisonnés",
      "Devis générés à votre grille tarifaire",
    ],
    cta: { label: "Nous écrire", href: "mailto:contact@kayzen-lyon.fr" },
    highlighted: false,
  },
];

const SERVICES = [
  ["Mise en conformité technique standard", "1 490 €"],
  ["Mise en conformité e-commerce ou multi-domaines", "2 900 €"],
  ["Pose et configuration d'un bandeau (agnostique)", "890 €"],
  ["Pack documentaire rédigé et personnalisé", "690 €"],
  ["Accompagnement en cas de contrôle", "1 900 €"],
  ["Référent RGPD externalisé", "190 € / mois"],
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-k-ink sm:text-4xl">Tarifs</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-k-muted">
          L&apos;analyse est gratuite parce qu&apos;elle coûte quelques millièmes d&apos;euro à
          produire. Ce qui se facture, c&apos;est la surveillance dans le temps et la correction.
        </p>
      </header>

      <div className="mt-10 grid gap-4 lg:grid-cols-4">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col rounded-xl border bg-white p-5 ${
              p.highlighted ? "border-k-primary ring-1 ring-k-primary" : "border-k-line"
            }`}
          >
            {p.highlighted ? (
              <span className="mb-2 inline-flex w-fit rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
                Le plus demandé
              </span>
            ) : null}
            <h2 className="text-[15px] font-semibold text-k-ink">{p.name}</h2>
            <p className="mt-2">
              <span className="tabular text-3xl font-semibold text-k-ink">{p.price}</span>
              <span className="text-sm text-k-muted">{p.cadence}</span>
            </p>
            <p className="mt-1.5 text-[13px] text-k-muted">{p.pitch}</p>
            <ul className="mt-4 flex-1 space-y-1.5">
              {p.features.map((f) => (
                <li key={f} className="text-[13px] leading-snug text-k-ink">
                  · {f}
                </li>
              ))}
            </ul>
            <Link
              href={p.cta.href}
              className={`mt-5 rounded-lg px-4 py-2 text-center text-sm font-semibold transition ${
                p.highlighted
                  ? "bg-k-primary text-white hover:bg-k-primary-dark"
                  : "border border-k-line text-k-ink hover:border-k-primary hover:text-k-primary"
              }`}
            >
              {p.cta.label}
            </Link>
          </div>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight text-k-ink">
          Prestations de correction
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-k-muted">
          Constater un écart ne le corrige pas. Ces prestations sont réalisées par l&apos;équipe
          technique de KAYZEN LYON, puis validées par une nouvelle analyse.
        </p>
        <div className="mt-5 overflow-hidden rounded-xl border border-k-line bg-white">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-k-line">
              {SERVICES.map(([label, price]) => (
                <tr key={label}>
                  <td className="px-5 py-3 text-k-ink">{label}</td>
                  <td className="tabular px-5 py-3 text-right font-semibold text-k-ink">
                    {price}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-k-muted">
          Tarifs indicatifs hors taxes, susceptibles d&apos;évoluer selon le périmètre réel.
        </p>
      </section>

      <div className="mt-12">
        <Disclaimer variant="short" />
      </div>
    </div>
  );
}
