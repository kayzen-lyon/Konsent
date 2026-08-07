import { gradeColor } from "@/lib/risk/score";

/**
 * Jauge de score. Rendue en SVG pur, sans bibliothèque : le produit se
 * refuse à charger la moindre ressource externe.
 */
export function ScoreGauge({
  score,
  grade,
  gradeLabel,
}: {
  score: number;
  grade: string;
  gradeLabel: string;
}) {
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const color = gradeColor(grade);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg
          viewBox="0 0 200 200"
          className="h-44 w-44"
          role="img"
          aria-label={`Score de conformité : ${score} sur 100, note ${grade}, ${gradeLabel}`}
        >
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="14" />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform="rotate(-90 100 100)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-5xl font-semibold leading-none" style={{ color }}>
            {score}
          </span>
          <span className="mt-1 text-xs font-medium uppercase tracking-widest text-k-muted">
            sur 100
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span
          className="grid h-8 w-8 place-items-center rounded-lg text-base font-bold text-white"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        >
          {grade}
        </span>
        <span className="text-sm font-medium text-k-ink">{gradeLabel}</span>
      </div>
    </div>
  );
}
