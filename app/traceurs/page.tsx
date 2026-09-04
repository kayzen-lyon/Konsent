import Link from "next/link";
import type { Metadata } from "next";
import { Pill } from "@/components/primitives";
import { CATEGORY_LABELS, TRACKERS } from "@/lib/trackers/db";

export const metadata: Metadata = {
  title: "Base des traceurs",
  description:
    "Fiches des services tiers les plus répandus sur le web français : entreprise contractante, juridiction effective, finalité et implications, rédigées en français.",
};

export default function TrackersPage() {
  const sorted = [...TRACKERS].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const eea = TRACKERS.filter((t) => t.adequacy === "EEA").length;
  const risky = TRACKERS.filter(
    (t) => t.adequacy === "NONE" || t.adequacy === "EXTENDED_ACCESS",
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          Base de connaissance
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-2 sm:text-4xl">
          {TRACKERS.length} services tiers, décrits en français
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          Les autres outils affichent « <code className="font-mono text-[13px]">_fbp</code> —
          advertising ». Nous écrivons ce que cela veut dire pour un dirigeant : quelle
          entreprise reçoit quoi, sous quel droit, et ce que cela implique concrètement.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Pill tone="ok">{eea} établis dans l&apos;EEE</Pill>
          <Pill tone="danger">{risky} sans adéquation ou à accès étatique étendu</Pill>
        </div>
      </header>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/traceurs/${t.slug}`}
              className="group flex h-full flex-col rounded-xl border border-line bg-surface p-4 transition hover:border-flame"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[15px] font-semibold leading-snug text-ink-2 group-hover:text-accent">
                  {t.name}
                </span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                    t.adequacy === "EEA"
                      ? "bg-green-50 text-green-800"
                      : t.adequacy === "ADEQUATE"
                        ? "bg-flame-bg text-flame-dark"
                        : t.adequacy === "DPF_CONDITIONAL"
                          ? "bg-amber-50 text-amber-800"
                          : "bg-red-50 text-red-800"
                  }`}
                >
                  {t.effectiveJurisdiction}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">{t.entity}</p>
              <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted">
                {t.purposeFr}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {t.categories.slice(0, 2).map((c) => (
                  <span
                    key={c}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
                  >
                    {CATEGORY_LABELS[c] ?? c}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
