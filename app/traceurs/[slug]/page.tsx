import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Pill } from "@/components/primitives";
import { ADEQUACY_LABELS, CATEGORY_LABELS, TRACKERS, getTrackerBySlug } from "@/lib/trackers/db";

export function generateStaticParams() {
  return TRACKERS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = getTrackerBySlug(slug);
  if (!t) return { title: "Traceur introuvable" };
  return {
    title: `${t.name} — que fait ce traceur ?`,
    description: t.purposeFr,
  };
}

export default async function TrackerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getTrackerBySlug(slug);
  if (!t) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <nav className="mb-6 text-sm">
        <Link href="/traceurs" className="text-k-primary hover:underline">
          ← Base des traceurs
        </Link>
      </nav>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          {t.categories.map((c) => (
            <Pill key={c}>{CATEGORY_LABELS[c] ?? c}</Pill>
          ))}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-k-ink">{t.name}</h1>
        <p className="mt-1.5 text-[15px] text-k-muted">{t.entity}</p>
      </header>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-k-muted">
          À quoi cela sert
        </h2>
        <p className="mt-2 text-[17px] leading-relaxed text-k-ink">{t.purposeFr}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-k-muted">
          Ce que cela implique
        </h2>
        <p className="mt-2 text-[16px] leading-relaxed text-k-ink">{t.riskNotesFr}</p>
      </section>

      <section className="mt-8 rounded-xl border border-k-line bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-k-muted">
          Rattachement et juridiction
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-k-muted">Entité contractante</dt>
            <dd className="text-[15px] font-medium text-k-ink">{t.entity}</dd>
          </div>
          <div>
            <dt className="text-xs text-k-muted">Siège</dt>
            <dd className="text-[15px] font-medium text-k-ink">{t.hqJurisdiction}</dd>
          </div>
          {t.ultimateParent ? (
            <div>
              <dt className="text-xs text-k-muted">Société mère ultime</dt>
              <dd className="text-[15px] font-medium text-k-ink">{t.ultimateParent}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-k-muted">Juridiction effective</dt>
            <dd className="text-[15px] font-medium text-k-ink">{t.effectiveJurisdiction}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-k-muted">Statut au regard du chapitre V du RGPD</dt>
            <dd className="text-[15px] font-medium text-k-ink">{ADEQUACY_LABELS[t.adequacy]}</dd>
          </div>
          {t.dpf ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-k-muted">Data Privacy Framework</dt>
              <dd className="text-[15px] text-k-ink">
                {t.dpf.certified ? "Certification relevée" : "Aucune certification relevée"} —
                instantané du {new Date(t.dpf.checkedAt).toLocaleDateString("fr-FR")}. À
                reverifier sur la liste officielle avant toute conclusion.
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-k-muted">
          Consentement
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-k-ink">
          {t.exemptEligible
            ? "Ce service peut, selon sa configuration et son usage réel, relever du strictement nécessaire ou d'une exemption. Cette appréciation est à confirmer au cas par cas."
            : "Le dépôt ou la lecture opérés par ce service supposent en principe un consentement préalable au sens de l'article 82 de la loi n° 78-17 modifiée."}
        </p>
      </section>

      {t.cookies && t.cookies.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-k-muted">
            Cookies connus
          </h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-k-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-k-line bg-k-surface text-xs uppercase text-k-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Nom</th>
                  <th scope="col" className="px-4 py-2 font-medium">Finalité</th>
                  <th scope="col" className="px-4 py-2 font-medium">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-k-line">
                {t.cookies.map((c) => (
                  <tr key={c.name}>
                    <td className="px-4 py-2.5 font-mono text-[13px] text-k-ink">{c.name}</td>
                    <td className="px-4 py-2.5 text-k-muted">{c.purposeFr}</td>
                    <td className="tabular px-4 py-2.5 text-k-muted">
                      {c.maxLifetimeDays === null ? "session" : `${c.maxLifetimeDays} j`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {t.alternativesEu && t.alternativesEu.length > 0 ? (
        <section className="mt-8 rounded-xl border border-teal-200 bg-teal-50 p-5">
          <h2 className="text-sm font-semibold text-teal-900">Alternatives européennes</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-teal-900">
            {t.alternativesEu.join(" · ")}
          </p>
        </section>
      ) : null}

      <footer className="mt-10 border-t border-k-line pt-5 text-xs text-k-muted">
        <p>Sources : {t.sources.join(" · ")}</p>
        <p className="mt-1">
          Domaines rattachés : <span className="font-mono">{t.domains.join(", ")}</span>
        </p>
      </footer>
    </div>
  );
}
