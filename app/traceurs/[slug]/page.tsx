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
        <Link href="/traceurs" className="text-accent hover:underline">
          ← Base des traceurs
        </Link>
      </nav>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          {t.categories.map((c) => (
            <Pill key={c}>{CATEGORY_LABELS[c] ?? c}</Pill>
          ))}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink-2">{t.name}</h1>
        <p className="mt-1.5 text-[15px] text-muted">{t.entity}</p>
      </header>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          À quoi cela sert
        </h2>
        <p className="mt-2 text-[17px] leading-relaxed text-ink-2">{t.purposeFr}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Ce que cela implique
        </h2>
        <p className="mt-2 text-[16px] leading-relaxed text-ink-2">{t.riskNotesFr}</p>
      </section>

      <section className="mt-8 rounded-xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Rattachement et juridiction
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">Entité contractante</dt>
            <dd className="text-[15px] font-medium text-ink-2">{t.entity}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Siège</dt>
            <dd className="text-[15px] font-medium text-ink-2">{t.hqJurisdiction}</dd>
          </div>
          {t.ultimateParent ? (
            <div>
              <dt className="text-xs text-muted">Société mère ultime</dt>
              <dd className="text-[15px] font-medium text-ink-2">{t.ultimateParent}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-muted">Juridiction effective</dt>
            <dd className="text-[15px] font-medium text-ink-2">{t.effectiveJurisdiction}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted">Statut au regard du chapitre V du RGPD</dt>
            <dd className="text-[15px] font-medium text-ink-2">{ADEQUACY_LABELS[t.adequacy]}</dd>
          </div>
          {t.dpf ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted">Data Privacy Framework</dt>
              <dd className="text-[15px] text-ink-2">
                {t.dpf.certified ? "Certification relevée" : "Aucune certification relevée"} —
                instantané du {new Date(t.dpf.checkedAt).toLocaleDateString("fr-FR")}. À
                reverifier sur la liste officielle avant toute conclusion.
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Consentement
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          {t.exemptEligible
            ? "Ce service peut, selon sa configuration et son usage réel, relever du strictement nécessaire ou d'une exemption. Cette appréciation est à confirmer au cas par cas."
            : "Le dépôt ou la lecture opérés par ce service supposent en principe un consentement préalable au sens de l'article 82 de la loi n° 78-17 modifiée."}
        </p>
      </section>

      {t.cookies && t.cookies.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Cookies connus
          </h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-paper text-xs uppercase text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Nom</th>
                  <th scope="col" className="px-4 py-2 font-medium">Finalité</th>
                  <th scope="col" className="px-4 py-2 font-medium">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {t.cookies.map((c) => (
                  <tr key={c.name}>
                    <td className="px-4 py-2.5 font-mono text-[13px] text-ink-2">{c.name}</td>
                    <td className="px-4 py-2.5 text-muted">{c.purposeFr}</td>
                    <td className="tabular px-4 py-2.5 text-muted">
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
        <section className="mt-8 rounded-xl border border-flame/30 bg-flame-bg p-5">
          <h2 className="text-sm font-semibold text-flame-dark">Alternatives européennes</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-flame-dark">
            {t.alternativesEu.join(" · ")}
          </p>
        </section>
      ) : null}

      <footer className="mt-10 border-t border-line pt-5 text-xs text-muted">
        <p>Sources : {t.sources.join(" · ")}</p>
        <p className="mt-1">
          Domaines rattachés : <span className="font-mono">{t.domains.join(", ")}</span>
        </p>
      </footer>
    </div>
  );
}
