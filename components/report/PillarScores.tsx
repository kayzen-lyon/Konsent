import type { Finding } from "@/lib/rulepack/types";
import { pillarScores } from "@/lib/report/pillars";

function tone(score: number): { bar: string; text: string } {
  if (score >= 75) return { bar: "bg-ok", text: "text-ok" };
  if (score >= 50) return { bar: "bg-warn", text: "text-warn" };
  return { bar: "bg-crit", text: "text-crit" };
}

/**
 * Jauges secondaires : un score par pilier. La valeur est écrite en toutes
 * lettres ; la barre ne fait que la redire et reste masquée aux technologies
 * d'assistance.
 */
export function PillarScores({ findings }: { findings: readonly Finding[] }) {
  const scores = pillarScores(findings);
  return (
    <div className="rounded-lg bg-surface p-4 ring-1 ring-line shadow-md">
      <h3 className="tech text-[10px] text-muted">Score par pilier</h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {scores.map((p) => {
          const t = tone(p.score);
          return (
            <li key={p.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink-2">
                  <span className="text-muted">{p.index}.</span> {p.title}
                </span>
                <span className={`tabular font-display text-[15px] font-bold ${t.text}`}>
                  {p.score}
                  <span className="text-[11px] font-normal text-muted"> / 100</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
                <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${p.score}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted">
                {p.findings === 0
                  ? "Aucun écart relevé"
                  : `${p.findings} écart${p.findings > 1 ? "s" : ""}${
                      p.critical > 0 ? `, dont ${p.critical} critique${p.critical > 1 ? "s" : ""}` : ""
                    }`}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] leading-snug text-muted">
        Même barème que le score global, appliqué pilier par pilier, sans plafond. Les règles non
        évaluées n&apos;y comptent pas.
      </p>
    </div>
  );
}
