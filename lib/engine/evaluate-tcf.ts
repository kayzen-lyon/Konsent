import { requireRule } from "../rulepack";
import type { Finding } from "../rulepack/types";
import { activeAfterRefusal, auditTcf } from "../tcf/audit";
import { decodeTcString } from "../tcf/decode";
import { purposeLabel, TCF_SPECIAL_FEATURES } from "../tcf/purposes";
import type { WorkerOutput, WorkerSnapshot } from "./headless-adapter";

/**
 * Famille TCF et refus TCF, branchées sur le protocole en trois phases.
 *
 * `auditTcf()` existait mais n'était appelé que par ses tests : en production,
 * aucune des huit règles TCF ne pouvait se déclencher. Ce module lit la chaîne
 * relevée à chaque phase et l'audite là où elle a un sens :
 *
 * - phase A (aucune interaction) : un consentement déjà présent est le
 *   constat le plus grave (KZC-TCF-008) ;
 * - phase B (refus) : la chaîne est DÉCODÉE — une chaîne qui reflète le refus
 *   est le comportement attendu, seule une finalité ou un partenaire encore
 *   consenti constitue un manquement (KZC-REFUS-006) ;
 * - phase C (acceptation) : la chaîne la plus complète, sur laquelle portent
 *   les contrôles de contenu (intérêt légitime, restrictions, validité).
 */

export const TCF_RULE_IDS: readonly string[] = [
  "KZC-TCF-001",
  "KZC-TCF-002",
  "KZC-TCF-003",
  "KZC-TCF-004",
  "KZC-TCF-005",
  "KZC-TCF-006",
  "KZC-TCF-007",
  "KZC-TCF-008",
];

export interface TcfPhaseEvaluation {
  findings: readonly Finding[];
  /** Règles de ce module que l'observation n'a pas permis de trancher. */
  undecided: readonly string[];
}

const stringOf = (s?: WorkerSnapshot): string => s?.tcString?.trim() ?? "";

/**
 * L'interface `__tcfapi` a-t-elle été vue ? On ne la DÉDUIT d'une chaîne que
 * pour un worker antérieur, qui ne renseignait pas le champ : sinon une chaîne
 * lue dans le cookie, sans interface, ferait passer KZC-TCF-001 pour satisfaite.
 */
function apiSeen(snapshots: readonly WorkerSnapshot[]): boolean {
  return snapshots.some((s) => s.tcfApiPresent ?? stringOf(s) !== "");
}

/** Une CMP TCF a-t-elle été observée, par son interface ou par une chaîne ? */
function tcfObserved(snapshots: readonly WorkerSnapshot[]): boolean {
  return snapshots.some((s) => s.tcfApiPresent === true || stringOf(s) !== "");
}

function withPhase(findings: readonly Finding[], phase: Finding["phase"]): Finding[] {
  return findings.map((f) => ({ ...f, phase }));
}

/** KZC-REFUS-006 : finalités, partenaires ou fonctionnalités encore actifs après refus. */
export function refusalFinding(tcString: string): { finding?: Finding; decided: boolean } {
  const decoded = decodeTcString(tcString);
  if (!decoded.ok) return { decided: false };

  const active = activeAfterRefusal(decoded.core);
  if (active.purposes.length === 0 && active.vendors === 0 && active.specialFeatures.length === 0) {
    return { decided: true };
  }

  const rule = requireRule("KZC-REFUS-006");
  const evidence: Finding["evidence"][number][] = [];
  if (active.purposes.length > 0) {
    evidence.push({
      kind: "note",
      label: `Finalités encore consenties après refus : ${active.purposes.join(", ")}`,
      detail: active.purposes.map(purposeLabel).join(" · "),
    });
  }
  if (active.vendors > 0) {
    evidence.push({
      kind: "note",
      label: `${active.vendors} partenaire(s) encore marqué(s) comme consentant(s)`,
    });
  }
  if (active.specialFeatures.length > 0) {
    evidence.push({
      kind: "note",
      label: "Fonctionnalités spéciales encore activées",
      detail: active.specialFeatures
        .map((id) => TCF_SPECIAL_FEATURES.find((f) => f.id === id)?.plain ?? `Fonctionnalité ${id}`)
        .join(" · "),
    });
  }

  return {
    decided: true,
    finding: {
      ruleId: rule.id,
      severity: rule.severity,
      family: rule.family,
      title: rule.title,
      occurrences: evidence.length,
      evidence,
      phase: "B",
    },
  };
}

export function evaluateTcfPhases(output: WorkerOutput): TcfPhaseEvaluation {
  const a = output.snapshots.find((s) => s.phase === "A");
  const b = output.snapshots.find((s) => s.phase === "B");
  const c = output.snapshots.find((s) => s.phase === "C");
  const apiPresent = apiSeen(output.snapshots);

  const byRule = new Map<string, Finding>();
  const decided = new Set<string>();
  const keep = (findings: readonly Finding[]) => {
    for (const f of findings) if (!byRule.has(f.ruleId)) byRule.set(f.ruleId, f);
  };

  // Phase A : seul TCF-008 a un sens ici — les contrôles de contenu sont faits
  // sur la chaîne de phase C, plus complète, pour ne pas compter deux fois.
  if (stringOf(a) !== "") {
    const auditA = auditTcf({
      tcString: stringOf(a),
      apiPresent,
      vendorsContacted: [],
      observedBeforeInteraction: true,
    });
    keep(withPhase(auditA.findings.filter((f) => f.ruleId === "KZC-TCF-008" || f.ruleId === "KZC-TCF-002"), "A"));
    if (!auditA.notEvaluated.includes("KZC-TCF-008")) decided.add("KZC-TCF-008");
  } else if (a?.tcfResponded === true) {
    // La CMP a répondu, sans chaîne : aucun consentement anticipé. Une
    // interface muette (stub seul, CMP bloquée ou lente) ne permet pas cette
    // conclusion, et la règle reste alors non évaluée.
    decided.add("KZC-TCF-008");
  }

  // Phase C, à défaut phase A : contrôles de contenu de la chaîne.
  const contentString = stringOf(c) || stringOf(a);
  const audit = auditTcf({
    tcString: contentString,
    apiPresent,
    vendorsContacted: [],
    observedBeforeInteraction: false,
  });
  keep(
    withPhase(
      audit.findings.filter((f) => f.ruleId !== "KZC-TCF-008"),
      stringOf(c) ? "C" : "A",
    ),
  );
  for (const id of TCF_RULE_IDS) {
    if (id !== "KZC-TCF-008" && !audit.notEvaluated.includes(id)) decided.add(id);
  }

  // Phase B : le constat KZC-REFUS-006 lui-même est produit par
  // `evaluatePhases` (via `refusalFinding`). Ici, on dit seulement s'il a pu
  // être décidé, et l'on rapporte une chaîne de refus illisible.
  const undecided = new Set<string>();
  if (output.refusalClicked === true && stringOf(b) !== "") {
    if (!refusalFinding(stringOf(b)).decided) {
      undecided.add("KZC-REFUS-006");
      const auditB = auditTcf({
        tcString: stringOf(b),
        apiPresent,
        vendorsContacted: [],
        observedBeforeInteraction: false,
      });
      keep(withPhase(auditB.findings.filter((f) => f.ruleId === "KZC-TCF-002"), "B"));
      decided.add("KZC-TCF-002");
    }
  }

  // Sans aucune CMP TCF ni chaîne, la famille est sans objet pour ce site :
  // aucune règle n'est réputée satisfaite, toutes restent « non évaluées ».
  if (!tcfObserved(output.snapshots)) {
    for (const id of TCF_RULE_IDS) decided.delete(id);
  }

  for (const id of TCF_RULE_IDS) if (!decided.has(id)) undecided.add(id);

  return { findings: [...byRule.values()], undecided: [...undecided] };
}
