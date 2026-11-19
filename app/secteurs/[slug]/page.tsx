import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Faq } from "@/components/Faq";
import { getRule } from "@/lib/rulepack";
import { CATEGORY_LABELS, getTrackerBySlug } from "@/lib/trackers/db";
import { faqPageJsonLd } from "@/lib/seo/jsonld";
import { SECTORS, getSector } from "@/lib/seo/sectors";

export function generateStaticParams() {
  return SECTORS.map((s) => ({ slug: s.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sector = getSector(slug);
  if (!sector) return { title: "Secteur introuvable" };
  return { title: sector.title, description: sector.metaDescription };
}

export default async function SectorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sector = getSector(slug);
  if (!sector) notFound();

  // Seuls les traceurs et règles réellement présents dans la base sont liés.
  const trackers = sector.trackers
    .map((s) => getTrackerBySlug(s))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const rules = sector.rules
    .map((id) => getRule(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <Breadcrumbs
        items={[
          { href: "/secteurs", label: "Secteurs" },
          { href: `/secteurs/${sector.slug}`, label: sector.name },
        ]}
        jsonLd={[faqPageJsonLd(sector.faq)]}
      />

      <header>
        <p className="tech text-[10px] text-flame">Secteur · {sector.name}</p>
        <h1 className="display mt-3 text-3xl text-ink-2 sm:text-4xl">{sector.title}</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">{sector.lead}</p>
      </header>

      <section className="mt-10" aria-labelledby="enjeux">
        <h2 id="enjeux" className="display text-xl text-ink-2">
          Les enjeux propres au secteur
        </h2>
        <ul className="mt-4 space-y-3">
          {sector.stakes.map((s) => (
            <li key={s} className="flex gap-3 text-[15.5px] leading-relaxed text-ink-2">
              <span
                className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-flame"
                aria-hidden="true"
              />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="obligations">
        <h2 id="obligations" className="display text-xl text-ink-2">
          Obligations particulières
        </h2>
        <div className="mt-4 space-y-4">
          {sector.obligations.map((o) => (
            <article key={o.title} className="rounded-3xl border border-line bg-surface p-6 shadow-md">
              <h3 className="display text-lg text-ink-2">{o.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{o.body}</p>
              <p className="tech mt-4 text-[9px] text-muted">Références</p>
              <ul className="mt-1.5 space-y-1">
                {o.references.map((r) => (
                  <li key={r} className="text-[13px] leading-snug text-muted">
                    {r}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {trackers.length > 0 ? (
        <section className="mt-10" aria-labelledby="traceurs">
          <h2 id="traceurs" className="display text-xl text-ink-2">
            Traceurs fréquents dans ce secteur
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Leur présence ne constitue pas un écart en soi : c&apos;est le moment de leur
            chargement, et ce qu&apos;ils transmettent, qui comptent.
          </p>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {trackers.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/traceurs/${t.slug}`}
                  className="card-lift group flex h-full flex-col rounded-3xl border border-line bg-surface p-4 shadow-md"
                >
                  <span className="text-[15px] font-bold text-ink-2 group-hover:text-flame">
                    {t.name}
                  </span>
                  <span className="mt-1 text-[12.5px] text-muted">
                    {t.categories
                      .map((c) => CATEGORY_LABELS[c] ?? c)
                      .slice(0, 2)
                      .join(" · ")}
                    {" · "}
                    {t.effectiveJurisdiction}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rules.length > 0 ? (
        <section className="mt-10" aria-labelledby="regles">
          <h2 id="regles" className="display text-xl text-ink-2">
            Les règles du référentiel à surveiller
          </h2>
          <ul className="mt-4 space-y-2">
            {rules.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/regles/${r.id.toLowerCase()}`}
                  className="group flex gap-3 rounded-3xl border border-line bg-surface px-4 py-3 shadow-md transition hover:border-flame"
                >
                  <span className="shrink-0 font-mono text-[11px] leading-6 text-muted">
                    {r.id}
                  </span>
                  <span className="text-[14px] leading-6 text-ink-2 group-hover:text-flame">
                    {r.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10" aria-labelledby="faq">
        <h2 id="faq" className="display mb-4 text-xl text-ink-2">
          Questions fréquentes
        </h2>
        <Faq items={sector.faq} />
      </section>

      <section className="mt-10 rounded-3xl bg-ink p-6 sm:p-8">
        <h2 className="display text-xl text-white">Et sur votre site, concrètement ?</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-white/65">
          L&apos;audit observe ce qui se charge avant tout choix, après un refus et après une
          acceptation, et rattache chaque constat à sa règle. Gratuit, sans inscription.
        </p>
        <Link
          href="/#scan"
          className="tech mt-5 inline-block rounded-full bg-flame px-5 py-2.5 text-[11px] text-white shadow-md transition hover:bg-flame-dark"
        >
          Auditer mon site
        </Link>
      </section>

      <p className="mt-8 text-xs leading-relaxed text-muted">
        Cette fiche est une information générale sur le secteur. Elle ne constitue ni une
        consultation juridique ni une garantie de conformité : la situation réelle de votre
        organisme, les données effectivement traitées et la configuration de vos services
        déterminent l&apos;analyse. Les références citées sont à vérifier dans leur version en
        vigueur.
      </p>
    </div>
  );
}
