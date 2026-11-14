import { Suspense } from "react";
import type { Metadata } from "next";
import { ScoreGauge } from "@/components/ScoreGauge";
import { SeverityBadge } from "@/components/primitives";
import { JurisdictionChart } from "@/components/report/JurisdictionChart";
import { PillarIcon } from "@/components/report/PillarIcon";
import { PresentationDeck, type DeckSlide } from "@/components/report/PresentationDeck";
import { ErrorPanel, ScanSkeleton, runScanOrPanel } from "@/components/report/ScanStates";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { buildQuote, formatEur } from "@/lib/remediation/quote";
import { findingMinutes, formatDuration, totalMinutes, EFFORT_METHOD } from "@/lib/report/effort";
import { pillarScores } from "@/lib/report/pillars";
import { rankFindings } from "@/lib/report/priorities";
import { executiveSummary } from "@/lib/report/summary";
import { PILLARS, getRule, pillarOfFamily } from "@/lib/rulepack";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Présentation du rapport",
  robots: { index: false, follow: false },
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="tech text-[11px] text-accent">{children}</p>;
}

function Duration({ minutes }: { minutes: number }) {
  const d = formatDuration(minutes);
  return (
    <>
      <span aria-hidden="true">{d.short}</span>
      <span className="sr-only">{d.long}</span>
    </>
  );
}

async function Presentation({ target }: { target: string }) {
  const outcome = await runScanOrPanel(target);
  if (!outcome.ok) return outcome.panel;
  const { result } = outcome.verdict;

  const ranked = rankFindings(result.findings);
  const critical = result.findings.filter((f) => f.severity === "CRITICAL").length;
  const minutes = totalMinutes(result.findings, getRule);
  const quote = buildQuote(result);
  const scores = pillarScores(result.findings);
  const date = new Date(result.scannedAt).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });

  const slides: DeckSlide[] = [
    {
      title: "Couverture",
      content: (
        <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <Eyebrow>Rapport d&apos;audit Konsent</Eyebrow>
            <h1 className="display mt-3 break-all text-4xl text-ink-2 sm:text-6xl">{result.hostname}</h1>
            <p className="mt-5 text-lg text-muted">
              Analyse du <time dateTime={result.scannedAt}>{date}</time> ·{" "}
              {result.mode === "headless" ? "protocole en trois phases" : "analyse statique"}
            </p>
            <p className="mt-2 font-mono text-[13px] text-muted">réf. {result.id}</p>
          </div>
          <div className="scale-125 justify-self-center md:mr-6">
            <ScoreGauge score={result.score} grade={result.grade} gradeLabel={result.gradeLabel} />
          </div>
        </div>
      ),
    },
    {
      title: "Synthèse",
      content: (
        <div>
          <Eyebrow>Synthèse</Eyebrow>
          <h2 className="display mt-3 text-3xl text-ink-2 sm:text-5xl">L&apos;essentiel en trois phrases</h2>
          <div className="mt-8 max-w-4xl space-y-4 text-xl leading-relaxed text-ink-2">
            {executiveSummary(result).map((s, i) => (
              <p key={i}>{s}</p>
            ))}
          </div>
          <dl className="mt-10 grid gap-4 sm:grid-cols-4">
            {[
              ["Écarts relevés", String(result.findings.length)],
              ["Dont critiques", String(critical)],
              ["Destinataires hors EEE", `${result.outsideEea.length} / ${result.vendors.length}`],
              ["Temps de correction", formatDuration(minutes).short],
            ].map(([label, value]) => (
              <div key={label} className="rounded-3xl bg-surface p-5 ring-1 ring-line">
                <dt className="tech text-[10px] text-muted">{label}</dt>
                <dd className="font-display tabular mt-2 text-3xl font-bold text-ink-2">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ),
    },
    ...PILLARS.map((pillar): DeckSlide => {
      const list = ranked.filter((r) => pillarOfFamily(r.finding.family) === pillar.id);
      const score = scores.find((s) => s.id === pillar.id)?.score ?? 100;
      return {
        title: `Pilier ${pillar.index} · ${pillar.title}`,
        content: (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex min-w-0 items-start gap-4">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-surface-high text-accent">
                  <PillarIcon pillar={pillar.id} className="h-9 w-9" />
                </span>
                <div className="min-w-0">
                  <Eyebrow>Pilier {pillar.index}</Eyebrow>
                  <h2 className="display mt-2 text-3xl text-ink-2 sm:text-5xl">{pillar.title}</h2>
                  <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted">{pillar.description}</p>
                </div>
              </div>
              <p className="font-display tabular text-right text-5xl font-bold text-ink-2">
                {score}
                <span className="text-xl font-normal text-muted"> / 100</span>
              </p>
            </div>
            {list.length === 0 ? (
              <p className="mt-10 text-xl text-muted">Aucun écart relevé sur ce pilier par ce mode d&apos;analyse.</p>
            ) : (
              <ul className="mt-10 space-y-3">
                {list.slice(0, 6).map(({ finding, rule }) => (
                  <li
                    key={rule.id}
                    className="flex flex-wrap items-center gap-3 rounded-3xl bg-surface px-5 py-4 ring-1 ring-line"
                  >
                    <SeverityBadge severity={finding.severity} />
                    <span className="min-w-0 flex-1 text-lg font-semibold text-ink-2">{rule.title}</span>
                    <span className="tech text-[11px] text-muted">
                      <Duration minutes={findingMinutes(rule)} />
                    </span>
                  </li>
                ))}
                {list.length > 6 ? (
                  <li className="px-5 text-muted">… et {list.length - 6} autre(s) dans le rapport complet.</li>
                ) : null}
              </ul>
            )}
          </div>
        ),
      };
    }),
    {
      title: "Destinataires",
      content: (
        <div>
          <Eyebrow>Souveraineté</Eyebrow>
          <h2 className="display mt-3 text-3xl text-ink-2 sm:text-5xl">Qui reçoit les données</h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
            <JurisdictionChart vendors={result.vendors} compact />
            <div>
              <h3 className="font-display text-xl font-bold text-ink-2">
                Hors Espace économique européen ({result.outsideEea.length})
              </h3>
              {result.outsideEea.length === 0 ? (
                <p className="mt-3 text-lg text-muted">Aucun destinataire hors EEE identifié.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-lg text-ink-2">
                  {result.outsideEea.map((v) => (
                    <li key={v.slug}>
                      {v.name}{" "}
                      <span className="font-mono text-[13px] text-muted">({v.effectiveJurisdiction})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Plan d'action",
      content: (
        <div>
          <Eyebrow>Plan d&apos;action</Eyebrow>
          <h2 className="display mt-3 text-3xl text-ink-2 sm:text-5xl">Par où commencer</h2>
          {ranked.length === 0 ? (
            <p className="mt-8 text-xl text-muted">
              Aucun écart à corriger. Les règles non évaluées restent à vérifier.
            </p>
          ) : (
            <ol className="mt-8 space-y-3">
              {ranked.slice(0, 6).map(({ finding, rule }, i) => (
                <li key={rule.id} className="flex items-start gap-4 rounded-3xl bg-surface px-5 py-4 ring-1 ring-line">
                  <span className="font-display tabular text-2xl font-bold text-accent">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-ink-2">{rule.title}</p>
                    <p className="mt-1 text-[15px] leading-snug text-muted">{rule.remediation.steps[0]}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <SeverityBadge severity={finding.severity} />
                    <span className="tech text-[11px] text-muted">
                      <Duration minutes={findingMinutes(rule)} />
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-6 text-lg text-ink-2">
            Temps total estimé : <strong><Duration minutes={minutes} /></strong> · coût indicatif d&apos;une
            remise en conformité accompagnée :{" "}
            <strong>
              {formatEur(quote.totalLow)} – {formatEur(quote.totalHigh)}
            </strong>
            .
          </p>
          <p className="mt-3 max-w-4xl text-[13px] leading-relaxed text-muted">
            {EFFORT_METHOD} {DISCLAIMER_SHORT}
          </p>
        </div>
      ),
    },
  ];

  return (
    <PresentationDeck
      slides={slides}
      hostname={result.hostname}
      exitHref={`/scan?url=${encodeURIComponent(target)}`}
    />
  );
}

export default async function PresentationPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  if (!url) {
    return (
      <ErrorPanel
        title="Aucune adresse fournie"
        message="Indiquez l'adresse du site dont vous souhaitez présenter le rapport."
      />
    );
  }
  return (
    <Suspense key={url} fallback={<ScanSkeleton target={url} />}>
      <Presentation target={url} />
    </Suspense>
  );
}
