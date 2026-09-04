import Link from "next/link";
import type { Metadata } from "next";
import { Pill } from "@/components/primitives";
import { CATEGORY_LABELS } from "@/lib/trackers/db";
import { GUIDES } from "@/lib/seo/guides";

export const metadata: Metadata = {
  title: "Guides de correction",
  description:
    "Comment bloquer chaque service tiers avant consentement : Google Analytics, Meta Pixel, Hotjar, Google Fonts, YouTube et les autres. Avec le code, service par service.",
};

export default function GuidesIndexPage() {
  const byCategory = new Map<string, typeof GUIDES>();
  for (const g of GUIDES) {
    const cat = g.tracker.categories[0] ?? "autre";
    byCategory.set(cat, [...(byCategory.get(cat) ?? []), g]);
  }
  const categories = [...byCategory.keys()].sort((a, b) =>
    (CATEGORY_LABELS[a] ?? a).localeCompare(CATEGORY_LABELS[b] ?? b, "fr"),
  );

  return (
    <>
      <section className="grid-bg-dark bg-ink">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <p className="tech text-[10px] text-flame-soft">Guides</p>
          <h1 className="display mt-3 max-w-3xl text-3xl text-white sm:text-[2.8rem]">
            Corriger, service par service
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/65">
            Constater un écart ne le corrige pas. {GUIDES.length} guides, un par service tiers :
            pourquoi il pose question, comment le neutraliser tant que le consentement n&apos;est
            pas donné, et le code pour le faire.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-12">
        {categories.map((cat) => (
          <section key={cat} className="mb-10">
            <h2 className="display mb-4 text-xl text-ink-2">
              {CATEGORY_LABELS[cat] ?? cat}
            </h2>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {(byCategory.get(cat) ?? []).map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/guides/${g.slug}`}
                    className="group flex h-full flex-col rounded-lg bg-surface p-4 ring-1 ring-line transition hover:ring-flame"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[15px] font-bold leading-snug text-ink-2 group-hover:text-accent">
                        {g.tracker.name}
                      </span>
                      <Pill tone={g.tracker.adequacy === "EEA" ? "ok" : "danger"}>
                        {g.tracker.effectiveJurisdiction}
                      </Pill>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-muted">
                      {g.tracker.purposeFr}
                    </p>
                    <p className="tech mt-3 text-[9px] text-accent">
                      {g.snippets.length} extrait{g.snippets.length > 1 ? "s" : ""} de code
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="rounded-xl bg-ink p-6">
          <h2 className="display text-xl text-white">Lesquels vous concernent ?</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-white/65">
            Plutôt que de tout lire, lancez un audit : le rapport ne remonte que les services
            réellement présents sur votre site, avec le guide correspondant.
          </p>
          <Link
            href="/#scan"
            className="tech mt-5 inline-block rounded bg-white px-5 py-2.5 text-[11px] text-ink transition hover:bg-flame-soft"
          >
            Auditer mon site
          </Link>
        </section>
      </div>
    </>
  );
}
