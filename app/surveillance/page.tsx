import Link from "next/link";
import type { Metadata } from "next";
import { BaselineInput } from "@/components/BaselineInput";
import { MonitorSignup } from "@/components/MonitorSignup";
import { getStorage } from "@/lib/storage";
import { Disclaimer, SeverityBadge } from "@/components/primitives";
import { ScanError, runScan } from "@/lib/engine/scan";
import { decodeBaseline } from "@/lib/monitoring/baseline";
import { alertSummary, diffAgainstBaseline } from "@/lib/monitoring/diff";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Surveillance et régressions",
  description:
    "Comparez l'état actuel de votre site à une analyse de référence : nouveaux traceurs, changements de juridiction, pages légales disparues.",
};

const KIND_ICONS: Record<string, string> = {
  finding_new: "▲",
  finding_worse: "▲",
  vendor_new: "▲",
  jurisdiction_new: "▲",
  legal_page_gone: "▲",
  score_drop: "▼",
  finding_gone: "✓",
  finding_better: "✓",
  vendor_gone: "✓",
  legal_page_new: "✓",
  score_rise: "▲",
  rulepack_changed: "·",
};

async function DiffReport({ url, token }: { url: string; token: string }) {
  const baseline = decodeBaseline(token);

  if (!baseline) {
    return (
      <div className="rounded-xl border-l-2 border-warn bg-white p-6 ring-1 ring-line">
        <h2 className="display text-xl text-ink-2">Référence illisible</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Ce jeton de référence est invalide ou a été modifié. Reprenez celui affiché en bas
          d&apos;un rapport d&apos;audit, sans le tronquer.
        </p>
      </div>
    );
  }

  let current;
  try {
    current = await runScan(url);
  } catch (error) {
    return (
      <div className="rounded-xl border-l-2 border-warn bg-white p-6 ring-1 ring-line">
        <h2 className="display text-xl text-ink-2">Nouvelle analyse impossible</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          {error instanceof ScanError ? error.message : "L'analyse n'a pas abouti."}
        </p>
      </div>
    );
  }

  if (baseline.h !== current.hostname) {
    return (
      <div className="rounded-xl border-l-2 border-warn bg-white p-6 ring-1 ring-line">
        <h2 className="display text-xl text-ink-2">Comparaison refusée</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          La référence porte sur <strong>{baseline.h}</strong> et l&apos;analyse demandée sur{" "}
          <strong>{current.hostname}</strong>. Comparer deux sites différents n&apos;aurait
          aucun sens.
        </p>
      </div>
    );
  }

  const diff = diffAgainstBaseline(baseline, current);
  const alert = alertSummary(diff);

  return (
    <div className="space-y-6">
      {/* Synthèse */}
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-line">
        {diff.regressions > 0 ? <div className="hazard-top h-1.5" /> : null}
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="tech text-[10px] text-flame">Comparaison</p>
              <h2 className="display mt-1.5 text-2xl text-ink-2">{diff.hostname}</h2>
              <p className="mt-1 font-mono text-[12px] text-muted">
                du {new Date(diff.from).toLocaleString("fr-FR", { dateStyle: "long" })} au{" "}
                {new Date(diff.to).toLocaleString("fr-FR", { dateStyle: "long" })}
              </p>
            </div>
            <div className="text-right">
              <p className="tech text-[9px] text-muted">Score</p>
              <p className="tabular display text-3xl text-ink-2">
                {diff.scoreBefore} → {diff.scoreAfter}
              </p>
              <p
                className={`tabular tech text-[10px] ${
                  diff.scoreDelta < 0 ? "text-crit" : diff.scoreDelta > 0 ? "text-ok" : "text-muted"
                }`}
              >
                {diff.scoreDelta > 0 ? "+" : ""}
                {diff.scoreDelta} points
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-paper p-4">
              <p className="tech text-[9px] text-muted">Régressions</p>
              <p className={`tabular display mt-1 text-2xl ${diff.regressions > 0 ? "text-crit" : "text-ok"}`}>
                {diff.regressions}
              </p>
            </div>
            <div className="rounded-lg bg-paper p-4">
              <p className="tech text-[9px] text-muted">Améliorations</p>
              <p className="tabular display mt-1 text-2xl text-ok">{diff.improvements}</p>
            </div>
            <div className="rounded-lg bg-paper p-4">
              <p className="tech text-[9px] text-muted">Changements</p>
              <p className="tabular display mt-1 text-2xl text-ink-2">{diff.changes.length}</p>
            </div>
          </div>

          {diff.heterogeneous ? (
            <p className="mt-4 rounded-lg border-l-2 border-warn bg-warn-bg px-4 py-3 text-[13px] leading-relaxed text-warn">
              Les deux analyses n&apos;utilisent pas la même version du référentiel. Certains
              écarts peuvent provenir d&apos;une évolution des règles plutôt que du site.
            </p>
          ) : null}
        </div>
      </div>

      {/* Alerte prête à l'envoi */}
      {alert ? (
        <div className="rounded-xl bg-ink p-6">
          <p className="tech text-[10px] text-flame">Message d&apos;alerte</p>
          <p className="mt-2 text-[15px] leading-relaxed text-white">{alert}</p>
          <p className="mt-3 text-[12px] text-white/45">
            C&apos;est le message que la surveillance automatique enverrait par courriel, Slack
            ou webhook sur un abonnement Pro.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border-l-2 border-ok bg-white p-6 ring-1 ring-line">
          <p className="font-bold text-ink-2">Aucune régression détectée.</p>
          <p className="mt-1 text-sm text-muted">
            L&apos;état du site n&apos;a pas empiré depuis l&apos;analyse de référence.
          </p>
        </div>
      )}

      {/* Détail */}
      {diff.changes.length > 0 ? (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-line">
          <header className="bg-paper px-5 py-3">
            <h3 className="tech text-[10px] text-muted">Détail des changements</h3>
          </header>
          <ul className="divide-y divide-line">
            {diff.changes.map((c, i) => (
              <li key={i} className="flex gap-4 px-5 py-4">
                <span
                  className={`shrink-0 text-lg leading-none ${
                    c.regression ? "text-crit" : "text-ok"
                  }`}
                  aria-hidden="true"
                >
                  {KIND_ICONS[c.kind] ?? "·"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-bold text-ink-2">{c.title}</p>
                    {c.severity ? <SeverityBadge severity={c.severity} /> : null}
                  </div>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="text-center">
        <Link
          href={`/scan?url=${encodeURIComponent(url)}`}
          className="tech inline-block rounded border border-ink/20 px-6 py-3 text-[11px] text-ink-2 transition hover:border-flame hover:text-flame"
        >
          Voir le rapport complet actuel
        </Link>
      </div>
    </div>
  );
}

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; ref?: string }>;
}) {
  const { url, ref } = await searchParams;

  return (
    <>
      <section className="grid-bg-dark bg-ink">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <p className="tech text-[10px] text-flame">Surveillance</p>
          <h1 className="display mt-3 max-w-3xl text-3xl text-white sm:text-[2.8rem]">
            Être conforme un jour ne sert à rien si personne ne regarde le lendemain
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/65">
            Le vrai risque n&apos;est pas l&apos;écart que vous connaissez : c&apos;est le pixel
            qu&apos;un prestataire ajoutera dans trois mois sans vous prévenir. Comparez
            l&apos;état actuel de votre site à une analyse de référence.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-5 py-14">
        {url && ref ? (
          <DiffReport url={url} token={ref} />
        ) : (
          <>
            {getStorage().available ? (
              <>
                <MonitorSignup />

                <div className="my-10 flex items-center gap-4">
                  <span className="h-px flex-1 bg-line" />
                  <span className="tech text-[9px] text-muted">ou, sans rien conserver</span>
                  <span className="h-px flex-1 bg-line" />
                </div>
              </>
            ) : null}

            <BaselineInput initialUrl={url ?? ""} />

            <section className="mt-12 rounded-xl bg-white p-6 ring-1 ring-line">
              <h2 className="display text-xl text-ink-2">Où trouver une référence</h2>
              <ol className="mt-4 space-y-3">
                {[
                  "Lancez un audit sur votre site.",
                  "En bas du rapport, copiez le jeton de référence.",
                  "Revenez ici plus tard avec ce jeton : nous relançons l'analyse et affichons uniquement ce qui a changé.",
                ].map((s, i) => (
                  <li key={s} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
                    <span className="tech shrink-0 text-[10px] text-flame">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
              <p className="mt-5 rounded-lg bg-paper p-4 text-[13px] leading-relaxed text-muted">
                <strong className="text-ink-2">Pourquoi un jeton et pas un compte ?</strong> Notre
                politique de confidentialité annonce que nous ne conservons aucun résultat
                d&apos;analyse. Nous nous y tenons : la référence reste chez vous. Sur un
                abonnement Pro, la surveillance est planifiée et l&apos;historique conservé — avec
                votre accord explicite et un contrat de sous-traitance.
              </p>
            </section>
          </>
        )}

        <div className="mt-12">
          <Disclaimer variant="short" />
        </div>
      </div>
    </>
  );
}
