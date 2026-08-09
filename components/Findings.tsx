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
import { RiskMeter, SeverityBadge } from "./primitives";

/** Intensité du pilier : 5 segments, pilotés par la gravité cumulée. */
function pillarIntensity(findings: readonly Finding[]): number {
  const weight = findings.reduce((sum, f) => {
    const w = { CRITICAL: 2, MAJOR: 1.2, MODERATE: 0.6, MINOR: 0.3, INFO: 0 }[f.severity];
    return sum + w;
  }, 0);
  return Math.max(0, Math.min(5, Math.round(weight)));
}

function FindingRow({
  finding,
  rule,
  level,
}: {
  finding: Finding;
  rule: Rule;
  level: ReadingLevel;
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
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
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
        <h4 className="mt-1.5 text-[15px] font-bold leading-snug text-ink-2">{rule.title}</h4>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{rule.messageExec}</p>

        {spec.showTechnical ? (
          <p className="mt-2 rounded border-l-2 border-line bg-paper px-3 py-2 text-[12px] leading-relaxed text-ink-2">
            {rule.messageTech}
          </p>
        ) : null}

        {spec.showRawEvidence && finding.evidence.length > 0 ? (
          /* Dépliée d'office à l'impression — un rapport papier dont la preuve
             reste repliée ne prouve rien. Le forçage est dans `globals.css` :
             l'état d'un <details> ne se pilote pas par une classe utilitaire. */
          <details className="group mt-2.5">
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
          <p className="mt-2 text-[11px] leading-snug text-muted">
            <span className="tech text-[9px] text-warn">Limite connue</span>{" "}
            {rule.falsePositiveNotes}
          </p>
        ) : null}
      </div>

      {/* Statut */}
      <div className="lg:pt-1">
        <SeverityBadge severity={finding.severity} />
      </div>

      {/* Référence normative */}
      {spec.showNormative ? (
        <div className="lg:pt-1">
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
      <div className="lg:pt-1">
        <p className="tech text-[9px] text-muted">Correctif</p>
        {spec.showTechnical ? (
          <ol className="mt-1 space-y-1">
            {rule.remediation.steps.map((step, i) => (
              <li key={i} className="text-[12px] leading-snug text-ink-2">
                <span className="tech mr-1 text-[9px] text-muted">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-1 text-[12px] leading-snug text-ink-2">{rule.remediation.steps[0]}</p>
        )}
        {priceHint ? (
          <p className="tech mt-1.5 text-[9px] text-flame">
            {priceHint[0]} – {priceHint[1]} €
          </p>
        ) : (
          <p className="tech mt-1.5 text-[9px] text-ok">Correction autonome</p>
        )}
      </div>
    </div>
  );
}

/** Rapport structuré en quatre piliers, à la manière de la maquette. */
export function FindingsByPillar({
  findings,
  level = DEFAULT_READING_LEVEL,
}: {
  findings: readonly Finding[];
  level?: ReadingLevel;
}) {
  if (findings.length === 0) {
    return (
      <div className="rounded-lg border-l-2 border-ok bg-white p-6 ring-1 ring-line">
        <p className="font-bold text-ink-2">Aucun écart relevé par ce mode d&apos;analyse.</p>
        <p className="mt-1.5 text-sm text-muted">
          Cela ne vaut pas certification : les règles nécessitant un navigateur restent à
          vérifier.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {PILLARS.map((pillar) => {
        const list = findings
          .filter((f) => pillarOfFamily(f.family) === pillar.id)
          .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

        return (
          <section key={pillar.id} className="overflow-hidden rounded-xl bg-white ring-1 ring-line">
            <header className="flex flex-wrap items-center justify-between gap-3 bg-ink px-5 py-4">
              <div className="min-w-0">
                <h3 className="display text-lg text-white">
                  <span className="text-flame">Pilier {pillar.index}</span> · {pillar.title}
                </h3>
                <p className="mt-1 max-w-2xl text-[13px] leading-snug text-white/60">
                  {pillar.description}
                </p>
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
                  className={`hidden gap-6 bg-paper px-5 py-2.5 lg:grid ${
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
                    return <FindingRow key={f.ruleId} finding={f} rule={rule} level={level} />;
                  })}
                </div>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
