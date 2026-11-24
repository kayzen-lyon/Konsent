import { constatWording } from "../disclaimer";
import { SEVERITY_ORDER, getRule } from "../rulepack";
import type { ScanResult } from "../engine/types";

/**
 * Résumé exécutif : trois phrases tirées du résultat, rien d'autre.
 *
 * Le ton est celui de `constatWording` : on décrit un écart observé, on ne
 * qualifie jamais une infraction. Chaque phrase se déduit d'un champ du
 * résultat ; aucune ne peut dire autre chose que le rapport qui la suit.
 */
export function executiveSummary(
  result: ScanResult,
  /** Analyse navigateur non aboutie : aucun score n'est avancé. */
  partial = false,
): readonly string[] {
  const { findings, vendors, outsideEea } = result;
  const staticMode = result.mode === "static";
  const critical = findings.filter((f) => f.severity === "CRITICAL").length;
  const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

  const first = partial
    ? `Rapport partiel : l'analyse en navigateur de ${result.hostname} n'a pas abouti. ` +
      "Le site n'est pas noté ; relancez l'analyse avant de vous y fier."
    : `L'analyse automatisée${staticMode ? " (mode statique, sans exécution du site)" : " en trois phases"} ` +
    `attribue à ${result.hostname} un score indicatif de ${result.score} sur 100, note ${result.grade} — ` +
    `« ${result.gradeLabel} »${result.cappedBy ? ", score plafonné" : ""}.`;

  const criticalPart =
    critical > 0
      ? `${plural(critical, "écart")} critique${critical > 1 ? "s" : ""} ${critical > 1 ? "ont" : "a"} été relevé${critical > 1 ? "s" : ""} sur ${plural(findings.length, "constat")}`
      : findings.length > 0
        ? `Aucun écart critique n'a été relevé (${plural(findings.length, "constat")} au total)`
        : "Aucun écart n'a été relevé par ce mode d'analyse";
  const vendorPart =
    vendors.length === 0
      ? "aucun destinataire tiers n'a été identifié"
      : outsideEea.length > 0
        ? `${outsideEea.length} des ${plural(vendors.length, "destinataire")} identifié${vendors.length > 1 ? "s" : ""} relève${outsideEea.length > 1 ? "nt" : ""} d'une juridiction hors Espace économique européen`
        : `les ${plural(vendors.length, "destinataire")} identifié${vendors.length > 1 ? "s" : ""} relève${vendors.length > 1 ? "nt" : ""} de l'Espace économique européen`;
  const second = `${criticalPart}, et ${vendorPart}.`;

  // Priorité : gravité d'abord, poids de la règle ensuite.
  const top = [...findings]
    .map((f) => ({ f, rule: getRule(f.ruleId) }))
    .filter((x): x is { f: (typeof findings)[number]; rule: NonNullable<ReturnType<typeof getRule>> } =>
      Boolean(x.rule),
    )
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.f.severity] - SEVERITY_ORDER[b.f.severity] || b.rule.weight - a.rule.weight,
    )[0];

  const third = top
    ? `Point à examiner en priorité : « ${top.rule.title} ». ${constatWording(
        top.rule.references[0] ?? "le référentiel applicable",
      )}`
    : "Ce résultat ne vaut pas certification : les points non vérifiés, listés en fin de rapport, restent à contrôler.";

  return [first, second, third];
}
