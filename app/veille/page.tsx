import Link from "next/link";
import type { Metadata } from "next";
import { Disclaimer } from "@/components/primitives";
import { getRule } from "@/lib/rulepack";
import { STATUS_LABELS, WATCH_ENTRIES, type WatchStatus } from "@/lib/regwatch/entries";

export const metadata: Metadata = {
  title: "Veille réglementaire",
  description:
    "Ce qui est en vigueur, ce qui n'est qu'un projet, et ce que cela change pour chaque règle du référentiel. Sans confondre les deux.",
};

const STATUS_STYLES: Record<WatchStatus, string> = {
  IN_FORCE: "bg-ok text-white",
  CASE_LAW: "bg-ink text-white",
  PROPOSED: "bg-warn-bg text-warn",
  CONTESTED: "bg-flame text-white",
  WITHDRAWN: "bg-slate-200 text-slate-600",
};

export default function RegWatchPage() {
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
                  <article key={e.id} className="rounded-xl bg-surface p-6 ring-1 ring-line shadow-md">
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
