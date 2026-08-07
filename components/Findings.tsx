import Link from "next/link";
import { FAMILY_LABELS, FAMILY_ORDER, SEVERITY_ORDER, getRule } from "@/lib/rulepack";
import type { Family, Finding } from "@/lib/rulepack/types";
import { SeverityBadge } from "./primitives";

function FindingItem({ finding }: { finding: Finding }) {
  const rule = getRule(finding.ruleId);
  if (!rule) return null;

  return (
    <article className="border-t border-k-line px-5 py-5 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={finding.severity} />
            <Link
              href={`/regles/${rule.id.toLowerCase()}`}
              className="font-mono text-xs text-k-muted underline decoration-dotted underline-offset-2 hover:text-k-primary"
            >
              {rule.id}
            </Link>
            {finding.occurrences > 1 ? (
              <span className="text-xs text-k-muted">
                {finding.occurrences} occurrences
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 text-[15px] font-semibold leading-snug text-k-ink">{rule.title}</h3>
        </div>
      </div>

      {/* Niveau de lecture « dirigeant » (§16, n°109). */}
      <p className="mt-2.5 text-[15px] leading-relaxed text-k-ink">{rule.messageExec}</p>

      {finding.evidence.length > 0 ? (
        <div className="mt-3 rounded-lg border border-k-line bg-k-surface p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-k-muted">
            Ce que nous avons observé
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {finding.evidence.slice(0, 6).map((e, i) => (
              <li key={i} className="text-[13px] leading-snug text-k-ink">
                <span className="font-medium">{e.label}</span>
                {e.detail ? <span className="text-k-muted"> — {e.detail}</span> : null}
                {e.url ? (
                  <span className="mt-0.5 block break-all font-mono text-[11px] text-k-muted">
                    {e.url.length > 130 ? `${e.url.slice(0, 130)}…` : e.url}
                  </span>
                ) : null}
              </li>
            ))}
            {finding.evidence.length > 6 ? (
              <li className="text-[13px] text-k-muted">
                … et {finding.evidence.length - 6} autre(s).
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <details className="group mt-3">
        <summary className="cursor-pointer list-none text-[13px] font-medium text-k-primary hover:underline">
          <span className="group-open:hidden">Référence et correctif ▾</span>
          <span className="hidden group-open:inline">Réduire ▴</span>
        </summary>
        <div className="mt-3 space-y-3 text-[13px] leading-relaxed">
          <div>
            <p className="font-semibold text-k-ink">Références</p>
            <ul className="mt-1 space-y-0.5 text-k-muted">
              {rule.references.map((r) => (
                <li key={r}>· {r}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-k-ink">Correctif</p>
            <ul className="mt-1 space-y-0.5 text-k-muted">
              {rule.remediation.steps.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-k-ink">Sous le projet « Digital Omnibus »</p>
            <p className="mt-1 text-k-muted">{rule.omnibusStatus}</p>
          </div>
          {rule.falsePositiveNotes ? (
            <div className="rounded-md bg-amber-50 p-2.5">
              <p className="font-semibold text-amber-900">Limite de la détection</p>
              <p className="mt-1 text-amber-900">{rule.falsePositiveNotes}</p>
            </div>
          ) : null}
        </div>
      </details>
    </article>
  );
}

export function FindingsByFamily({ findings }: { findings: readonly Finding[] }) {
  const grouped = new Map<Family, Finding[]>();
  for (const f of findings) {
    const list = grouped.get(f.family) ?? [];
    list.push(f);
    grouped.set(f.family, list);
  }

  const families = FAMILY_ORDER.filter((f) => grouped.has(f));

  if (families.length === 0) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6">
        <p className="font-semibold text-green-900">Aucun écart relevé par ce mode d&apos;analyse.</p>
        <p className="mt-1 text-sm text-green-800">
          Cela ne vaut pas certification : les règles nécessitant un navigateur restent à
          vérifier.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {families.map((family) => {
        const list = (grouped.get(family) ?? []).sort(
          (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
        );
        return (
          <div key={family} className="overflow-hidden rounded-xl border border-k-line bg-white">
            <header className="flex items-baseline justify-between gap-3 border-b border-k-line bg-k-surface px-5 py-3">
              <h3 className="text-sm font-semibold text-k-ink">{FAMILY_LABELS[family]}</h3>
              <span className="text-xs text-k-muted">
                {list.length} constat{list.length > 1 ? "s" : ""}
              </span>
            </header>
            <div>
              {list.map((f) => (
                <FindingItem key={f.ruleId} finding={f} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
