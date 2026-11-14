import Link from "next/link";
import type { Metadata } from "next";
import { INDEX_SIZE, groupResults, search } from "@/lib/search";

type Props = { searchParams: Promise<{ q?: string | string[] }> };

const MAX_QUERY = 100;

function readQuery(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().slice(0, MAX_QUERY);
}

const SUGGESTIONS = [
  "Google Analytics",
  "_ga",
  "Meta Pixel",
  "bandeau",
  "transfert hors UE",
  "consentement",
  "CNAME",
  "Hotjar",
];

const SECTIONS = [
  { href: "/regles", label: "Référentiel des règles" },
  { href: "/traceurs", label: "Base des traceurs" },
  { href: "/cookies", label: "Index des cookies" },
  { href: "/guides", label: "Guides" },
  { href: "/glossaire", label: "Glossaire" },
  { href: "/outils", label: "Outils gratuits" },
];

/**
 * Une page de résultats n'a pas vocation à être indexée : son contenu
 * reproduit celui des pages de détail. Seule la page nue, sans requête,
 * reste indexable.
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = readQuery((await searchParams).q);
  if (!q) {
    return {
      title: "Rechercher",
      description:
        "Recherchez parmi les règles, traceurs, cookies, guides et définitions du glossaire de Konsent.",
    };
  }
  return {
    title: `Recherche : ${q}`,
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = readQuery((await searchParams).q);
  const results = q ? search(q, 100) : [];
  const groups = groupResults(results);

  return (
    <>
      <section className="grid-bg-dark bg-ink">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <p className="tech text-[10px] text-flame-soft">Recherche</p>
          <h1 className="display mt-3 max-w-3xl text-3xl text-white sm:text-[2.8rem]">
            {q ? <>Résultats pour « {q} »</> : "Rechercher sur Konsent"}
          </h1>
          <form action="/recherche" method="get" role="search" className="mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <label htmlFor="recherche-q" className="sr-only">
              Rechercher une règle, un traceur, un cookie, un terme
            </label>
            <input
              id="recherche-q"
              type="search"
              name="q"
              defaultValue={q}
              maxLength={MAX_QUERY}
              placeholder="Ex. : _ga, Google Analytics, bandeau, CNAME…"
              className="min-h-12 flex-1 rounded-full border border-line bg-surface px-5 text-[15px] text-ink-2 placeholder:text-muted"
            />
            <button
              type="submit"
              className="font-display btn-primary min-h-12 rounded-full bg-flame px-6 text-sm font-bold text-on-primary"
            >
              Rechercher
            </button>
          </form>
          <p className="mt-3 text-[13px] text-white/65">
            {INDEX_SIZE} pages indexées : règles, traceurs, cookies, guides, glossaire et outils.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-12">
        {q ? (
          <p role="status" className="mb-8 text-[15px] text-muted">
            {results.length === 0
              ? `Aucun résultat pour « ${q} ».`
              : `${results.length}${results.length === 100 ? "+" : ""} résultat${results.length > 1 ? "s" : ""} pour « ${q} ».`}
          </p>
        ) : null}

        {groups.length > 0 ? (
          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.type} aria-labelledby={`groupe-${group.type}`}>
                <h2 id={`groupe-${group.type}`} className="font-display flex items-baseline gap-2 text-xl font-bold text-ink-2">
                  {group.label}
                  <span className="tech text-[11px] text-muted">
                    {group.results.length}
                    <span className="sr-only"> résultat{group.results.length > 1 ? "s" : ""}</span>
                  </span>
                </h2>
                <ul className="mt-4 grid gap-3">
                  {group.results.map((r) => (
                    <li key={r.url}>
                      <Link
                        href={r.url}
                        className="group block rounded-lg bg-surface p-5 shadow-md ring-1 ring-line transition hover:ring-flame"
                      >
                        <span className="text-[16px] font-bold leading-snug text-ink-2 group-hover:text-flame">
                          {r.title}
                        </span>
                        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{r.excerpt}</p>
                        <p className="tech mt-2 text-[9px] text-accent">{r.url}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-surface-low p-6 ring-1 ring-line sm:p-8">
            <h2 className="font-display text-lg font-bold text-ink-2">
              {q ? "Essayez autrement" : "Quelques pistes"}
            </h2>
            {q ? (
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                Vérifiez l&apos;orthographe, utilisez moins de mots, ou cherchez le nom exact
                d&apos;un cookie (« _fbp ») ou d&apos;un service (« Hotjar »).
              </p>
            ) : null}
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Recherches suggérées">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <Link
                    href={`/recherche?q=${encodeURIComponent(s)}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm text-ink-2 transition hover:border-flame hover:text-flame"
                  >
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="font-display mt-6 text-[15px] font-bold text-ink-2">Parcourir les rubriques</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-3">
              {SECTIONS.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="text-[14px] text-flame hover:underline">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
