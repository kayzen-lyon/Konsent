import type { Severity } from "@/lib/rulepack/types";
import { SEVERITY_LABELS } from "@/lib/rulepack/labels";
import { DISCLAIMER_LONG, DISCLAIMER_SHORT } from "@/lib/disclaimer";

export function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      {eyebrow ? <p className="tech text-[10px] text-accent">{eyebrow}</p> : null}
      <h2 className="display mt-2 text-2xl text-ink-2 sm:text-3xl">{title}</h2>
      {description ? (
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted">{description}</p>
      ) : null}
    </div>
  );
}

const SEVERITY_STYLES: Record<Severity, string> = {
  CRITICAL: "bg-crit text-white",
  MAJOR: "bg-secondary text-white",
  MODERATE: "bg-warn-bg text-warn",
  MINOR: "bg-surface-high text-ink-2",
  INFO: "bg-ok-bg text-ok",
};

/** Badge de statut, dans l'esprit « ÉCHEC CRITIQUE / PARTIEL » de la maquette. */
export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`tech inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[9px] ${SEVERITY_STYLES[severity]}`}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "danger" | "warn" | "ok" | "flame";
}) {
  const tones = {
    neutral: "bg-surface-high text-ink-2",
    danger: "bg-crit-bg text-crit-text",
    warn: "bg-warn-bg text-warn",
    ok: "bg-ok-bg text-ok",
    flame: "bg-flame-bg text-flame-deep",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Barre d'intensité du risque, reprise de la maquette (5 segments). */
export function RiskMeter({ level, max = 5 }: { level: number; max?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="tech text-[9px] text-white/60">Intensité</span>
      <span className="flex gap-1" role="img" aria-label={`Intensité du risque : ${level} sur ${max}`}>
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={`h-2.5 w-4 rounded-[2px] ${i < level ? "bg-crit" : "bg-white/20"}`}
          />
        ))}
      </span>
    </span>
  );
}

export function Disclaimer({ variant = "long" }: { variant?: "long" | "short" }) {
  if (variant === "short") {
    return (
      <p className="text-xs leading-relaxed text-muted">
        <span className="font-semibold text-ink-2">Avertissement. </span>
        {DISCLAIMER_SHORT}
      </p>
    );
  }
  return (
    <aside className="rounded-lg border-l-2 border-ink-2 bg-surface p-5 ring-1 ring-line shadow-md">
      <p className="tech text-[10px] text-muted">Avertissement</p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">{DISCLAIMER_LONG}</p>
    </aside>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "danger" | "ok" | "warn";
}) {
  const valueTone = {
    danger: "text-crit",
    ok: "text-ok",
    warn: "text-warn",
    neutral: "text-ink-2",
  }[tone];

  return (
    <div className="rounded-lg bg-surface p-4 ring-1 ring-line shadow-md">
      <p className="tech text-[9px] text-muted">{label}</p>
      <p className={`tabular display mt-1.5 text-3xl ${valueTone}`}>{value}</p>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-muted">{hint}</p> : null}
    </div>
  );
}
