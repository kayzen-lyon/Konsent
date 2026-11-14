import type { Observation } from "../engine/types";
import { CONSENT_REQUIRED_CATEGORIES } from "../trackers/db";
import type { TrackerEntity } from "../trackers/types";

export type ProtocolPhase = "A" | "B" | "C";

export interface PhaseSummary {
  phase: ProtocolPhase;
  label: string;
  /** false si ce mode d'analyse ne pouvait pas observer cette phase. */
  observed: boolean;
  /** Services tiers distincts appelés. */
  services: number;
  /** Dont services soumis à consentement (non exemptés). */
  consentServices: number;
  cookies: number;
  /** Cookies rattachés à un traceur soumis à consentement. */
  consentCookies: number;
}

const LABELS: Record<ProtocolPhase, string> = {
  A: "Avant tout choix",
  B: "Après refus",
  C: "Après acceptation",
};

const needsConsent = (t?: TrackerEntity) =>
  Boolean(t && !t.exemptEligible && t.categories.some((c) => CONSENT_REQUIRED_CATEGORIES.has(c)));

/**
 * Ce qui a été observé à chaque phase du protocole.
 *
 * En mode statique, seule la phase A a un sens — et encore : c'est le
 * document servi, pas un chargement en navigateur. Les phases B et C sont
 * déclarées NON OBSERVÉES plutôt que vides : zéro cookie après refus et
 * « refus jamais testé » ne disent pas du tout la même chose.
 */
export function phaseSummaries(observation: Observation): readonly PhaseSummary[] {
  const headless = observation.mode === "headless";
  return (["A", "B", "C"] as const).map((phase) => {
    const observed = headless || phase === "A";
    const requests = observation.requests.filter((r) => r.phase === phase && r.tracker);
    const cookies = observation.cookies.filter((c) => c.phase === phase);
    const services = new Map<string, TrackerEntity>();
    for (const r of requests) if (r.tracker) services.set(r.tracker.name, r.tracker);
    return {
      phase,
      label: LABELS[phase],
      observed,
      services: services.size,
      consentServices: [...services.values()].filter(needsConsent).length,
      cookies: cookies.length,
      consentCookies: cookies.filter((c) => needsConsent(c.tracker)).length,
    };
  });
}
