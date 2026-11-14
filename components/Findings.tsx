import Link from "next/link";
import {
  FAMILY_LABELS,
  PILLARS,
  SEVERITY_ORDER,
  getRule,
  pillarOfFamily,
} from "@/lib/rulepack";
import type { Finding, Rule } from "@/lib/rulepack/types";
import {
  DEFAULT_READING_LEVEL,
  readingLevel,
  type ReadingLevel,
} from "@/lib/report/levels";
import { falsePositiveMailto, remediationText, type ReportContext } from "@/lib/report/links";
import {
  EFFORT_LABELS,
  EFFORT_METHOD,
  findingMinutes,
  formatDuration,
  totalMinutes,
} from "@/lib/report/effort";
import { RiskMeter, SeverityBadge } from "./primitives";
import { CopyFixButton } from "./report/CopyFixButton";
import { FindingGate, FindingsExplorer, PillarGate } from "./report/FindingsExplorer";
import { PillarIcon } from "./report/PillarIcon";

/** Intensité du pilier : 5 segments, pilotés par la gravité cumulée. */
function pillarIntensity(findings: readonly Finding[]): number {
  const weight = findings.reduce((sum, f) => {
    const w = { CRITICAL: 2, MAJOR: 1.2, MODERATE: 0.6, MINOR: 0.3, INFO: 0 }[f.severity];
    return sum + w;
  }, 0);
  return Math.max(0, Math.min(5, Math.round(weight)));
}

/** Badge « ≈ 30 min » : temps de correction estimé, lu en toutes lettres. */
function EffortBadge({ rule }: { rule: Rule }) {
  const d = formatDuration(findingMinutes(rule));
  return (
    <span
      className="tech inline-flex shrink-0 items-center rounded-full bg-surface-high px-2.5 py-1 text-[9px] text-ink-2"
      title={`Effort ${EFFORT_LABELS[rule.remediation.effort]} — estimation indicative`}
    >
      <span aria-hidden="true">{d.short}</span>
      <span className="sr-only">Temps de correction estimé : {d.long} (indicatif)</span>
    </span>
  );
}

/** Les fragments entre accents graves des correctifs sont du code : on les rend comme tel. */
function InlineCode({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded bg-surface-high px-1 font-mono text-[11px] text-ink-2">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

function FindingRow({
  finding,
  rule,
  level,
  report,
}: {
  finding: Finding;
  rule: Rule;
  level: ReadingLevel;
  report?: ReportContext;
}) {
  const priceHint = rule.remediation.priceHintEur;
  const spec = readingLevel(level);

  // La vue dirigeant n'affiche pas de colonne « Fondement » : la grille se
  // resserre plutôt que de laisser une colonne vide.
  const columns = spec.showNormative
    ? "lg:grid-cols-[1.6fr_auto_1fr_1.3fr]"
    : "lg:grid-cols-[2fr_auto_1.3fr]";

  return (
    <div
      className={`finding grid gap-4 border-t border-line px-5 py-5 lg:items-start lg:gap-6 ${columns}`}
    >
      {/* Critère */}
      <div className="finding-main min-w-0">
        <div className="finding-detail flex flex-wrap items-center gap-2">
          {/* L'identifiant de règle est un outil de travail : il sert à ouvrir
              un dossier ou à citer une source, pas à comprendre un écart. */}
          {spec.showNormative ? (
            <Link
              href={`/regles/${rule.id.toLowerCase()}`}
              className="font-mono text-[11px] text-muted underline decoration-dotted underline-offset-2 hover:text-flame"
            >
              {rule.id}
            </Link>
          ) : null}
          {finding.occurrences > 1 ? (
            <span className="tech text-[9px] text-muted">×{finding.occurrences}</span>
          ) : null}
          <span className="tech text-[9px] text-muted">{FAMILY_LABELS[rule.family]}</span>
        </div>
        <h4 className="finding-title mt-1.5 text-[15px] font-bold leading-snug text-ink-2">{rule.title}</h4>
        <p className="finding-detail mt-1.5 text-[13px] leading-relaxed text-muted">{rule.messageExec}</p>

        {spec.showTechnical ? (
          <p className="finding-detail mt-2 rounded border-l-2 border-line bg-paper px-3 py-2 text-[12px] leading-relaxed text-ink-2">
            {rule.messageTech}
          </p>
        ) : null}

        {spec.showRawEvidence && finding.evidence.length > 0 ? (
          /* Dépliée d'office à l'impression — un rapport papier dont la preuve
             reste repliée ne prouve rien. Le forçage est dans `globals.css` :
             l'état d'un <details> ne se pilote pas par une classe utilitaire. */
          <details className="finding-detail group mt-2.5">
            <summary className="tech cursor-pointer list-none text-[9px] text-flame hover:underline">
              <span className="group-open:hidden">Voir la preuve ▾</span>
              <span className="hidden group-open:inline">Réduire ▴</span>
            </summary>
            <ul className="mt-2 space-y-1.5 rounded border border-line bg-paper p-3">
              {finding.evidence.slice(0, 6).map((e, i) => (
                <li key={i} className="text-[12px] leading-snug text-ink-2">
                  <span className="font-medium">{e.label}</span>
                  {e.detail ? <span className="text-muted"> — {e.detail}</span> : null}
                  {e.url ? (
                    <span className="mt-0.5 block break-all font-mono text-[10px] text-muted">
                      {/* La vue développeur ne tronque pas : une URL coupée
                          n'est plus une preuve reproductible. */}
                      {spec.showTechnical || e.url.length <= 110
                        ? e.url
                        : `${e.url.slice(0, 110)}…`}
                    </span>
                  ) : null}
                </li>
              ))}
              {finding.evidence.length > 6 ? (
                <li className="text-[12px] text-muted">
                  … et {finding.evidence.length - 6} autre(s).
                </li>
              ) : null}
            </ul>
          </details>
        ) : null}

        {spec.showNormative && rule.falsePositiveNotes ? (
          <p className="finding-detail mt-2 text-[11px] leading-snug text-muted">
            <span className="tech text-[9px] text-warn">Limite connue</span>{" "}
            {rule.falsePositiveNotes}
          </p>
        ) : null}
      </div>

      {/* Statut */}
      <div className="flex flex-wrap items-center gap-1.5 lg:flex-col lg:items-start lg:pt-1">
        <SeverityBadge severity={finding.severity} />
        <EffortBadge rule={rule} />
      </div>

      {/* Référence normative */}
      {spec.showNormative ? (
        <div className="finding-detail lg:pt-1">
          <p className="tech text-[9px] text-muted">Référence</p>
          {/* Le DPO instruit un dossier : toutes les références, pas la première. */}
          <ul className="mt-1 space-y-0.5">
            {rule.references.map((ref) => (
              <li key={ref} className="text-[12px] leading-snug text-ink-2">
                {ref}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] leading-snug text-muted">
            <span className="tech text-[9px] text-muted">Digital Omnibus</span>{" "}
            {rule.omnibusStatus}
          </p>
        </div>
      ) : null}

      {/* Correctif */}
      <div className="finding-detail lg:pt-1">
        <p className="tech text-[9px] text-muted">Correctif</p>
        {spec.showTechnical ? (
          <ol className="mt-1 space-y-1">
            {rule.remediation.steps.map((step, i) => (
              <li key={i} className="text-[12px] leading-snug text-ink-2">
                <span className="tech mr-1 text-[9px] text-muted">{i + 1}.</span>
                <InlineCode text={step} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-1 text-[12px] leading-snug text-ink-2">
            <InlineCode text={rule.remediation.steps[0] ?? ""} />
          </p>
        )}
        {priceHint ? (
          <p className="tech mt-1.5 text-[9px] text-accent">
            {priceHint[0]} – {priceHint[1]} €
          </p>
        ) : (
          <p className="tech mt-1.5 text-[9px] text-ok">Correction autonome</p>
        )}
        {rule.remediation.steps.length > 0 ? (
          <CopyFixButton text={remediationText(rule.id, rule.title, rule.remediation.steps)} />
        ) : null}
        {report ? (
          <a
            href={falsePositiveMailto(rule.id, report)}
            className="mt-2 inline-block text-[11px] text-flame underline underline-offset-2 print:hidden"
          >
            Signaler un faux positif
            <span className="sr-only"> sur le constat {rule.id} (ouvre votre messagerie)</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}

/** Rapport structuré en quatre piliers, à la manière de la maquette. */
export function FindingsByPillar({
  findings,
  level = DEFAULT_READING_LEVEL,
  report,
}: {
  findings: readonly Finding[];
  level?: ReadingLevel;
  /** Contexte du rapport : active le lien « Signaler un faux positif ». */
  report?: ReportContext;
}) {
  if (findings.length === 0) {
    return (
      <div className="rounded-lg border-l-2 border-ok bg-surface p-6 ring-1 ring-line shadow-md">
        <p className="font-bold text-ink-2">Aucun écart relevé par ce mode d&apos;analyse.</p>
        <p className="mt-1.5 text-sm text-muted">
          Cela ne vaut pas certification : les règles nécessitant un navigateur restent à
          vérifier.
        </p>
      </div>
    );
  }

  // Index de recherche de l'explorateur : sérialisable, sans le référentiel.
  const explorerFindings = findings.flatMap((f) => {
    const rule = getRule(f.ruleId);
    if (!rule) return [];
    return [
      {
        ruleId: f.ruleId,
        severity: f.severity,
        pillar: pillarOfFamily(f.family),
        text: [
          rule.id,
          rule.title,
          rule.messageExec,
          rule.messageTech,
          FAMILY_LABELS[rule.family],
          ...rule.remediation.steps,
        ].join(" "),
      },
    ];
  });

  const total = formatDuration(totalMinutes(findings, getRule));

  return (
    <FindingsExplorer
      findings={explorerFindings}
      pillars={PILLARS.map((p) => ({ id: p.id, label: p.title }))}
    >
      <div className="mb-6 flex flex-wrap items-start gap-x-6 gap-y-2 rounded-3xl bg-surface p-5 ring-1 ring-line shadow-md">
        <p className="shrink-0">
          <span className="tech block text-[10px] text-muted">Temps de correction estimé, au total</span>
          <span className="font-display tabular mt-1 block text-2xl font-bold text-ink-2">
            <span aria-hidden="true">{total.short}</span>
            <span className="sr-only">{total.long}</span>
          </span>
        </p>
        <p className="min-w-0 max-w-2xl flex-1 text-[12px] leading-relaxed text-muted">
          {EFFORT_METHOD} Chaque constat porte sa propre estimation.
        </p>
      </div>
      <div className="space-y-6">
        {PILLARS.map((pillar) => {
          const list = findings
            .filter((f) => pillarOfFamily(f.family) === pillar.id)
            .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

          return (
            <PillarGate key={pillar.id} pillar={pillar.id}>
              <section className="overflow-hidden rounded-xl bg-surface ring-1 ring-line shadow-md">
                <header className="flex flex-wrap items-center justify-between gap-3 bg-ink px-5 py-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-flame-soft">
                      <PillarIcon pillar={pillar.id} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="display text-lg text-white">
                        <span className="text-flame-soft">Pilier {pillar.index}</span> · {pillar.title}
                      </h3>
                      <p className="mt-1 max-w-2xl text-[13px] leading-snug text-white/60">
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                  <RiskMeter level={pillarIntensity(list)} />
                </header>

                {list.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-muted">
                    Aucun écart relevé sur ce pilier par ce mode d&apos;analyse.
                  </p>
                ) : (
                  <>
                    <div
                      className={`finding-detail hidden gap-6 bg-paper px-5 py-2.5 lg:grid ${
                        readingLevel(level).showNormative
                          ? "grid-cols-[1.6fr_auto_1fr_1.3fr]"
                          : "grid-cols-[2fr_auto_1.3fr]"
                      }`}
                    >
                      {(readingLevel(level).showNormative
                        ? ["Critère d'audit", "Statut", "Fondement", "Solution préconisée"]
                        : ["Critère d'audit", "Statut", "Solution préconisée"]
                      ).map((h) => (
                        <span key={h} className="tech text-[9px] text-muted">
                          {h}
                        </span>
                      ))}
                    </div>
                    <div>
                      {list.map((f) => {
                        const rule = getRule(f.ruleId);
                        if (!rule) return null;
                        return (
                          <FindingGate key={f.ruleId} ruleId={f.ruleId}>
                            <FindingRow finding={f} rule={rule} level={level} report={report} />
                          </FindingGate>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>
            </PillarGate>
          );
        })}
      </div>
    </FindingsExplorer>
  );
}
