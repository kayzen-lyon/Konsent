import { ScanForm } from "@/components/ScanForm";
import { runVerdictScan } from "@/lib/engine/orchestrate";
import { ScanError } from "@/lib/engine/scan";
import { isWorkerConfigured } from "@/lib/engine/worker-client";

/**
 * États communs aux vues d'un rapport (rapport, présentation, synthèse) :
 * attente, erreur, et l'appel au moteur avec la même traduction des erreurs.
 */

export function ScanSkeleton({ target }: { target: string }) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16" role="status" aria-busy="true">
      <div className="pulse-soft space-y-4" aria-hidden="true">
        <div className="h-3 w-52 rounded bg-line" />
        <div className="h-10 w-80 max-w-full rounded bg-line" />
        <div className="mt-8 h-40 w-40 rounded-full bg-line" />
        <div className="h-28 w-full rounded-xl bg-line" />
      </div>
      <p className="mt-8 font-mono text-sm text-muted">
        Analyse de <span className="font-bold text-ink-2">{target}</span> —{" "}
        {isWorkerConfigured()
          ? "trois chargements en navigateur : avant consentement, après refus, après acceptation. Comptez une quarantaine de secondes."
          : "chargement du document, résolution DNS, lecture des pages légales…"}
      </p>
    </div>
  );
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
