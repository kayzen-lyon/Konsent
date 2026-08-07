import { computeExposure, formatEur } from "@/lib/risk/exposure";
import type { Finding } from "@/lib/rulepack/types";

/**
 * Encadré d'exposition théorique (§8.3).
 *
 * Garde-fou appliqué sans exception (§3.2, point 2) : le plafond légal
 * n'apparaît JAMAIS seul. Il est systématiquement présenté avec la
 * fourchette réellement observée en procédure simplifiée et avec le coût de
 * mise en conformité. C'est l'écart entre ces trois chiffres qui informe —
 * il n'a besoin d'aucune exagération.
 */
export function ExposureBox({
  findings,
  revenueEur,
}: {
  findings: readonly Finding[];
  revenueEur?: number;
}) {
  const e = computeExposure({ findings, ...(revenueEur ? { revenueEur } : {}) });

  const rows = [
    {
      label: "Plafond légal théorique",
      value: formatEur(e.gdprCeilingEur),
      hint: e.gdprCeilingFromRevenue
        ? "4 % du chiffre d'affaires annuel mondial — article 83(5) du RGPD"
        : "Plancher de 20 M€ prévu par l'article 83(5) du RGPD, à défaut de chiffre d'affaires connu",
      tone: "danger" as const,
    },
    {
      label: "Fourchette observée en procédure simplifiée",
      value: `${formatEur(e.observedRange.low)} – ${formatEur(e.observedRange.high)}`,
      hint: "Le plafond de la procédure simplifiée est fixé à 20 000 € par décision (art. 22-1 de la loi n° 78-17)",
      tone: "warn" as const,
    },
    {
      label: "Coût estimé de mise en conformité",
      value: `${formatEur(e.remediationEstimateEur.low)} – ${formatEur(e.remediationEstimateEur.high)}`,
      hint: `Estimation indicative, fondée sur ${e.criticalCount} constat(s) critique(s) et ${e.majorCount} majeur(s)`,
      tone: "ok" as const,
    },
  ];

  const toneClass = {
    danger: "text-crit",
    warn: "text-warn",
    ok: "text-ok",
  } as const;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="border-b border-line bg-paper px-5 py-3">
        <h3 className="text-sm font-semibold text-ink-2">Mise en perspective financière</h3>
      </div>

      <dl className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-4">
            <div className="min-w-0 flex-1">
              <dt className="text-[14px] font-medium text-ink-2">{r.label}</dt>
              <p className="mt-0.5 text-xs leading-snug text-muted">{r.hint}</p>
            </div>
            <dd className={`tabular shrink-0 text-lg font-semibold ${toneClass[r.tone]}`}>
              {r.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-line bg-paper px-5 py-3">
        <p className="text-xs leading-relaxed text-muted">{e.caveat}</p>
      </div>
    </div>
  );
}
