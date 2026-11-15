import { Suspense } from "react";
import type { Metadata } from "next";
import { PrintReportButton } from "@/components/PrintReportButton";
import { ScoreGauge } from "@/components/ScoreGauge";
import { SeverityBadge } from "@/components/primitives";
import { ReportQr } from "@/components/report/ReportQr";
import { ErrorPanel, ScanSkeleton, runScanOrPanel } from "@/components/report/ScanStates";
import { DISCLAIMER_SHORT, EDITOR } from "@/lib/disclaimer";
import { buildQuote } from "@/lib/remediation/quote";
import { computeExposure, formatEur } from "@/lib/risk/exposure";
import { EFFORT_METHOD, findingMinutes, formatDuration, totalMinutes } from "@/lib/report/effort";
import { ADEQUACY_SHORT, countryName } from "@/lib/report/jurisdictions";
import { rankFindings } from "@/lib/report/priorities";
import { executiveSummary } from "@/lib/report/summary";
import { getRule } from "@/lib/rulepack";
import { siteOrigin } from "@/lib/security/origin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Synthèse dirigeant",
  robots: { index: false, follow: false },
};

/**
 * Feuille d'impression propre à cette page : une seule page A4, rien
 * d'autre que la synthèse (ni en-tête ni pied de site). Locale plutôt que
 * dans `globals.css` : elle ne concerne que cette vue.
 */
const PAGE_CSS = `
@media screen {
  .synthese-a4 { max-width: 210mm; }
}
@media print {
  @page { size: A4 portrait; margin: 10mm 12mm; }
  /* Seul le contenu principal s'imprime : ni en-tête, ni pied, ni liens
     d'évitement. \`display: none\` plutôt que \`visibility\` : un élément
     invisible occupe encore sa place et pousserait la synthèse en page 2. */
  body > *:not(main) { display: none !important; }
  .synthese-wrap { max-width: none !important; padding: 0 !important; }
  .synthese-a4 { max-width: none; margin: 0; padding: 0 !important; box-shadow: none !important; border: 0 !important; font-size: 10pt; }
  .synthese-a4, .synthese-a4 section { break-inside: auto; }
  .synthese-a4 h1 { font-size: 18pt; }
  .synthese-a4 h2 { font-size: 11pt; }
  .synthese-a4 .synthese-block { padding: 3mm 4mm !important; }
  .synthese-a4 svg.h-40 { width: 28mm; height: 28mm; }
  .synthese-a4 a[href^="http"]::after { content: none; }
  .synthese-screen-only { display: none !important; }
  /* Thème sombre : le navigateur n'imprime pas les fonds par défaut, un
     texte clair finirait blanc sur blanc. La feuille repasse donc sur les
     valeurs des jetons du thème clair (globals.css, :root). */
  .synthese-a4 {
    --color-ink-2: #1f2937; --color-muted: #586474; --color-accent: #1f3b61;
    --color-surface: #ffffff; --color-surface-low: #f2f5f7; --color-surface-high: #eaedef;
    --color-line: #e0e5eb; --color-crit-text: #b91c1c; --color-warn: #a16207; --color-ok: #1a6b52;
    --color-crit: #dc2626; --color-ok-bg: #a6f3d5; --color-warn-bg: #fef9c3; --color-secondary: #1f3b61;
    color-scheme: light;
  }
}
`;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="synthese-block rounded-3xl bg-surface-low p-4 ring-1 ring-line">
      <h2 className="tech text-[10px] text-accent">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

async function Synthese({ target }: { target: string }) {
  const outcome = await runScanOrPanel(target);
  if (!outcome.ok) return outcome.panel;
  const { result } = outcome.verdict;

  const top = rankFindings(result.findings).slice(0, 3);
  const exposure = computeExposure({ findings: result.findings });
  const quote = buildQuote(result);
  const minutes = formatDuration(totalMinutes(result.findings, getRule));
  const [scoreSentence] = executiveSummary(result);
  const date = new Date(result.scannedAt).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });
  const enc = encodeURIComponent(target);
  const devisUrl = `${EDITOR.productSite}/devis?url=${enc}`;

  return (
    <div className="synthese-wrap mx-auto max-w-5xl px-5 py-8">
      <style>{PAGE_CSS}</style>
      <div className="synthese-screen-only mb-5 flex flex-wrap items-center justify-between gap-3">
        <a
          href={`/scan?url=${enc}`}
          className="font-display inline-flex min-h-10 items-center rounded-full px-3 text-[13px] font-semibold text-flame underline underline-offset-2"
        >
          ← Revenir au rapport complet
        </a>
        <PrintReportButton />
      </div>

      <article className="synthese-a4 mx-auto space-y-3 rounded-3xl bg-surface p-6 ring-1 ring-line shadow-md">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-3">
          <div className="min-w-0">
            <p className="tech text-[10px] text-accent">Synthèse dirigeant · une page</p>
            <h1 className="display mt-1 break-all text-2xl text-ink-2">{result.hostname}</h1>
            <p className="mt-1 text-[13px] text-muted">
              Analyse du <time dateTime={result.scannedAt}>{date}</time> · réf.{" "}
              <span className="font-mono">{result.id}</span>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <p className="text-right text-[11px] text-muted">
              Konsent
              <br />
              {EDITOR.productSite.replace(/^https:\/\//, "")}
            </p>
            <ReportQr url={`${siteOrigin()}/scan?url=${enc}`} className="text-ink-2" />
          </div>
        </header>

        <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr]">
          <ScoreGauge score={result.score} grade={result.grade} gradeLabel={result.gradeLabel} />
          <p className="text-[14px] leading-relaxed text-ink-2">{scoreSentence}</p>
        </div>

        <Block title="Trois constats à traiter en priorité">
          {top.length === 0 ? (
            <p className="text-[13px] text-muted">Aucun écart relevé par ce mode d&apos;analyse.</p>
          ) : (
            <ol className="space-y-2">
              {top.map(({ finding, rule }, i) => {
                const d = formatDuration(findingMinutes(rule));
                return (
                  <li key={rule.id} className="flex items-start gap-3">
                    <span className="font-display tabular text-lg font-bold text-accent">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold leading-snug text-ink-2">{rule.title}</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-muted">{rule.messageExec}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <SeverityBadge severity={finding.severity} />
                      <span className="tech text-[9px] text-muted">
                        <span aria-hidden="true">{d.short}</span>
                        <span className="sr-only">{d.long}</span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Block>

        <div className="grid gap-3 sm:grid-cols-2">
          <Block title="Exposition théorique">
            <dl className="space-y-1.5 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-2">Plafond légal (art. 83(5) RGPD)</dt>
                <dd className="tabular font-semibold text-crit-text">{formatEur(exposure.gdprCeilingEur)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-2">Fourchette observée, procédure simplifiée</dt>
                <dd className="tabular font-semibold text-warn">
                  {formatEur(exposure.observedRange.low)} – {formatEur(exposure.observedRange.high)}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] leading-snug text-muted">
              {exposure.caveat} Le coût de correction figure ci-contre.
            </p>
          </Block>

          <Block title="Coût et temps de correction">
            <p className="font-display tabular text-xl font-bold text-ok">
              {formatEur(quote.totalLow)} – {formatEur(quote.totalHigh)}
            </p>
            <p className="text-[13px] text-ink-2">
              Temps estimé : <strong>{minutes.long}</strong>
            </p>
            <p className="mt-1 text-[11px] leading-snug text-muted">
              Devis indicatif calculé à partir des constats (pile : {quote.stackLabel}). {EFFORT_METHOD}
            </p>
          </Block>
        </div>

        <Block title={`Destinataires hors EEE (${result.outsideEea.length} sur ${result.vendors.length})`}>
          {result.outsideEea.length === 0 ? (
            <p className="text-[13px] text-muted">Aucun destinataire hors Espace économique européen identifié.</p>
          ) : (
            <ul className="grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-2">
              {result.outsideEea.map((v) => (
                <li key={v.slug} className="text-ink-2">
                  <strong>{v.name}</strong>{" "}
                  <span className="text-muted">
                    — {countryName(v.effectiveJurisdiction)}, {ADEQUACY_SHORT[v.adequacy].toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Prochaine étape">
          <p className="text-[13px] leading-relaxed text-ink-2">
            {top[0] ? (
              <>
                Confier à votre prestataire la correction de « <strong>{top[0].rule.title}</strong> »,
                puis relancer l&apos;analyse pour constater l&apos;effet.{" "}
              </>
            ) : (
              <>Faire vérifier les règles non évaluées par ce mode d&apos;analyse. </>
            )}
            Devis détaillé : <span className="break-all font-mono text-[11px]">{devisUrl}</span> · contact :{" "}
            {EDITOR.email}
          </p>
        </Block>

        <p className="border-t border-line pt-2 text-[10px] leading-snug text-muted">{DISCLAIMER_SHORT}</p>
      </article>
    </div>
  );
}

export default async function SynthesePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  if (!url) {
    return (
      <ErrorPanel
        title="Aucune adresse fournie"
        message="Indiquez l'adresse du site dont vous souhaitez la synthèse."
      />
    );
  }
  return (
    <Suspense key={url} fallback={<ScanSkeleton target={url} />}>
      <Synthese target={url} />
    </Suspense>
  );
}
