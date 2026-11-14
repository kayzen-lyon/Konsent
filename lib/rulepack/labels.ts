import type { Severity } from "./types";

/** Libellés de gravité. Module léger : importable côté client sans le référentiel. */
export const SEVERITY_LABELS: Record<Severity, string> = {
  CRITICAL: "Critique",
  MAJOR: "Majeur",
  MODERATE: "Modéré",
  MINOR: "Mineur",
  INFO: "Information",
};
