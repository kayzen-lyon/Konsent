import { Breadcrumbs } from "@/components/Breadcrumbs";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Pill } from "@/components/primitives";
import { getRule } from "@/lib/rulepack";
import { ADEQUACY_LABELS, CATEGORY_LABELS } from "@/lib/trackers/db";
import { GUIDES, cookiesOfGuide, getGuide } from "@/lib/seo/guides";
import { lifetimeLabel } from "@/lib/seo/cookies";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "Guide introuvable" };
  return { title: guide.title, description: guide.metaDescription };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const { tracker } = guide;
  const cookies = cookiesOfGuide(guide);
  const rules = guide.relatedRules
    .map((id) => getRule(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <Breadcrumbs
        items={[
          { href: "/guides", label: "Guides" },
          { href: `/guides/${slug}`, label: guide.title },
        ]}
      />

      <header>
        <div className="flex flex-wrap items-center gap-2">
          {tracker.categories.slice(0, 3).map((c) => (
            <Pill key={c}>{CATEGORY_LABELS[c] ?? c}</Pill>
          ))}
          <Pill tone={tracker.adequacy === "EEA" ? "ok" : "danger"}>
            {tracker.effectiveJurisdiction}
          </Pill>
        </div>
        <h1 className="display mt-3 text-3xl text-ink-2 sm:text-4xl">{guide.title}</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-muted">{guide.metaDescription}</p>
      </header>

      <section className="mt-10">
        <h2 className="display text-xl text-ink-2">Pourquoi c&apos;est un écart</h2>
        {guide.why.map((p) => (
          <p key={p} className="mt-3 text-[15.5px] leading-relaxed text-ink-2">
            {p}
          </p>
        ))}
        <p className="mt-3 rounded-lg border-l-2 border-secondary bg-surface p-4 text-[14.5px] leading-relaxed text-ink-2 ring-1 ring-line shadow-md">
          Le point de droit est simple : l&apos;article 82 de la loi n° 78-17 subordonne le
          dépôt ou la lecture d&apos;informations dans le terminal de votre visiteur à son
          consentement préalable, sauf si l&apos;opération est strictement nécessaire au service
          qu&apos;il a demandé. Un service chargé dès l&apos;ouverture de la page, avant toute
          action, ne remplit pas cette condition.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="display text-xl text-ink-2">Comment corriger</h2>
        <ol className="mt-4 space-y-3">
          {guide.steps.map((s, i) => (
            <li key={s} className="flex gap-4">
              <span className="tech shrink-0 text-[10px] text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[15.5px] leading-relaxed text-ink-2">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      {guide.snippets.length > 0 ? (
        <section className="mt-10">
          <h2 className="display text-xl text-ink-2">Le code</h2>
          <div className="mt-4 space-y-6">
            {guide.snippets.map((s) => (
              <div key={s.label}>
                <p className="tech text-[10px] text-muted">{s.label}</p>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-[#0b1220] p-4 font-mono text-[12.5px] leading-relaxed text-white/85">
                  <code>{s.code}</code>
                </pre>
                {s.note ? (
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{s.note}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tracker.alternativesEu && tracker.alternativesEu.length > 0 ? (
        <section className="mt-10 rounded-xl border-l-2 border-ok bg-surface p-6 ring-1 ring-line shadow-md">
          <h2 className="display text-xl text-ink-2">Alternatives européennes</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            {tracker.alternativesEu.join(" · ")}
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            Remplacer le service supprime la question du transfert. Ce n&apos;est pas toujours
            possible ni souhaitable — mais quand ça l&apos;est, c&apos;est la correction la plus
            durable.
          </p>
        </section>
      ) : null}

      {cookies.length > 0 ? (
        <section className="mt-10">
          <h2 className="display text-xl text-ink-2">Les cookies concernés</h2>
          <div className="mt-4 overflow-x-auto rounded-xl bg-surface ring-1 ring-line shadow-md">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper">
                <tr>
                  {["Nom", "Finalité", "Durée"].map((h) => (
                    <th key={h} scope="col" className="tech px-4 py-2.5 text-[9px] text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {cookies.map((c) => (
                  <tr key={c.slug}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/cookies/${c.slug}`}
                        className="font-mono text-[13px] text-ink-2 hover:text-flame hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted">{c.purposeFr}</td>
                    <td className="px-4 py-3 text-[13px] text-muted">
                      {lifetimeLabel(c.maxLifetimeDays)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mt-10 rounded-xl bg-surface p-6 ring-1 ring-line shadow-md">
        <h2 className="tech text-[10px] text-muted">Qui reçoit les données</h2>
        <p className="mt-2 text-[16px] font-bold text-ink-2">{tracker.entity}</p>
        {tracker.ultimateParent && tracker.ultimateParent !== tracker.entity ? (
          <p className="mt-1 text-[13px] text-muted">
            Société mère ultime : {tracker.ultimateParent}
          </p>
        ) : null}
        <p className="mt-2 text-[13px] text-muted">{ADEQUACY_LABELS[tracker.adequacy]}</p>
        <Link
          href={`/traceurs/${tracker.slug}`}
          className="tech mt-4 inline-block rounded border border-line px-4 py-2 text-[10px] text-ink-2 transition hover:border-flame hover:text-flame"
        >
          Fiche complète
        </Link>
      </section>

      {rules.length > 0 ? (
        <section className="mt-10">
          <h2 className="tech text-[10px] text-muted">Règles du référentiel concernées</h2>
          <ul className="mt-3 space-y-2">
            {rules.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/regles/${r.id.toLowerCase()}`}
                  className="group flex gap-3 rounded-lg bg-surface p-3 ring-1 ring-line shadow-md transition hover:ring-flame"
                >
                  <span className="font-mono text-[11px] text-muted">{r.id}</span>
                  <span className="text-[13.5px] leading-snug text-ink-2 group-hover:text-flame">
                    {r.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10 rounded-xl bg-ink p-6">
        <h2 className="display text-xl text-white">
          {tracker.name} se charge-t-il avant consentement chez vous ?
        </h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-white/65">
          L&apos;audit vous répond en quelques secondes, avec la preuve : l&apos;URL exacte
          appelée, dans quel ordre, et par quel élément de votre page.
        </p>
        <Link
          href="/#scan"
          className="tech mt-5 inline-block rounded-full bg-flame shadow-md px-5 py-2.5 text-[11px] text-white transition hover:bg-flame-dark"
        >
          Vérifier gratuitement
        </Link>
      </section>

      <p className="mt-8 text-xs leading-relaxed text-muted">
        Ce guide est une information technique. Il ne constitue ni une consultation juridique ni
        une garantie de conformité : la configuration réelle de votre site et l&apos;usage
        effectif du service déterminent l&apos;analyse.
      </p>
    </div>
  );
}
