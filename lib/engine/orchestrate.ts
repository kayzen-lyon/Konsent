import { assembleHeadlessScan } from "./scan-headless";
import { normalizeTarget, runScan } from "./scan";
import type { ScanResult } from "./types";
import {
  WorkerError,
  isWorkerConfigured,
  requestWorkerScan,
  type WorkerFailure,
} from "./worker-client";

/**
 * Orchestration du verdict public.
 *
 * Le §18.0 du PRD posait le constat sans détour : « le jalon P0 lui-même est
 * dégradé. La production exécute le moteur statique ; le worker trois phases
 * existe mais n'est pas branché. » Le worker savait observer, l'application
 * savait évaluer, et rien ne les reliait — il fallait lancer la commande à la
 * main et pousser le JSON dans `/api/ingest`.
 *
 * Ce module est ce lien. Il tente le protocole complet, et retombe sur le
 * moteur statique quand il échoue. La règle qui gouverne tout le fichier :
 * **une dégradation se dit**. Un rapport statique présenté comme un rapport
 * complet compterait implicitement 96 règles comme satisfaites, ce que le
 * garde-fou n°6 (§3.2) interdit.
 */

export interface VerdictScan {
  result: ScanResult;
  /**
   * Renseigné uniquement lorsque le protocole complet était attendu mais n'a
   * pas pu s'exécuter. Destiné à être AFFICHÉ, pas journalisé en silence.
   */
  degraded?: {
    failure: WorkerFailure;
    reason: string;
  };
}

/**
 * Formulations destinées au lecteur du rapport.
 *
 * Elles constatent une limite de notre analyse, jamais un défaut du site
 * analysé : l'utilisateur ne doit pas confondre « nous n'avons pas pu
 * vérifier » avec « votre site est en cause ».
 */
const DEGRADATION_REASONS: Record<WorkerFailure, string> = {
  NOT_CONFIGURED:
    "Le protocole en trois phases n'est pas déployé sur cette instance. Ce rapport observe le document servi, sans exécuter le site dans un navigateur.",
  UNAUTHORIZED:
    "Notre worker navigateur a refusé la requête d'analyse. Défaut de configuration de notre côté ; le rapport ci-dessous est le mode statique.",
  SATURATED:
    "Nos navigateurs d'analyse sont tous occupés. Ce rapport est le mode statique ; relancer l'analyse dans quelques minutes donnera le protocole complet.",
  TIMEOUT:
    "L'analyse en navigateur a dépassé le temps imparti — page lourde, ou serveur lent à répondre. Le rapport ci-dessous est le mode statique.",
  UNREACHABLE:
    "Notre worker navigateur est momentanément injoignable. Le rapport ci-dessous est le mode statique.",
  REJECTED:
    "L'analyse en navigateur n'a pas abouti. Le rapport ci-dessous est le mode statique.",
  MALFORMED:
    "L'observation renvoyée par notre worker n'était pas exploitable. Nous préférons le dire et servir le mode statique plutôt que d'exploiter un instantané douteux.",
};

/**
 * Produit le meilleur rapport disponible pour une adresse.
 *
 * Ordre : protocole en trois phases si le worker est déployé et répond,
 * moteur statique sinon. Les erreurs du SITE (injoignable, pare-feu) ne sont
 * pas rattrapées ici — elles remontent en `ScanError` depuis `runScan`, car
 * elles concernent l'utilisateur et non notre infrastructure.
 */
export async function runVerdictScan(
  rawTarget: string,
  signal?: AbortSignal,
): Promise<VerdictScan> {
  // Normalisation d'abord : inutile de réveiller un navigateur pour une
  // adresse qui ne passera pas le contrôle, et l'erreur doit être la même
  // quel que soit le moteur qui aurait tourné.
  const url = normalizeTarget(rawTarget);

  if (!isWorkerConfigured()) {
    return {
      result: await runScan(url.toString(), signal),
      degraded: {
        failure: "NOT_CONFIGURED",
        reason: DEGRADATION_REASONS.NOT_CONFIGURED,
      },
    };
  }

  const started = Date.now();
  try {
    const output = await requestWorkerScan(url.toString(), signal);
    return { result: await assembleHeadlessScan(output) };
  } catch (error) {
    if (!(error instanceof WorkerError)) throw error;

    // Motif et durée, jamais l'adresse analysée.
    console.error(`worker : ${error.failure} après ${Date.now() - started} ms`);

    // Le worker a échoué, pas le site. On sert ce que l'on sait produire
    // sans navigateur, et on écrit pourquoi.
    return {
      result: await runScan(url.toString(), signal),
      degraded: {
        failure: error.failure,
        reason: DEGRADATION_REASONS[error.failure],
      },
    };
  }
}
