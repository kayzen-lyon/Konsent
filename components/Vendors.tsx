import Link from "next/link";
import { ADEQUACY_LABELS, CATEGORY_LABELS } from "@/lib/trackers/db";
import type { TrackerEntity } from "@/lib/trackers/types";
import { Pill } from "./primitives";

const FLAGS: Record<string, string> = {
  FR: "🇫🇷", IE: "🇮🇪", US: "🇺🇸", DE: "🇩🇪", NL: "🇳🇱", DK: "🇩🇰", SE: "🇸🇪",
  EE: "🇪🇪", PL: "🇵🇱", LU: "🇱🇺", MT: "🇲🇹", GB: "🇬🇧", IL: "🇮🇱", CN: "🇨🇳",
  RU: "🇷🇺", CA: "🇨🇦", NZ: "🇳🇿", EU: "🇪🇺", XX: "🌐",
};

function adequacyTone(a: TrackerEntity["adequacy"]) {
  switch (a) {
    case "EEA":
      return "ok" as const;
    case "ADEQUATE":
      return "primary" as const;
    case "DPF_CONDITIONAL":
      return "warn" as const;
    default:
      return "danger" as const;
  }
}

/**
 * La grille des destinataires (§14.4, composant signature).
 * Chaque ligne nomme l'entreprise, sa juridiction effective et ce qu'elle
 * reçoit — traduit pour un dirigeant, pas pour un développeur.
 */
export function VendorTable({ vendors }: { vendors: readonly TrackerEntity[] }) {
  if (vendors.length === 0) {
    return (
      <p className="rounded-lg border border-k-line bg-white p-5 text-sm text-k-muted">
        Aucun destinataire tiers connu n&apos;a été identifié dans le document servi.
      </p>
    );
  }

  const sorted = [...vendors].sort((a, b) => {
    const rank = (t: TrackerEntity) =>
      t.adequacy === "EXTENDED_ACCESS" ? 0 : t.adequacy === "NONE" ? 1 : t.adequacy === "DPF_CONDITIONAL" ? 2 : 3;
    return rank(a) - rank(b);
  });

  return (
    <div className="space-y-3">
      {sorted.map((v) => (
        <article key={v.slug} className="rounded-xl border border-k-line bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/traceurs/${v.slug}`}
                  className="text-[15px] font-semibold text-k-ink hover:text-k-primary hover:underline"
                >
                  {v.name}
                </Link>
                {v.categories.slice(0, 3).map((c) => (
                  <Pill key={c}>{CATEGORY_LABELS[c] ?? c}</Pill>
                ))}
              </div>
              <p className="mt-1 text-sm text-k-muted">{v.entity}</p>
            </div>

            <div className="text-right">
              <p className="text-sm font-medium text-k-ink">
                <span aria-hidden="true">{FLAGS[v.effectiveJurisdiction] ?? "🌐"}</span>{" "}
                {v.effectiveJurisdiction}
              </p>
              <div className="mt-1">
                <Pill tone={adequacyTone(v.adequacy)}>
                  {v.adequacy === "EEA"
                    ? "EEE"
                    : v.adequacy === "ADEQUATE"
                      ? "Adéquation"
                      : v.adequacy === "DPF_CONDITIONAL"
                        ? "DPF conditionnel"
                        : v.adequacy === "EXTENDED_ACCESS"
                          ? "Accès étatique étendu"
                          : "Sans adéquation"}
                </Pill>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[14px] leading-relaxed text-k-ink">{v.purposeFr}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-k-muted">{v.riskNotesFr}</p>

          {v.ultimateParent && v.ultimateParent !== v.entity ? (
            <p className="mt-2 text-xs text-k-muted">
              Société mère ultime : <span className="font-medium">{v.ultimateParent}</span>
            </p>
          ) : null}

          <p className="mt-2 text-xs text-k-muted">{ADEQUACY_LABELS[v.adequacy]}</p>

          {v.alternativesEu && v.alternativesEu.length > 0 ? (
            <p className="mt-3 rounded-md bg-teal-50 px-3 py-2 text-[13px] text-teal-900">
              <span className="font-semibold">Alternatives européennes : </span>
              {v.alternativesEu.join(", ")}.
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

/** Répartition des destinataires par juridiction, en barres proportionnelles. */
export function JurisdictionBreakdown({ vendors }: { vendors: readonly TrackerEntity[] }) {
  if (vendors.length === 0) return null;

  const counts = new Map<string, number>();
  for (const v of vendors) {
    counts.set(v.effectiveJurisdiction, (counts.get(v.effectiveJurisdiction) ?? 0) + 1);
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = vendors.length;

  return (
    <div className="rounded-xl border border-k-line bg-white p-5">
      <p className="text-sm font-semibold text-k-ink">Où partent les données</p>
      <ul className="mt-3 space-y-2.5">
        {entries.map(([jur, n]) => {
          const pct = Math.round((n / total) * 100);
          const isEea = vendors.some(
            (v) => v.effectiveJurisdiction === jur && v.adequacy === "EEA",
          );
          return (
            <li key={jur}>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="font-medium text-k-ink">
                  <span aria-hidden="true">{FLAGS[jur] ?? "🌐"}</span> {jur}
                </span>
                <span className="tabular text-k-muted">
                  {n} destinataire{n > 1 ? "s" : ""}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-k-line">
                <div
                  className={`h-full rounded-full ${isEea ? "bg-k-ok" : "bg-k-danger"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
