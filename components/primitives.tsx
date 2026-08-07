import type { Severity } from "@/lib/rulepack/types";
import { SEVERITY_LABELS } from "@/lib/rulepack";
import { DISCLAIMER_LONG, DISCLAIMER_SHORT } from "@/lib/disclaimer";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-k-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] ${className}`}
    >
      {children}
    </section>
  );
}

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
    <div className="mb-5">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-k-primary">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-k-ink sm:text-2xl">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-k-muted">{description}</p>
      ) : null}
    </div>
  );
}

const SEVERITY_STYLES: Record<Severity, string> = {
  CRITICAL: "bg-red-50 text-red-800 ring-red-200",
  MAJOR: "bg-orange-50 text-orange-800 ring-orange-200",
  MODERATE: "bg-amber-50 text-amber-800 ring-amber-200",
  MINOR: "bg-slate-100 text-slate-700 ring-slate-200",
  INFO: "bg-teal-50 text-teal-800 ring-teal-200",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${SEVERITY_STYLES[severity]}`}
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
  tone?: "neutral" | "danger" | "warn" | "ok" | "primary";
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    danger: "bg-red-50 text-red-800",
    warn: "bg-amber-50 text-amber-800",
    ok: "bg-green-50 text-green-800",
    primary: "bg-teal-50 text-teal-800",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

/**
 * Avertissement canonique (§3.3). Présent sur l'écran de résultat et sur
 * chaque document. Sa formulation n'est pas paraphrasée.
 */
export function Disclaimer({ variant = "long" }: { variant?: "long" | "short" }) {
  if (variant === "short") {
    return (
      <p className="text-xs leading-relaxed text-k-muted">
        <span className="font-semibold text-k-ink">Avertissement. </span>
        {DISCLAIMER_SHORT}
      </p>
    );
  }
  return (
    <aside className="rounded-xl border border-k-line bg-white/70 p-5">
      <p className="text-[13px] leading-relaxed text-k-muted">
        <span className="font-semibold text-k-ink">Avertissement. </span>
        {DISCLAIMER_LONG}
      </p>
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
  tone?: "neutral" | "danger" | "ok";
}) {
  const valueTone =
    tone === "danger" ? "text-k-danger" : tone === "ok" ? "text-k-ok" : "text-k-ink";
  return (
    <div className="rounded-lg border border-k-line bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-k-muted">{label}</p>
      <p className={`tabular mt-1.5 text-2xl font-semibold ${valueTone}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs leading-snug text-k-muted">{hint}</p> : null}
    </div>
  );
}
