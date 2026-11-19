import type { Metadata } from "next";
import Link from "next/link";
import { EDITOR } from "@/lib/disclaimer";
import { RULEPACK } from "@/lib/rulepack";
import { TRACKERS } from "@/lib/trackers/db";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Konsent est un service KAYZEN, agence web lyonnaise. Pourquoi un auditeur indépendant de toute plateforme de consentement, et comment nous travaillons.",
};

const PRINCIPLES = [
  {
    title: "Indépendance",
    body: "Nous n'éditons ni ne revendons aucune plateforme de consentement. Un éditeur de bandeau qui audite les bandeaux est juge et partie ; nous ne le sommes pas.",
  },
  {
    title: "Transparence",
    body: `Les ${RULEPACK.total} règles du référentiel sont publiques, versionnées et sourcées. Chaque constat renvoie à son article, sa délibération et sa limite connue.`,
  },
  {
    title: "Exemplarité",
    body: "Ce site ne dépose aucun cookie, ne charge aucune ressource externe et tourne en Europe. Un outil qui reproche le chargement de Google Fonts ne peut pas en charger.",
  },
  {
    title: "Prudence",
    body: "Konsent constate des écarts, il ne qualifie pas d'infractions. Seuls la CNIL et le juge le peuvent ; le dire est la seule position honnête pour un outil automatisé.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      <p className="tech text-[11px] text-flame">À propos</p>
      <h1 className="hero-title mt-3 max-w-3xl text-ink-2">
        L&apos;audit RGPD conçu par une agence qui fait des sites.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
        Konsent est un service de {EDITOR.tradeName}, agence web et IA à Lyon qui accompagne
        les PME et les indépendants. Un bandeau cookies recueille le consentement ; il ne vérifie
        pas que le reste du site le respecte. Konsent a été conçu pour mesurer cet écart, de façon
        reproductible et sourcée.
      </p>

      <dl className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-line ring-1 ring-line sm:grid-cols-3">
        {[
          [String(RULEPACK.total), "règles publiques et sourcées"],
          [String(TRACKERS.length), "destinataires décrits en français"],
          ["0", "traceur déposé par ce site"],
        ].map(([value, label]) => (
          <div key={label} className="bg-surface px-6 py-5">
            <dt className="tech text-[10px] text-muted">{label}</dt>
            <dd className="display mt-1 text-4xl text-ink-2">{value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="display mt-16 text-3xl text-ink-2">Nos principes</h2>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2">
        {PRINCIPLES.map((p) => (
          <li key={p.title} className="card-lift rounded-3xl border border-line bg-surface p-7 shadow-md">
            <h3 className="text-lg font-bold text-ink-2">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
          </li>
        ))}
      </ul>

      <h2 className="display mt-16 text-3xl text-ink-2">L&apos;écosystème KAYZEN</h2>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
        Konsent partage son équipe, sa charte et ses exigences avec les autres services KAYZEN :
        Nexus pour l&apos;audit SEO et la visibilité dans les IA, DocuSûr pour les outils PDF.
      </p>
      <ul className="mt-6 flex flex-wrap gap-3">
        {[
          [`${EDITOR.groupSite}/?ref=konsent`, "Agence web KAYZEN"],
          ["https://nexus.kayzen-lyon.com/?ref=konsent", "Nexus"],
          ["https://docusur.kayzen-lyon.com/?ref=konsent", "DocuSûr"],
        ].map(([href, label]) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noopener"
              className="font-display inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink-2 transition-colors hover:border-flame hover:text-flame"
            >
              {label}
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-16 rounded-3xl bg-navy-deep p-8 text-white sm:p-10">
        <h2 className="display text-2xl sm:text-3xl">Une question, un partenariat, une démonstration ?</h2>
        <p className="mt-3 max-w-xl text-white/75">
          {EDITOR.tradeName}, {EDITOR.address}.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="font-display btn-primary inline-flex min-h-11 items-center rounded-full bg-flame px-6 text-sm font-bold text-on-primary"
          >
            Nous écrire
          </Link>
          <Link
            href="/presse"
            className="font-display inline-flex min-h-11 items-center rounded-full border border-white/30 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Espace presse
          </Link>
        </div>
      </div>
    </div>
  );
}
