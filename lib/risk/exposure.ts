import type { Finding } from "../rulepack/types";
import { requireRule } from "../rulepack";

/**
 * Moteur d'exposition théorique (§8.3).
 *
 * Garde-fou non négociable (§3.2, point 2) : le plafond légal n'est JAMAIS
 * affiché seul. Il est toujours accompagné de l'ordre de grandeur réellement
 * observé en procédure simplifiée et du coût de mise en conformité.
 * Afficher le seul plafond serait une pratique commerciale trompeuse au sens
 * de l'article L. 121-1 du code de la consommation.
 */

export interface ExposureInput {
  /** Chiffre d'affaires annuel mondial déclaré, en euros. Optionnel. */
  revenueEur?: number;
  findings: readonly Finding[];
}

export interface ExposureResult {
  /** Plafond de l'amende administrative, article 83(5) du RGPD. */
  gdprCeilingEur: number;
  /** true si le plafond est calculé sur le CA plutôt que sur le forfait. */
  gdprCeilingFromRevenue: boolean;
  /** Plafond du volet pénal pour une personne morale. */
  criminalCeilingEur: number;
  /** Fourchette réellement observée en procédure simplifiée. */
  observedRange: { low: number; high: number };
  /** Estimation du coût de remise en conformité. */
  remediationEstimateEur: { low: number; high: number };
  criticalCount: number;
  majorCount: number;
  /** Mention obligatoire accompagnant tout montant affiché. */
  caveat: string;
}

const GDPR_FLAT_CEILING = 20_000_000;
const GDPR_REVENUE_RATE = 0.04;
/** 300 000 € (art. 226-16 CP) × 5 pour une personne morale (art. 131-38 CP). */
const CRIMINAL_CEILING_LEGAL_ENTITY = 300_000 * 5;

/**
 * Fourchette de la procédure simplifiée. La borne haute est le plafond légal
 * fixé par l'article 22-1 de la loi n° 78-17 ; la borne basse est un ordre de
 * grandeur prudent. Aucune moyenne n'est affichée tant que le chiffre n'a pas
 * été confronté à sa source (voir `lib/facts.ts`).
 */
const SIMPLIFIED_PROCEDURE_RANGE = { low: 2_000, high: 20_000 };

const BASE_REMEDIATION = 490;

export function computeExposure({ revenueEur, findings }: ExposureInput): ExposureResult {
  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const majorCount = findings.filter((f) => f.severity === "MAJOR").length;

  const revenueBased = revenueEur ? revenueEur * GDPR_REVENUE_RATE : 0;
  const gdprCeilingFromRevenue = revenueBased > GDPR_FLAT_CEILING;
  const gdprCeilingEur = Math.max(GDPR_FLAT_CEILING, revenueBased);

  // Estimation du coût de correction, alignée sur la grille de M11.
  let low = BASE_REMEDIATION;
  let high = BASE_REMEDIATION;
  for (const finding of findings) {
    const rule = requireRule(finding.ruleId);
    if (!rule.remediation.billable) continue;
    const hint = rule.remediation.priceHintEur;
    if (!hint) continue;
    low += hint[0];
    high += hint[1];
  }
  // Les corrections se mutualisent largement : corriger dix balises coûte
  // beaucoup moins que dix fois corriger une balise.
  const mutualised = (v: number) => Math.round((BASE_REMEDIATION + (v - BASE_REMEDIATION) * 0.35) / 10) * 10;

  return {
    gdprCeilingEur,
    gdprCeilingFromRevenue,
    criminalCeilingEur: CRIMINAL_CEILING_LEGAL_ENTITY,
    observedRange: SIMPLIFIED_PROCEDURE_RANGE,
    remediationEstimateEur: { low: mutualised(low), high: mutualised(high) },
    criticalCount,
    majorCount,
    caveat:
      "Ces montants correspondent à des plafonds légaux théoriques. Ils ne constituent " +
      "ni une prévision, ni une estimation de sanction, et ne préjugent d'aucune " +
      "décision d'une autorité de contrôle ou d'une juridiction.",
  };
}

export function formatEur(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
