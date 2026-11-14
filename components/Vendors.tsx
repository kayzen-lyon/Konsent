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
      return "flame" as const;
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
      <p className="rounded-lg border border-line bg-surface p-5 text-sm text-muted">
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
        <article key={v.slug} className="rounded-xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/traceurs/${v.slug}`}
                  className="text-[15px] font-semibold text-ink-2 hover:text-flame hover:underline"
                >
                  {v.name}
                </Link>
                {v.categories.slice(0, 3).map((c) => (
                  <Pill key={c}>{CATEGORY_LABELS[c] ?? c}</Pill>
                ))}
              </div>
              <p className="mt-1 text-sm text-muted">{v.entity}</p>
            </div>

            <div className="text-right">
              <p className="text-sm font-medium text-ink-2">
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

          <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{v.purposeFr}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{v.riskNotesFr}</p>

          {v.ultimateParent && v.ultimateParent !== v.entity ? (
            <p className="mt-2 text-xs text-muted">
              Société mère ultime : <span className="font-medium">{v.ultimateParent}</span>
            </p>
          ) : null}

          <p className="mt-2 text-xs text-muted">{ADEQUACY_LABELS[v.adequacy]}</p>

          {v.alternativesEu && v.alternativesEu.length > 0 ? (
            <p className="mt-3 rounded-md bg-flame-bg px-3 py-2 text-[13px] text-flame-deep">
              <span className="font-semibold">Alternatives européennes : </span>
              {v.alternativesEu.join(", ")}.
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
