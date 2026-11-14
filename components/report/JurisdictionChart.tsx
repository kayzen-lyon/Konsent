import { useId } from "react";
import { ADEQUACY_SHORT, recipientsByJurisdiction } from "@/lib/report/jurisdictions";
import type { TrackerEntity } from "@/lib/trackers/types";

/**
 * Destinataires par juridiction effective, en barres horizontales.
 *
 * SVG maison, sans bibliothèque. La couleur ne porte jamais seule
 * l'information (RGAA 3.1) : chaque barre hors EEE est aussi hachurée et son
 * libellé dit « hors EEE ». Les valeurs sont écrites en clair dans le
 * graphique, et le même contenu figure dans le tableau de données qui suit
 * (RGAA 1.8 / 4.x : alternative textuelle d'une image complexe).
 */
export function JurisdictionChart({
  vendors,
  compact = false,
}: {
  vendors: readonly Pick<TrackerEntity, "name" | "effectiveJurisdiction" | "adequacy">[];
  /** Sans tableau détaillé (diapositive, synthèse) : la liste reste en texte. */
  compact?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const groups = recipientsByJurisdiction(vendors);
  if (groups.length === 0) {
    return (
      <p className="rounded-3xl bg-surface p-5 text-sm text-muted ring-1 ring-line">
        Aucun destinataire tiers identifié : rien à répartir par pays.
      </p>
    );
  }

  const total = groups.reduce((s, g) => s + g.count, 0);
  const outside = groups.filter((g) => g.outsideEea).reduce((s, g) => s + g.count, 0);
  const max = Math.max(...groups.map((g) => g.count));

  const W = 400;
  const ROW = 46;
  const BAR_Y = 24;
  const BAR_H = 12;
  const H = groups.length * ROW;
  const hatch = `hatch-${uid}`;

  const summary = groups
    .map((g) => `${g.name}${g.outsideEea ? " (hors EEE)" : ""} : ${g.count}`)
    .join(", ");

  return (
    <figure className="rounded-3xl bg-surface p-5 ring-1 ring-line shadow-md">
      <figcaption>
        <h3 className="font-display text-[15px] font-bold text-ink-2">
          Destinataires par pays de juridiction effective
        </h3>
        <p className="mt-1 text-[13px] text-muted">
          {total} destinataire{total > 1 ? "s" : ""}, dont{" "}
          <strong className={outside > 0 ? "text-crit-text" : "text-ok"}>
            {outside} hors Espace économique européen
          </strong>
          .
        </p>
      </figcaption>

      <div className={compact ? "mt-4" : "mt-4 grid gap-6 lg:grid-cols-[minmax(0,480px)_1fr] lg:items-start"}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full max-w-[480px]"
          role="img"
          aria-label={`Répartition des destinataires par juridiction — ${summary}.`}
        >
          <defs>
            <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="var(--color-crit)" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-surface)" strokeWidth="2" strokeOpacity="0.45" />
            </pattern>
          </defs>
          {groups.map((g, i) => {
            const y = i * ROW;
            const width = Math.max(4, (g.count / max) * (W - 4));
            return (
              <g key={g.code}>
                <text x="0" y={y + 15} fontSize="14" fontWeight="600" fill="var(--color-ink-2)">
                  {g.name}
                  {g.outsideEea ? (
                    <tspan fill="var(--color-crit-text)" fontWeight="700">
                      {" "}
                      · hors EEE
                    </tspan>
                  ) : (
                    <tspan fill="var(--color-muted)" fontWeight="400">
                      {" "}
                      · EEE
                    </tspan>
                  )}
                </text>
                <text x={W} y={y + 15} fontSize="14" fontWeight="700" textAnchor="end" fill="var(--color-ink-2)">
                  {g.count}
                </text>
                <rect x="0" y={y + BAR_Y} width={W} height={BAR_H} rx="6" fill="var(--color-line)" />
                <rect
                  x="0"
                  y={y + BAR_Y}
                  width={width}
                  height={BAR_H}
                  rx="6"
                  fill={g.outsideEea ? `url(#${hatch})` : "var(--color-ok)"}
                />
              </g>
            );
          })}
        </svg>

        {compact ? null : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <caption className="tech pb-2 text-left text-[10px] text-muted">
                Données du graphique : destinataires par juridiction
              </caption>
              <thead>
                <tr className="border-b border-line text-muted">
                  <th scope="col" className="py-2 pr-3 font-semibold">Juridiction</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Statut</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">Nombre</th>
                  <th scope="col" className="py-2 font-semibold">Services</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.code} className="border-b border-line align-top">
                    <th scope="row" className="py-2 pr-3 font-semibold text-ink-2">
                      {g.name} <span className="font-mono text-[11px] font-normal text-muted">({g.code})</span>
                    </th>
                    <td className={`py-2 pr-3 ${g.outsideEea ? "font-semibold text-crit-text" : "text-ok"}`}>
                      {g.outsideEea ? `Hors EEE — ${ADEQUACY_SHORT[g.adequacy]}` : "EEE"}
                    </td>
                    <td className="tabular py-2 pr-3 text-right text-ink-2">{g.count}</td>
                    <td className="py-2 text-muted">{g.vendors.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </figure>
  );
}
