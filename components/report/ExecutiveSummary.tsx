import type { ScanResult } from "@/lib/engine/types";
import { executiveSummary } from "@/lib/report/summary";

/** Résumé exécutif : trois phrases tirées du résultat, en tête de rapport. */
export function ExecutiveSummary({ result }: { result: ScanResult }) {
  const sentences = executiveSummary(result);
  return (
    <section
      aria-labelledby="resume-executif"
      className="mb-10 rounded-3xl border-l-4 border-flame bg-surface p-7 ring-1 ring-line shadow-md"
    >
      <h2 id="resume-executif" className="tech text-[12px] text-flame">
        En bref
      </h2>
      <div className="mt-3 max-w-4xl space-y-2 text-[17px] leading-relaxed text-ink-2">
        {sentences.map((s, i) => (
          <p key={i}>{s}</p>
        ))}
      </div>
    </section>
  );
}
