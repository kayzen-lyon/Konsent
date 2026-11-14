import { Breadcrumbs } from "@/components/Breadcrumbs";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Pill } from "@/components/primitives";
import { ADEQUACY_LABELS } from "@/lib/trackers/db";
import {
  COOKIES,
  exceedsRecommendedLifetime,
  getCookie,
  lifetimeLabel,
  vendorOf,
} from "@/lib/seo/cookies";
import { SeeAlso } from "@/components/SeeAlso";
import { relatedForCookie } from "@/lib/seo/related";

export function generateStaticParams() {
  return COOKIES.map((c) => ({ name: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const cookie = getCookie(name);
  if (!cookie) return { title: "Cookie introuvable" };

  return {
    title: `Cookie ${cookie.name} : à quoi sert-il ?`,
    description: `${cookie.name} est déposé par ${cookie.vendorName}. ${cookie.purposeFr} Durée : ${lifetimeLabel(cookie.maxLifetimeDays)}. ${cookie.requiresConsent ? "Son dépôt suppose un consentement préalable." : "Il relève d'une exemption de consentement."}`,
  };
}

export default async function CookiePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const cookie = getCookie(name);
  if (!cookie) notFound();

  const vendor = vendorOf(cookie);
  const tooLong = exceedsRecommendedLifetime(cookie);
  const siblings = COOKIES.filter(
    (c) => c.vendorSlug && c.vendorSlug === cookie.vendorSlug && c.slug !== cookie.slug,
  ).slice(0, 6);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <Breadcrumbs
        items={[
          { href: "/cookies", label: "Cookies" },
          { href: `/cookies/${name}`, label: cookie.name },
        ]}
      />

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={cookie.requiresConsent ? "danger" : "ok"}>
            {cookie.requiresConsent ? "Consentement requis" : "Exempté de consentement"}
          </Pill>
          {cookie.isIdentifier ? <Pill tone="warn">Identifiant unique</Pill> : null}
        </div>
        <h1 className="display mt-3 break-all font-mono text-3xl text-ink-2">{cookie.name}</h1>
        <p className="mt-2 text-[15px] text-muted">Déposé par {cookie.vendorName}</p>
      </header>

      <section className="mt-8">
        <h2 className="tech text-[10px] text-muted">À quoi il sert</h2>
        <p className="mt-2 text-[17px] leading-relaxed text-ink-2">{cookie.purposeFr}</p>
        {cookie.noteFr ? (
          <p className="mt-3 rounded-lg border-l-2 border-secondary bg-surface p-4 text-[14.5px] leading-relaxed text-ink-2 ring-1 ring-line shadow-md">
            {cookie.noteFr}
          </p>
        ) : null}
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-surface p-4 ring-1 ring-line shadow-md">
          <p className="tech text-[9px] text-muted">Durée de vie</p>
          <p className="mt-1 text-[15px] font-bold text-ink-2">
            {lifetimeLabel(cookie.maxLifetimeDays)}
          </p>
        </div>
        <div className="rounded-lg bg-surface p-4 ring-1 ring-line shadow-md">
          <p className="tech text-[9px] text-muted">Contient un identifiant</p>
          <p className="mt-1 text-[15px] font-bold text-ink-2">
            {cookie.isIdentifier ? "Oui" : "Non"}
          </p>
        </div>
        <div className="rounded-lg bg-surface p-4 ring-1 ring-line shadow-md">
          <p className="tech text-[9px] text-muted">Juridiction du destinataire</p>
          <p className="mt-1 text-[15px] font-bold text-ink-2">
            {vendor?.effectiveJurisdiction ?? "—"}
          </p>
        </div>
      </section>

      {tooLong ? (
        <section className="mt-6 rounded-lg border-l-2 border-warn bg-surface p-5 ring-1 ring-line shadow-md">
          <p className="tech text-[10px] text-warn">Point de vigilance</p>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
            Ce cookie dépasse les treize mois recommandés par la CNIL pour la durée de vie des
            traceurs. Cette durée ne vous appartient pas — elle est fixée par l&apos;éditeur —
            mais elle vous engage : c&apos;est vous qui répondez de ce qui se dépose sur votre
            site.
          </p>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="tech text-[10px] text-muted">Faut-il demander le consentement ?</h2>
        {cookie.requiresConsent ? (
          <div className="mt-2 space-y-3">
            <p className="text-[15px] leading-relaxed text-ink-2">
              <strong>Oui.</strong> Ce cookie n&apos;est pas strictement nécessaire au service
              demandé par votre visiteur. Son dépôt et sa lecture supposent donc un consentement
              préalable, libre, spécifique, éclairé et univoque, au sens de l&apos;article 82 de
              la loi n° 78-17 du 6 janvier 1978 modifiée.
            </p>
            <p className="text-[15px] leading-relaxed text-ink-2">
              Concrètement : il ne doit pas apparaître dans le navigateur de votre visiteur tant
              que celui-ci n&apos;a pas cliqué sur un bouton d&apos;acceptation. S&apos;il est
              présent au premier chargement de la page, c&apos;est un écart.
            </p>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            <p className="text-[15px] leading-relaxed text-ink-2">
              <strong>Non</strong>, sous réserve de sa configuration réelle. Ce cookie relève en
              principe de l&apos;exemption prévue par l&apos;article 82 : il est strictement
              nécessaire à la fourniture du service expressément demandé par l&apos;utilisateur,
              ou à la sécurité de celui-ci.
            </p>
            <p className="text-[15px] leading-relaxed text-ink-2">
              L&apos;exemption ne dispense pas d&apos;informer : ce cookie doit figurer dans
              votre politique de gestion des cookies, avec sa finalité et sa durée.
            </p>
          </div>
        )}
      </section>

      {vendor ? (
        <section className="mt-8 rounded-xl bg-surface p-6 ring-1 ring-line shadow-md">
          <h2 className="tech text-[10px] text-muted">Qui reçoit les données</h2>
          <p className="mt-2 text-[16px] font-bold text-ink-2">{vendor.entity}</p>
          {vendor.ultimateParent && vendor.ultimateParent !== vendor.entity ? (
            <p className="mt-1 text-[13px] text-muted">
              Société mère ultime : {vendor.ultimateParent}
            </p>
          ) : null}
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">{vendor.riskNotesFr}</p>
          <p className="mt-3 text-[13px] text-muted">{ADEQUACY_LABELS[vendor.adequacy]}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/traceurs/${vendor.slug}`}
              className="tech rounded border border-line px-4 py-2 text-[10px] text-ink-2 transition hover:border-flame hover:text-flame"
            >
              Fiche complète du service
            </Link>
            <Link
              href={`/guides/bloquer-${vendor.slug}`}
              className="tech rounded border border-line px-4 py-2 text-[10px] text-ink-2 transition hover:border-flame hover:text-flame"
            >
              Comment le bloquer avant consentement
            </Link>
          </div>
        </section>
      ) : null}

      {siblings.length > 0 ? (
        <section className="mt-8">
          <h2 className="tech text-[10px] text-muted">
            Autres cookies du même éditeur
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {siblings.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/cookies/${s.slug}`}
                  className="rounded border border-line px-3 py-1.5 font-mono text-[12px] text-muted transition hover:border-flame hover:text-flame"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SeeAlso
        links={relatedForCookie(cookie, [
          ...(vendor ? [`/traceurs/${vendor.slug}`, `/guides/bloquer-${vendor.slug}`] : []),
          ...siblings.map((s) => `/cookies/${s.slug}`),
        ])}
      />

      <section className="mt-10 rounded-xl bg-ink p-6">
        <h2 className="display text-xl text-white">
          Ce cookie est-il déposé avant consentement chez vous ?
        </h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-white/65">
          Savoir ce que fait un cookie ne dit pas à quel moment il apparaît sur votre site.
          C&apos;est précisément ce que l&apos;audit mesure.
        </p>
        <Link
          href="/#scan"
          className="tech mt-5 inline-block rounded-full bg-flame shadow-md px-5 py-2.5 text-[11px] text-white transition hover:bg-flame-dark"
        >
          Auditer mon site gratuitement
        </Link>
      </section>

      <p className="mt-8 text-xs leading-relaxed text-muted">
        Les durées indiquées sont celles observées ou documentées par l&apos;éditeur du service
        et peuvent évoluer sans préavis. Cette fiche est une information technique et ne
        constitue pas une consultation juridique.
      </p>
    </div>
  );
}
