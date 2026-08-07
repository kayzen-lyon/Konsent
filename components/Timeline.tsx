import type { Observation } from "@/lib/engine/types";
import { CONSENT_REQUIRED_CATEGORIES } from "@/lib/trackers/db";

/**
 * La preuve visuelle brute (§3.1, levier 1).
 *
 * Honnêteté du rendu : en mode statique, aucun horodatage réel n'est
 * mesurable puisque rien n'est exécuté. On affiche donc l'ORDRE D'APPARITION
 * dans le document servi, en le disant explicitement. Fabriquer de faux
 * « T+0,31 s » ruinerait la crédibilité du constat, qui est le produit.
 */
export function Timeline({ observation }: { observation: Observation }) {
  const rows = observation.requests
    .filter((r) => r.tracker && r.origin !== "connect")
    .slice(0, 14);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-5">
        <p className="text-sm font-medium text-green-900">
          Aucun service tiers connu n&apos;a été repéré dans le document servi.
        </p>
        <p className="mt-1 text-sm text-green-800">
          C&apos;est un bon signe. Une vérification en navigateur reste nécessaire pour les
          services chargés dynamiquement.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-k-line bg-white">
      <div className="border-b border-k-line bg-k-surface px-4 py-2.5">
        <p className="font-mono text-xs text-k-muted">
          Ordre d&apos;apparition dans le document servi par {observation.hostname}
        </p>
      </div>

      <ol className="divide-y divide-k-line">
        <li className="flex items-baseline gap-3 px-4 py-2.5 font-mono text-[13px]">
          <span className="tabular w-14 shrink-0 text-k-muted">#00</span>
          <span className="text-k-ink">Chargement de la page</span>
        </li>

        {rows.map((r, i) => {
          const needsConsent =
            r.tracker &&
            !r.tracker.exemptEligible &&
            r.tracker.categories.some((c) => CONSENT_REQUIRED_CATEGORIES.has(c));
          return (
            <li
              key={`${r.url}-${i}`}
              className={`flex items-baseline gap-3 px-4 py-2.5 font-mono text-[13px] ${
                needsConsent ? "bg-red-50/60" : ""
              }`}
            >
              <span className="tabular w-14 shrink-0 text-k-muted">
                #{String(i + 1).padStart(2, "0")}
              </span>
              <span className="shrink-0" aria-hidden="true">
                {needsConsent ? "⚠" : "·"}
              </span>
              <span className="min-w-0 flex-1">
                <span className={needsConsent ? "font-semibold text-red-900" : "text-k-ink"}>
                  {r.hostname}
                </span>
                <span className="ml-2 text-k-muted">
                  → {r.tracker?.name} ({r.tracker?.effectiveJurisdiction})
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-k-line bg-k-surface px-4 py-3">
        <p className="text-[13px] leading-relaxed text-k-ink">
          <span className="font-semibold">
            {rows.filter(
              (r) =>
                r.tracker &&
                !r.tracker.exemptEligible &&
                r.tracker.categories.some((c) => CONSENT_REQUIRED_CATEGORIES.has(c)),
            ).length}{" "}
            service(s)
          </span>{" "}
          soumis à consentement sont référencés dans la page, avant que le visiteur ait eu la
          possibilité de répondre.
        </p>
      </div>
    </div>
  );
}
