import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SECTORS } from "@/lib/seo/sectors";

export const metadata: Metadata = {
  title: "Cookies et RGPD par secteur",
  description:
    "E-commerce, santé, collectivités territoriales, médias et presse : les traceurs typiques, les obligations propres à chaque secteur et les règles du référentiel qui comptent le plus.",
};

export default function SectorsIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      <Breadcrumbs items={[{ href: "/secteurs", label: "Secteurs" }]} />

      <header className="max-w-3xl">
        <p className="tech text-[10px] text-flame">Secteurs</p>
        <h1 className="display mt-3 text-3xl text-ink-2 sm:text-4xl">
          Les mêmes règles, des risques différents
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          L&apos;article 82 s&apos;applique à tous les sites. Mais une boutique en ligne, un site
          de santé, une collectivité et un titre de presse n&apos;embarquent pas les mêmes
          traceurs et ne relèvent pas des mêmes textes complémentaires. Ces fiches signalent ce
          qui change, références à l&apos;appui.
        </p>
      </header>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {SECTORS.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/secteurs/${s.slug}`}
              className="card-lift group flex h-full flex-col rounded-3xl border border-line bg-surface p-6 shadow-md"
            >
              <h2 className="display text-xl text-ink-2 group-hover:text-flame">{s.name}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.metaDescription}</p>
              <span className="tech mt-auto pt-4 text-[10px] text-flame" aria-hidden="true">
                Lire la fiche →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-xs leading-relaxed text-muted">
        Ces fiches sont une information générale. Elles ne constituent ni une consultation
        juridique ni une garantie de conformité : seule l&apos;analyse de votre situation réelle
        permet de conclure.
      </p>
    </div>
  );
}
