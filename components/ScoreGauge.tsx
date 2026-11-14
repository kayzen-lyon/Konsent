import { gradeColor } from "@/lib/risk/grade";

/** Jauge de score, en SVG pur — aucune bibliothèque, aucune ressource externe. */
export function ScoreGauge({
  score,
  grade,
  gradeLabel,
}: {
  score: number;
  grade: string;
  gradeLabel: string;
}) {
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const color = gradeColor(grade);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg
          viewBox="0 0 200 200"
          className="h-40 w-40"
          role="img"
          aria-label={`Score de conformité : ${score} sur 100, note ${grade}, ${gradeLabel}`}
        >
          <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--color-line)" strokeWidth="16" />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform="rotate(-90 100 100)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
          <span className="tabular display text-[3.2rem] leading-none" style={{ color }}>
            {score}
          </span>
          <span className="tech mt-1 text-[9px] text-muted">sur 100</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className="display grid h-8 w-8 place-items-center rounded text-lg text-white"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        >
          {grade}
        </span>
        <span className="text-sm font-semibold text-ink-2">{gradeLabel}</span>
      </div>
    </div>
  );
}
