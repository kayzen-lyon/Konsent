import { ScanForm } from "@/components/ScanForm";
import { runVerdictScan } from "@/lib/engine/orchestrate";
import { ScanError } from "@/lib/engine/scan";
import { isWorkerConfigured } from "@/lib/engine/worker-client";
import { ScanProgress } from "./ScanProgress";

/**
 * États communs aux vues d'un rapport (rapport, présentation, synthèse) :
 * attente, erreur, et l'appel au moteur avec la même traduction des erreurs.
 */

export function ScanSkeleton({ target }: { target: string }) {
  return <ScanProgress target={target} headless={isWorkerConfigured()} />;
}

export function ErrorPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <div className="rounded-xl border-l-2 border-warn bg-surface p-6 ring-1 ring-line shadow-md">
        <p className="tech text-[10px] text-warn">Analyse interrompue</p>
        <h1 className="display mt-2 text-2xl text-ink-2">{title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{message}</p>
      </div>
      <div className="mt-8">
        <p className="tech mb-3 text-[10px] text-muted">Essayer une autre adresse</p>
        <ScanForm />
      </div>
    </div>
  );
}

const ERROR_TITLES: Record<string, string> = {
  INVALID_URL: "Cette adresse n'a pas pu être interprétée",
  UNREACHABLE: "Le site n'a pas répondu",
  BLOCKED: "Le site a refusé l'analyse",
  TIMEOUT: "L'analyse a pris trop de temps",
};

export type VerdictOutcome =
  | { ok: true; verdict: Awaited<ReturnType<typeof runVerdictScan>> }
  | { ok: false; panel: React.ReactElement };

/** Lance l'analyse ; en cas d'échec, renvoie le panneau d'erreur à afficher. */
export async function runScanOrPanel(target: string): Promise<VerdictOutcome> {
  try {
    return { ok: true, verdict: await runVerdictScan(target) };
  } catch (error) {
    if (error instanceof ScanError) {
      return {
        ok: false,
        panel: (
          <ErrorPanel
            title={ERROR_TITLES[error.code] ?? "L'analyse n'a pas abouti"}
            message={error.message}
          />
        ),
      };
    }
    return {
      ok: false,
      panel: (
        <ErrorPanel
          title="L'analyse n'a pas abouti"
          message="Une erreur inattendue est survenue. Vous pouvez réessayer dans un instant."
        />
      ),
    };
  }
}
