"use client";

import { useEffect, useState } from "react";
import { gradeColor } from "@/lib/risk/grade";

const DURATION_MS = 900;

/** Mouvement réduit : réglage du système OU réglage du site (`data-motion`). */
function motionReduced(): boolean {
  return (
    document.documentElement.dataset.motion === "reduce" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Jauge de score, en SVG pur — aucune bibliothèque, aucune ressource externe.
 *
 * Avec `animate`, le chiffre et l'arc comptent de 0 au score en ~900 ms.
 * Le rendu serveur porte toujours la valeur finale : sans JavaScript, pour
 * un robot ou à l'impression, on lit le vrai score. L'animation ne démarre
 * qu'après hydratation et ne démarre pas du tout si le mouvement est réduit.
 * L'étiquette accessible, elle, donne toujours la valeur finale.
 */
export function ScoreGauge({
  score,
  grade,
  gradeLabel,
  animate = false,
}: {
  score: number;
  grade: string;
  gradeLabel: string;
  animate?: boolean;
}) {
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (!animate || motionReduced()) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      // Décélération (ease-out cubique) : le chiffre ralentit en approchant.
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(t >= 1 ? null : Math.round(eased * score));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setShown(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, score]);

  const value = shown ?? score;
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const dash = (value / 100) * circumference;
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
            {value}
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
