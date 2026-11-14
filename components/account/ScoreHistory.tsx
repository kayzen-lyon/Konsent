/**
 * Historique des audits d'un domaine surveillé : courbe d'évolution du score.
 *
 * Composant serveur, SVG fait main (aucune dépendance). Accessibilité : le
 * graphique porte `role="img"` avec un titre et une description qui en
 * donnent l'essentiel en mots (premier et dernier score, extrêmes), et les
 * valeurs exactes sont disponibles dans un tableau de données associé — un
 * graphique ne doit jamais être le seul support d'une information.
 */

export interface ScorePoint {
  scannedAt: string;
  score: number;
  grade: string;
}

const W = 320;
const H = 110;
const PAD = { top: 10, right: 10, bottom: 18, left: 28 };

const day = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export function describeSeries(points: readonly ScorePoint[]): string {
  if (points.length === 0) return "Aucune analyse enregistrée.";
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (points.length === 1) {
    return `Une seule analyse : ${last.score} sur 100 (note ${last.grade}) le ${day(last.scannedAt)}.`;
  }
  const scores = points.map((p) => p.score);
  const delta = last.score - first.score;
  const trend =
    delta > 0 ? `en hausse de ${delta} points` : delta < 0 ? `en baisse de ${-delta} points` : "stable";
  return `${points.length} analyses du ${day(first.scannedAt)} au ${day(last.scannedAt)} : score passé de ${first.score} à ${last.score} sur 100, ${trend}. Minimum ${Math.min(...scores)}, maximum ${Math.max(...scores)}.`;
}

export function ScoreHistory({
  id,
  hostname,
  points,
  alertCount,
}: {
  /** Identifiant stable, pour les attributs `id` (titre, description, tableau). */
  id: string;
  hostname: string;
  /** Du plus ancien au plus récent. */
  points: readonly ScorePoint[];
  alertCount: number;
}) {
  const last = points[points.length - 1];
  const titleId = `hist-${id}-titre`;
  const descId = `hist-${id}-desc`;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (score: number) => PAD.top + innerH - (Math.max(0, Math.min(100, score)) / 100) * innerH;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");

  return (
    <article className="rounded-3xl border border-line bg-surface p-5">
      <h3 className="font-display text-lg font-bold text-ink-2">{hostname}</h3>
      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[14px] text-muted">
        <div className="flex gap-1.5">
          <dt>Dernier score :</dt>
          <dd className="font-semibold text-ink-2">
            {last ? `${last.score}/100 (note ${last.grade})` : "aucune analyse"}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Analyses :</dt>
          <dd className="font-semibold text-ink-2">{points.length}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Alertes :</dt>
          <dd className="font-semibold text-ink-2">{alertCount}</dd>
        </div>
      </dl>

      {points.length > 0 ? (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-labelledby={`${titleId} ${descId}`}
            className="mt-4 h-auto w-full max-w-xl"
          >
            <title id={titleId}>{`Évolution du score de ${hostname}`}</title>
            <desc id={descId}>{describeSeries(points)}</desc>
            {[0, 50, 100].map((v) => (
              <g key={v} aria-hidden="true">
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y(v)}
                  y2={y(v)}
                  stroke="var(--color-line)"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 6}
                  y={y(v) + 3}
                  textAnchor="end"
                  fontSize={9}
                  fill="var(--color-muted)"
                >
                  {v}
                </text>
              </g>
            ))}
            {points.length > 1 ? (
              <path d={path} fill="none" stroke="var(--color-flame)" strokeWidth={2} strokeLinejoin="round" />
            ) : null}
            {points.map((p, i) => (
              <circle key={`${p.scannedAt}-${i}`} cx={x(i)} cy={y(p.score)} r={3} fill="var(--color-flame)" />
            ))}
            <text x={PAD.left} y={H - 4} fontSize={9} fill="var(--color-muted)" aria-hidden="true">
              {day(points[0]!.scannedAt)}
            </text>
            {points.length > 1 ? (
              <text
                x={W - PAD.right}
                y={H - 4}
                textAnchor="end"
                fontSize={9}
                fill="var(--color-muted)"
                aria-hidden="true"
              >
                {day(last!.scannedAt)}
              </text>
            ) : null}
          </svg>

          <details className="mt-3 text-[14px]">
            <summary className="cursor-pointer font-semibold text-flame">
              Données du graphique ({points.length} analyse{points.length > 1 ? "s" : ""})
            </summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[18rem] border-collapse text-left text-ink-2">
                <caption className="sr-only">{`Scores successifs de ${hostname}, du plus ancien au plus récent`}</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="py-1.5 pr-4 font-semibold">Date</th>
                    <th scope="col" className="py-1.5 pr-4 font-semibold">Score sur 100</th>
                    <th scope="col" className="py-1.5 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p, i) => (
                    <tr key={`${p.scannedAt}-${i}`} className="border-b border-line last:border-0">
                      <td className="py-1.5 pr-4">
                        <time dateTime={p.scannedAt}>{day(p.scannedAt)}</time>
                      </td>
                      <td className="py-1.5 pr-4">{p.score}</td>
                      <td className="py-1.5">{p.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <p className="mt-3 text-[14px] text-muted">
          Aucune analyse enregistrée pour l&apos;instant : la courbe apparaîtra après le premier
          passage de la surveillance.
        </p>
      )}
    </article>
  );
}
