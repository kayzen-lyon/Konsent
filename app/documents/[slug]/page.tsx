import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Disclaimer } from "@/components/primitives";
import { runVerdictScan } from "@/lib/engine/orchestrate";
import { ScanError } from "@/lib/engine/scan";
import { TEMPLATES, generateDocument, getTemplate, hasGenerator } from "@/lib/docs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const template = getTemplate(slug);
  return {
    title: template ? `${template.title} — brouillon généré` : "Document",
    robots: { index: false, follow: false },
  };
}

/** Met en évidence les champs que le générateur refuse d'inventer. */
function withTodos(text: string, key: string) {
  return text.split(/(\[\[À COMPLÉTER[^\]]*\]\])/g).map((chunk, i) =>
    chunk.startsWith("[[À COMPLÉTER") ? (
      <mark key={`${key}-${i}`} className="rounded bg-warn-bg px-1 font-medium text-warn">
        {chunk}
      </mark>
    ) : (
      <span key={`${key}-${i}`}>{chunk}</span>
    ),
  );
}

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ url?: string }>;
}) {
  const { slug } = await params;
  const { url } = await searchParams;

  const template = getTemplate(slug);
  if (!template || !hasGenerator(slug)) notFound();

  if (!url) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="display text-2xl text-ink-2">{template.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Ce document se génère à partir d&apos;une analyse de votre site. Indiquez
          l&apos;adresse à analyser.
        </p>
        <Link
          href="/documents"
          className="tech mt-6 inline-block rounded-full bg-flame shadow-md px-5 py-2.5 text-[11px] text-white transition hover:bg-flame-dark"
        >
          Retour aux documents
        </Link>
      </div>
    );
  }

  let scan;
  try {
    scan = (await runVerdictScan(url)).result;
  } catch (error) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-xl border-l-2 border-warn bg-surface p-6 ring-1 ring-line shadow-md">
          <h1 className="display text-xl text-ink-2">Génération impossible</h1>
          <p className="mt-2 text-[15px] text-muted">
            {error instanceof ScanError ? error.message : "L'analyse préalable n'a pas abouti."}
          </p>
        </div>
      </div>
    );
  }

  const doc = generateDocument(slug, scan);
  if (!doc) notFound();

  const others = TEMPLATES.filter((t) => t.slug !== slug && hasGenerator(t.slug));

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <nav className="mb-6 flex flex-wrap gap-4 text-sm print:hidden">
        <Link href={`/scan?url=${encodeURIComponent(url)}`} className="text-flame hover:underline">
          ← Rapport d&apos;audit
        </Link>
        <Link href={`/documents?url=${encodeURIComponent(url)}`} className="text-flame hover:underline">
          Tous les documents
        </Link>
      </nav>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span className="tech rounded bg-ink px-2 py-1 text-[9px] text-white">
            {doc.templateId}
          </span>
          <span className="tech text-[9px] text-accent">Brouillon</span>
          {template.fedByScan ? (
            <span className="tech text-[9px] text-muted">alimenté par le scan</span>
          ) : null}
        </div>
        <h1 className="display mt-3 text-3xl text-ink-2">{doc.title}</h1>
        <p className="mt-1.5 text-[15px] text-muted">{doc.subtitle}</p>
        <p className="tech mt-2 text-[9px] text-muted">{template.legalBasis}</p>
      </header>

      {doc.todos.length > 0 ? (
        <div className="mt-8 rounded-xl border-l-2 border-warn bg-surface p-5 ring-1 ring-line shadow-md">
          <p className="tech text-[10px] text-warn">
            {doc.todos.length} information(s) que nous ne pouvons pas deviner
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
            Ces champs apparaissent en surbrillance dans le document. Nous ne les remplissons
            jamais au jugé : un document qui invente est pire qu&apos;un document absent.
          </p>
          <ul className="mt-3 grid gap-1 sm:grid-cols-2">
            {doc.todos.map((t) => (
              <li key={t} className="text-[12.5px] text-muted">
                · {t}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <article className="mt-10 space-y-10">
        {doc.sections.map((s) => (
          <section key={s.id}>
            <h2 className="display text-xl text-ink-2">{s.heading}</h2>

            <div className="mt-3 space-y-3">
              {s.body.map((p, i) => (
                <p key={i} className="text-[15px] leading-relaxed text-ink-2">
                  {withTodos(p, `${s.id}-${i}`)}
                </p>
              ))}
            </div>

            {s.bullets && s.bullets.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {s.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-ink-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-flame" />
                    <span>{withTodos(b, `${s.id}-b-${i}`)}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {s.table ? (
              <div className="mt-4 overflow-x-auto rounded-xl bg-surface ring-1 ring-line shadow-md">
                <table className="w-full text-left text-sm">
                  <thead className="bg-paper">
                    <tr>
                      {s.table.columns.map((c) => (
                        <th key={c} scope="col" className="tech px-3 py-2.5 text-[9px] text-muted">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {s.table.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2.5 align-top text-[13px] text-ink-2">
                            {cell ? withTodos(cell, `${s.id}-t-${i}-${j}`) : "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {s.clauseRef ? (
              <p className="mt-3 border-l-2 border-line pl-3 text-xs text-muted">
                Fondement : {s.clauseRef}
              </p>
            ) : null}
          </section>
        ))}
      </article>

      <footer className="mt-12 rounded-xl bg-surface p-5 ring-1 ring-line shadow-md">
        <p className="text-[13px] leading-relaxed text-muted">{doc.footer}</p>
      </footer>

      <section className="mt-8 print:hidden">
        <p className="tech text-[10px] text-muted">Autres documents pour ce site</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {others.map((o) => (
            <Link
              key={o.slug}
              href={`/documents/${o.slug}?url=${encodeURIComponent(url)}`}
              className="tech rounded border border-line px-3 py-2 text-[10px] text-ink-2 transition hover:border-flame hover:text-flame"
            >
              {o.title}
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8">
        <Disclaimer />
      </div>
    </div>
  );
}
