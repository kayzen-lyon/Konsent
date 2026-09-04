import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GLOSSARY, getTerm } from "@/lib/seo/glossary";

export function generateStaticParams() {
  return GLOSSARY.map((t) => ({ term: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ term: string }>;
}): Promise<Metadata> {
  const { term } = await params;
  const entry = getTerm(term);
  if (!entry) return { title: "Terme introuvable" };
  return {
    title: `${entry.term} — définition`,
    description: entry.short,
  };
}

export default async function TermPage({ params }: { params: Promise<{ term: string }> }) {
  const { term } = await params;
  const entry = getTerm(term);
  if (!entry) notFound();

  const related = (entry.related ?? [])
    .map((s) => getTerm(s))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <nav className="mb-6 text-sm">
        <Link href="/glossaire" className="text-flame hover:underline">
          ← Glossaire
        </Link>
      </nav>

      <header>
        <h1 className="display text-3xl text-ink-2 sm:text-4xl">{entry.term}</h1>
        {entry.aliases && entry.aliases.length > 0 ? (
          <p className="tech mt-2 text-[10px] text-muted">
            Aussi appelé : {entry.aliases.join(" · ")}
          </p>
        ) : null}
        <p className="mt-4 text-[18px] leading-relaxed text-ink-2">{entry.short}</p>
      </header>

      <div className="mt-8 space-y-4">
        {entry.body.map((p) => (
          <p key={p} className="text-[15.5px] leading-relaxed text-ink-2">
            {p}
          </p>
        ))}
      </div>

      {entry.reference ? (
        <p className="mt-8 border-l-2 border-secondary pl-4 text-[13.5px] leading-relaxed text-muted">
          <span className="tech text-[9px] text-accent">Référence</span>
          <br />
          {entry.reference}
        </p>
      ) : null}

      {related.length > 0 ? (
        <section className="mt-10">
          <h2 className="tech text-[10px] text-muted">Termes liés</h2>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/glossaire/${r.slug}`}
                  className="group block rounded-lg bg-surface p-4 ring-1 ring-line shadow-md transition hover:ring-flame"
                >
                  <span className="text-[15px] font-bold text-ink-2 group-hover:text-flame">
                    {r.term}
                  </span>
                  <p className="mt-1 text-[13px] leading-snug text-muted">{r.short}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10 rounded-xl bg-ink p-6">
        <h2 className="display text-xl text-white">Et concrètement, sur votre site ?</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-white/65">
          Comprendre les termes est une chose. Savoir ce que votre site fait réellement en est
          une autre — et c&apos;est mesurable en quelques secondes.
        </p>
        <Link
          href="/#scan"
          className="tech mt-5 inline-block rounded-full bg-flame shadow-md px-5 py-2.5 text-[11px] text-white transition hover:bg-flame-dark"
        >
          Auditer mon site
        </Link>
      </section>
    </div>
  );
}
