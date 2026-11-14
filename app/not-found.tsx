import type { Metadata } from "next";
import Link from "next/link";
import { ScanForm } from "@/components/ScanForm";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false, follow: true },
};

const SUGGESTIONS: [string, string][] = [
  ["/", "Lancer un audit gratuit"],
  ["/outils", "Les outils gratuits"],
  ["/regles", "Le référentiel des 139 règles"],
  ["/traceurs", "La base des traceurs"],
  ["/plan-du-site", "Le plan du site"],
  ["/contact", "Nous écrire"],
];

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:py-28">
      <p className="tech text-[11px] text-flame">Erreur 404</p>
      <h1 className="hero-title mt-4 text-ink-2">Cette page n&apos;existe pas.</h1>
      <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
        Le lien est peut-être ancien, ou l&apos;adresse a été mal saisie. Contrairement à un
        traceur, nous ne vous suivons pas : voici où aller.
      </p>

      <div className="mx-auto mt-10 max-w-xl text-left">
        <ScanForm />
      </div>

      <nav aria-label="Pages suggérées" className="mt-12">
        <ul className="flex flex-wrap justify-center gap-2.5">
          {SUGGESTIONS.map(([href, label]) => (
            <li key={href}>
              <Link
                href={href}
                className="font-display inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-semibold text-ink-2 transition-colors hover:border-flame hover:text-flame"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
