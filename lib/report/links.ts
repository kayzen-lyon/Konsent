import { EDITOR } from "../disclaimer";

export interface ReportContext {
  /** Adresse analysée, telle que normalisée par le moteur. */
  url: string;
  /** Référence du rapport (`ScanResult.id`). */
  id: string;
  rulepackVersion: string;
}

/**
 * Lien « Signaler un faux positif ».
 *
 * Le corps ne contient que ce qui identifie le constat : règle, adresse
 * analysée, référence du rapport. Aucune donnée sur la personne qui signale —
 * c'est elle qui choisit ce qu'elle ajoute dans son propre client de
 * messagerie.
 */
export function falsePositiveMailto(ruleId: string, report: ReportContext): string {
  const subject = `Konsent — faux positif présumé ${ruleId}`;
  const body = [
    `Règle : ${ruleId}`,
    `Adresse analysée : ${report.url}`,
    `Référence du rapport : ${report.id}`,
    `Référentiel : ${report.rulepackVersion}`,
    "",
    "Pourquoi ce constat me paraît inexact :",
    "",
  ].join("\n");
  return `mailto:${EDITOR.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Adresse publique et stable du rapport, pour la version imprimée. */
export function publicReportUrl(target: string, view: string): string {
  return `${EDITOR.productSite}/scan?url=${encodeURIComponent(target)}&vue=${encodeURIComponent(view)}`;
}

/** Texte brut d'un correctif, prêt à coller dans un ticket. */
export function remediationText(ruleId: string, title: string, steps: readonly string[]): string {
  return [
    `${ruleId} — ${title}`,
    ...steps.map((s, i) => `${i + 1}. ${s.replace(/`/g, "")}`),
  ].join("\n");
}
