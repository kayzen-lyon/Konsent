import Link from "next/link";
import type { Metadata } from "next";
import { Disclaimer } from "@/components/primitives";
import { NewsletterForm } from "@/components/veille/NewsletterForm";
import { newsletterAvailable } from "@/lib/newsletter";
import { getRule } from "@/lib/rulepack";
import { STATUS_LABELS, WATCH_ENTRIES, type WatchStatus } from "@/lib/regwatch/entries";

export const metadata: Metadata = {
  title: "Veille réglementaire",
  description:
    "Ce qui est en vigueur, ce qui n'est qu'un projet, et ce que cela change pour chaque règle du référentiel. Sans confondre les deux.",
  // Remplace l'objet `alternates` du gabarit : la canonique est donc redonnée.
  alternates: {
    canonical: "./",
    types: {
      "application/rss+xml": [{ url: "/veille/rss.xml", title: "Veille réglementaire Konsent (RSS)" }],
      "application/feed+json": [
        { url: "/veille/feed.json", title: "Veille réglementaire Konsent (JSON Feed)" },
      ],
    },
  },
};

const STATUS_STYLES: Record<WatchStatus, string> = {
  IN_FORCE: "bg-ok text-white",
  CASE_LAW: "bg-ink text-white",
  PROPOSED: "bg-warn-bg text-warn",
  CONTESTED: "bg-flame text-white",
  WITHDRAWN: "bg-slate-200 text-slate-600",
};

/** Retour des liens de confirmation et de désabonnement. */
const SUBSCRIPTION_NOTICES: Record<string, string> = {
  confirme: "Inscription confirmée. Vous recevrez la lettre le 1er de chaque mois où la veille a évolué.",
  retire: "Désabonnement effectué : votre adresse a été effacée.",
  invalide:
    "Ce lien n'est plus valable : il a déjà servi, ou l'inscription n'a pas été confirmée sous sept jours.",
};

export default async function RegWatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const state = (await searchParams)["abonnement"];
  const notice = typeof state === "string" ? (SUBSCRIPTION_NOTICES[state] ?? null) : null;
  const newsletterOpen = newsletterAvailable();

  const inForce = WATCH_ENTRIES.filter(
    (e) => e.status === "IN_FORCE" || e.status === "CASE_LAW",
  );
  const pending = WATCH_ENTRIES.filter(
    (e) => e.status === "PROPOSED" || e.status === "CONTESTED",
  );
  const withdrawn = WATCH_ENTRIES.filter((e) => e.status === "WITHDRAWN");

  const groups = [
    {
      key: "vigueur",
      title: "Applicable aujourd'hui",
      lead: "Ce sur quoi un contrôle se fonderait s'il avait lieu demain.",
      entries: inForce,
    },
    {
      key: "projet",
      title: "En discussion",
      lead: "Ce qui n'est pas adopté et ne doit fonder aucune décision de conformité.",
      entries: pending,
    },
    {
      key: "retire",
      title: "Sans objet",
      lead: "Textes retirés, encore invoqués dans certains argumentaires commerciaux.",
      entries: withdrawn,
    },
  ];

  return (
    <>
      <section className="grid-bg-dark bg-ink">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <p className="tech text-[10px] text-flame-soft">Veille réglementaire</p>
          <h1 className="display mt-3 max-w-3xl text-3xl text-white sm:text-[2.8rem]">
            Ce qui s&apos;applique, ce qui se discute, et ce qui n&apos;existe plus
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/65">
            Le marché entretient la confusion entre le droit en vigueur et les projets de
            réforme, parce que l&apos;incertitude fait vendre. Chaque entrée ci-dessous porte son
            statut, sa source et les règles du référentiel qu&apos;elle impacte.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {[
              [inForce.length, "textes applicables"],
              [pending.length, "projets non adoptés"],
              [withdrawn.length, "textes retirés"],
            ].map(([n, l]) => (
              <div key={String(l)} className="rounded-lg bg-white/10 px-4 py-2.5">
                <span className="tabular display text-xl text-white">{n}</span>
                <span className="tech ml-2 text-[9px] text-white/60">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-14">
        {groups.map((group) =>
          group.entries.length === 0 ? null : (
            <section key={group.key} className="mb-14">
              <h2 className="display text-2xl text-ink-2">{group.title}</h2>
              <p className="mt-1.5 text-[15px] text-muted">{group.lead}</p>

              <div className="mt-6 space-y-4">
                {group.entries.map((e) => (
                  <article key={e.id} id={e.id} className="scroll-mt-28 rounded-xl bg-surface p-6 ring-1 ring-line shadow-md">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`tech rounded px-2 py-1 text-[9px] ${STATUS_STYLES[e.status]}`}
                          >
                            {STATUS_LABELS[e.status]}
                          </span>
                          <span className="tech text-[9px] text-muted">
                            {new Date(e.date).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                          </span>
                        </div>
                        <h3 className="display mt-2.5 text-lg leading-snug text-ink-2">
                          {e.title}
                        </h3>
                      </div>
                      {e.horizon ? (
                        <span className="tech shrink-0 rounded bg-paper px-2.5 py-1.5 text-[9px] text-muted">
                          {e.horizon}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">{e.summary}</p>

                    <div className="mt-4 rounded-lg bg-paper p-4">
                      <p className="tech text-[9px] text-muted">Ce que cela change</p>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{e.impact}</p>
                    </div>

                    <div className="mt-3 border-l-2 border-secondary pl-4">
                      <p className="tech text-[9px] text-accent">Recommandation</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{e.action}</p>
                    </div>

                    {e.rules.length > 0 ? (
                      <div className="mt-4">
                        <p className="tech text-[9px] text-muted">
                          Règles du référentiel concernées
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {e.rules.map((id) => {
                            const rule = getRule(id);
                            return (
                              <Link
                                key={id}
                                href={`/regles/${id.toLowerCase()}`}
                                title={rule?.title ?? id}
                                className="rounded border border-line px-2 py-1 font-mono text-[10px] text-muted transition hover:border-flame hover:text-flame"
                              >
                                {id}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <p className="mt-4 border-t border-line pt-3 text-[12px] text-muted">
                      Source :{" "}
                      <a
                        href={e.sourceUrl}
                        className="text-flame hover:underline"
                        rel="noopener noreferrer nofollow"
                        target="_blank"
                      >
                        {e.source}
                      </a>
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ),
        )}

        <section id="lettre" className="mb-6 scroll-mt-28 rounded-xl bg-ink p-6">
          <p className="tech text-[10px] text-flame-soft">Lettre mensuelle</p>
          <h2 className="display mt-2 text-xl text-white">Recevoir la veille par e-mail</h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-white/70">
            Le 1er du mois, en texte brut, les entrées ajoutées le mois précédent — et rien les
            mois où rien n&apos;a changé. Ni pixel de suivi, ni lien traqué. Inscription
            confirmée par e-mail (double opt-in) ; une adresse non confirmée est effacée sous
            sept jours.
          </p>
          {notice ? (
            <p role="status" className="mt-4 rounded-lg bg-white/10 px-4 py-3 text-[14px] text-white">
              {notice}
            </p>
          ) : null}
          {newsletterOpen ? (
            <NewsletterForm />
          ) : (
            <p className="mt-4 rounded-lg bg-white/10 px-4 py-3 text-[14px] leading-relaxed text-white/80">
              La lettre ouvrira dès que l&apos;envoi d&apos;e-mails sera activé. D&apos;ici là, nous
              ne collectons aucune adresse que nous ne pourrions pas confirmer : les flux{" "}
              <a href="/veille/rss.xml" className="text-flame-soft underline">
                RSS
              </a>{" "}
              et{" "}
              <a href="/veille/feed.json" className="text-flame-soft underline">
                JSON Feed
              </a>{" "}
              restent disponibles.
            </p>
          )}
          <p className="mt-3 text-[12px] leading-relaxed text-white/50">
            Détails dans la{" "}
            <Link href="/confidentialite#lettre-veille" className="underline">
              politique de confidentialité
            </Link>
            .
          </p>
        </section>

        <section className="rounded-xl bg-ink p-6">
          <p className="tech text-[10px] text-flame-soft">Méthode</p>
          <h2 className="display mt-2 text-xl text-white">Comment cette veille est tenue</h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-white/70">
            Revue hebdomadaire des publications de la CNIL, du Comité européen de la protection
            des données, d&apos;EUR-Lex et de la jurisprudence de la Cour de justice. Chaque
            entrée est rattachée aux règles qu&apos;elle impacte, ce qui permet de savoir
            immédiatement si une évolution vous concerne — ou non.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-white/50">
            Sur un abonnement Pro, une alerte est envoyée lorsqu&apos;une évolution touche une
            règle effectivement déclenchée sur vos domaines. Le reste du temps, vous
            n&apos;entendez pas parler de nous : c&apos;est le principe.
          </p>
        </section>

        <div className="mt-10">
          <Disclaimer />
        </div>
      </div>
    </>
  );
}
