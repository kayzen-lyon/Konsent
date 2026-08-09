import { createHash } from "node:crypto";
import type { EngineMode, ScanResult } from "../engine/types";

/**
 * Référence de comparaison (« baseline »).
 *
 * Le vrai problème d'un client n'est pas d'être conforme un jour : c'est
 * qu'un stagiaire ajoute un pixel trois mois plus tard. Comparer suppose
 * de conserver un état antérieur.
 *
 * Cette instance ne dispose d'aucune base de données — et la politique de
 * confidentialité annonce qu'aucun résultat n'est conservé. Plutôt que de
 * trahir cet engagement, la référence est EXPORTÉE au client sous forme
 * d'un jeton compact qu'il conserve et représente pour comparer. Aucune
 * donnée ne reste côté serveur.
 *
 * Une intégrité minimale est assurée par une empreinte : un jeton modifié
 * à la main est rejeté, ce qui évite les comparaisons contre un état
 * fabriqué.
 */

export interface Baseline {
  v: 1;
  /** Domaine, pour refuser une comparaison entre deux sites différents. */
  h: string;
  /** Horodatage du scan de référence. */
  t: string;
  /** Version du référentiel, pour signaler une comparaison hétérogène. */
  r: string;
  /**
   * Moteur ayant produit la référence.
   *
   * Sans ce champ, une référence prise en navigateur puis comparée en mode
   * statique fait disparaître 76 règles d'un coup — et le différentiel les
   * annonce en « écarts corrigés ». L'inverse est pire : il déclenche une
   * alerte nominative pour des régressions qui n'ont jamais eu lieu.
   *
   * Absent des jetons émis avant le branchement du worker ; ceux-là sont
   * nécessairement `static`, puisque aucun autre moteur ne tournait alors.
   */
  m?: EngineMode;
  /** Score. */
  s: number;
  g: string;
  /** Identifiants de règles déclenchées, avec leur nombre d'occurrences. */
  f: Record<string, number>;
  /** Slugs des destinataires identifiés. */
  d: string[];
  /** Juridictions effectives observées. */
  j: string[];
  /** Types de pages légales atteignables. */
  p: string[];
}

const SECRET = "konsent-baseline-v1";

function fingerprint(payload: string): string {
  return createHash("sha256").update(SECRET).update(payload).digest("base64url").slice(0, 16);
}

export function createBaseline(scan: ScanResult): Baseline {
  const findings: Record<string, number> = {};
  for (const f of scan.findings) findings[f.ruleId] = f.occurrences;

  return {
    v: 1,
    h: scan.hostname,
    t: scan.scannedAt,
    r: scan.rulepackVersion,
    m: scan.mode,
    s: scan.score,
    g: scan.grade,
    f: findings,
    d: scan.vendors.map((v) => v.slug).sort(),
    j: [...new Set(scan.vendors.map((v) => v.effectiveJurisdiction))].sort(),
    p: scan.observation.legalPages.filter((p) => p.reachable).map((p) => p.kind).sort(),
  };
}

/** Sérialise en jeton transportable : base64url du JSON + empreinte. */
export function encodeBaseline(baseline: Baseline): string {
  const json = JSON.stringify(baseline);
  const body = Buffer.from(json, "utf8").toString("base64url");
  return `${body}.${fingerprint(body)}`;
}

export function decodeBaseline(token: string): Baseline | null {
  const trimmed = token.trim();
  const sep = trimmed.lastIndexOf(".");
  if (sep <= 0) return null;

  const body = trimmed.slice(0, sep);
  const mac = trimmed.slice(sep + 1);
  if (fingerprint(body) !== mac) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Baseline;
    if (parsed.v !== 1 || typeof parsed.h !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Moteur de la référence, avec la valeur par défaut historique.
 *
 * Ne jamais présumer `headless` sur un jeton muet : ce serait interpréter une
 * référence pauvre comme une référence complète, et donc lire l'apparition
 * normale de constats navigateur comme autant de régressions.
 */
export function baselineMode(baseline: Baseline): EngineMode {
  return baseline.m === "headless" ? "headless" : "static";
}
