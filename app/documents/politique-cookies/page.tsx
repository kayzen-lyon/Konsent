import Link from "next/link";
import type { Metadata } from "next";
import { Disclaimer } from "@/components/primitives";
import { ScanError, runScan } from "@/lib/engine/scan";
import { generateCookiePolicy } from "@/lib/docs/politique-cookies";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Politique cookies générée",
  robots: { index: false, follow: false },
};

export default async function CookiePolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;

  if (!url) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-muted">
          Aucune adresse fournie.{" "}
          <Link href="/" className="text-flame hover:underline">
            Lancer une analyse
          </Link>
        </p>
      </div>
    );
  }

  let scan;
  try {
    scan = await runScan(url);
  } catch (error) {
    const message =
      error instanceof ScanError
        ? error.message
        : "L'analyse nécessaire à la génération n'a pas abouti.";
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-lg font-semibold text-amber-900">Génération impossible</h1>
          <p className="mt-2 text-[15px] text-amber-900">{message}</p>
        </div>
      </div>
    );
  }

  const doc = generateCookiePolicy(scan);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <nav className="mb-6 text-sm">
        <Link
          href={`/scan?url=${encodeURIComponent(url)}`}
          className="text-flame hover:underline"
        >
          ← Retour au rapport
        </Link>
      </nav>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-flame">
          Document généré · brouillon
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-2">{doc.title}</h1>
        <p className="mt-1.5 text-[15px] text-muted">{doc.subtitle}</p>
      </header>

      {doc.todos.length > 0 ? (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold text-amber-900">
            {doc.todos.length} information(s) que nous ne pouvons pas deviner
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-amber-900">
            Ces champs apparaissent en clair dans le document. Nous ne les remplissons jamais
            au jugé : un document qui invente est pire qu&apos;un document absent.
          </p>
          <ul className="mt-3 grid gap-1 sm:grid-cols-2">
            {doc.todos.map((t) => (
              <li key={t} className="text-[13px] text-amber-900">
                · {t}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <article className="mt-10 space-y-10">
        {doc.sections.map((s) => (
          <section key={s.id}>
            <h2 className="text-lg font-semibold tracking-tight text-ink-2">{s.heading}</h2>
            <div className="mt-3 space-y-3">
              {s.body.map((p, i) => (
                <p key={i} className="text-[15px] leading-relaxed text-ink-2">
                  {p.split(/(\[\[À COMPLÉTER[^\]]*\]\])/g).map((chunk, j) =>
                    chunk.startsWith("[[À COMPLÉTER") ? (
                      <mark
                        key={j}
                        className="rounded bg-amber-100 px-1 font-medium text-amber-900"
                      >
                        {chunk}
                      </mark>
                    ) : (
                      <span key={j}>{chunk}</span>
                    ),
                  )}
                </p>
              ))}
            </div>

            {s.table ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-paper text-xs uppercase text-muted">
                    <tr>
                      {s.table.columns.map((c) => (
                        <th key={c} scope="col" className="px-3 py-2 font-medium">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {s.table.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2.5 text-ink-2">
                            {cell}
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

      <footer className="mt-12 rounded-xl border border-line bg-white p-5">
        <p className="text-[13px] leading-relaxed text-muted">{doc.footer}</p>
      </footer>

      <div className="mt-8">
        <Disclaimer />
      </div>
    </div>
  );
}
