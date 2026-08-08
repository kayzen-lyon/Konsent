import type { Evidence, Finding } from "../rulepack/types";
import { requireRule } from "../rulepack";
import { decodeTcString, type TcfCore } from "./decode";
import { purposeLabel, TARGETING_PURPOSES, TCF_SPECIAL_FEATURES } from "./purposes";

/**
 * Audit de la chaîne de consentement publicitaire.
 *
 * Ce que le module fait : lire ce qui a été transmis aux régies et le
 * confronter à ce que le visiteur a réellement fait.
 *
 * Ce qu'il ne fait pas : conclure à une infraction. Le TCF est un cadre privé
 * (voir l'en-tête de `decode.ts`). Chaque constat produit ici décrit un écart
 * entre la chaîne observée et la spécification, ou entre la chaîne et le
 * comportement de l'utilisateur — jamais une qualification juridique.
 */

export interface TcfContext {
  /** Chaîne relevée, généralement le cookie `euconsent-v2` ou la réponse `__tcfapi`. */
  tcString: string;
  /** `__tcfapi` est-il exposé par la page ? */
  apiPresent: boolean;
  /** Vendors TCF réellement contactés, relevés par le moteur. */
  vendorsContacted: readonly number[];
  /**
   * La chaîne a-t-elle été observée AVANT toute interaction de l'utilisateur ?
   * C'est le seul champ qui ne se déduit pas de la chaîne elle-même, et c'est
   * celui qui porte le constat le plus grave.
   */
  observedBeforeInteraction: boolean;
  /** Horodatage relatif de première émission, si mesuré. */
  tMs?: number;
  /** Version courante de la liste des vendors, pour mesurer l'obsolescence. */
  currentVendorListVersion?: number;
  /** Identifiants de CMP enregistrés connus. Vide = contrôle non exécuté. */
  registeredCmpIds?: readonly number[];
}

function finding(ruleId: string, evidence: readonly Evidence[], occurrences = 1): Finding {
  const rule = requireRule(ruleId);
  return {
    ruleId: rule.id,
    severity: rule.severity,
    family: rule.family,
    title: rule.title,
    occurrences,
    evidence,
    phase: "A",
  };
}

export interface TcfAuditResult {
  findings: readonly Finding[];
  core?: TcfCore;
  /** Règles que ce contexte n'a pas permis de décider. */
  notEvaluated: readonly string[];
}

export function auditTcf(ctx: TcfContext): TcfAuditResult {
  const findings: Finding[] = [];
  const notEvaluated = new Set<string>([
    "KZC-TCF-001",
    "KZC-TCF-002",
    "KZC-TCF-003",
    "KZC-TCF-004",
    "KZC-TCF-005",
    "KZC-TCF-006",
    "KZC-TCF-007",
    "KZC-TCF-008",
  ]);
  const decide = (id: string) => notEvaluated.delete(id);

  // KZC-TCF-001 — des vendors TCF sont sollicités sans interface exposée.
  decide("KZC-TCF-001");
  if (!ctx.apiPresent && ctx.vendorsContacted.length > 0) {
    findings.push(
      finding("KZC-TCF-001", [
        {
          kind: "note",
          label: "`window.__tcfapi` absent",
          detail: `${ctx.vendorsContacted.length} partenaire(s) du cadre publicitaire pourtant contacté(s).`,
        },
      ]),
    );
  }

  if (ctx.tcString.trim() === "") {
    // Sans chaîne, tout le reste est indécidable. On le dit plutôt que de
    // conclure à l'absence de manquement.
    return { findings, notEvaluated: [...notEvaluated] };
  }

  const decoded = decodeTcString(ctx.tcString);

  // KZC-TCF-002 — chaîne illisible.
  decide("KZC-TCF-002");
  if (!decoded.ok) {
    findings.push(
      finding("KZC-TCF-002", [
        {
          kind: "note",
          label: "Chaîne de consentement non décodable",
          detail: decoded.reason,
        },
      ]),
    );
    return { findings, notEvaluated: [...notEvaluated] };
  }

  const core = decoded.core;

  // KZC-TCF-008 — consentement transmis avant toute action.
  decide("KZC-TCF-008");
  if (ctx.observedBeforeInteraction && core.purposesConsent.length > 0) {
    findings.push(
      finding("KZC-TCF-008", [
        {
          kind: "note",
          label: `${core.purposesConsent.length} finalité(s) marquée(s) comme acceptées avant toute action`,
          detail: core.purposesConsent.map(purposeLabel).join(" · "),
          ...(ctx.tMs === undefined ? {} : { tMs: ctx.tMs }),
        },
        { kind: "note", label: "Chaîne créée le", detail: core.created },
      ]),
    );
  }

  // KZC-TCF-006 — intérêt légitime invoqué pour du ciblage.
  decide("KZC-TCF-006");
  const abusiveLi = core.purposesLegitimateInterest.filter((p) => TARGETING_PURPOSES.includes(p));
  if (abusiveLi.length > 0) {
    findings.push(
      finding(
        "KZC-TCF-006",
        abusiveLi.map((p) => ({
          kind: "note" as const,
          label: `Finalité ${p} portée en intérêt légitime`,
          detail: purposeLabel(p),
        })),
        abusiveLi.length,
      ),
    );
  }

  // KZC-TCF-007 — aucune restriction éditeur.
  decide("KZC-TCF-007");
  if (core.publisherRestrictions.length === 0) {
    findings.push(
      finding("KZC-TCF-007", [
        {
          kind: "note",
          label: "Aucune restriction éditeur déclarée",
          detail:
            "Chaque partenaire applique donc sa propre lecture des finalités, sans encadrement de votre part.",
        },
      ]),
    );
  }

  // KZC-TCF-005 — vendors contactés hors chaîne.
  if (ctx.vendorsContacted.length > 0) {
    decide("KZC-TCF-005");
    const declared = new Set([...core.vendorConsents, ...core.vendorLegitimateInterests]);
    const extra = ctx.vendorsContacted.filter((v) => !declared.has(v));
    if (extra.length > 0) {
      findings.push(
        finding(
          "KZC-TCF-005",
          extra.slice(0, 20).map((v) => ({
            kind: "note" as const,
            label: `Partenaire ${v} contacté hors du consentement transmis`,
          })),
          extra.length,
        ),
      );
    }
  }

  // KZC-TCF-004 — liste des vendors obsolète.
  if (ctx.currentVendorListVersion !== undefined) {
    decide("KZC-TCF-004");
    const lag = ctx.currentVendorListVersion - core.vendorListVersion;
    // La GVL est publiée environ une fois par semaine : un écart de plus de
    // quatre versions vaut grossièrement plus de trente jours de retard.
    if (lag > 4) {
      findings.push(
        finding("KZC-TCF-004", [
          {
            kind: "note",
            label: `Liste des partenaires en version ${core.vendorListVersion}`,
            detail: `Version courante : ${ctx.currentVendorListVersion}, soit ${lag} versions de retard.`,
          },
        ]),
      );
    }
  }

  // KZC-TCF-003 — identifiant de CMP non enregistré.
  if (ctx.registeredCmpIds && ctx.registeredCmpIds.length > 0) {
    decide("KZC-TCF-003");
    if (!ctx.registeredCmpIds.includes(core.cmpId)) {
      findings.push(
        finding("KZC-TCF-003", [
          {
            kind: "note",
            label: `Identifiant de CMP ${core.cmpId} absent du registre`,
          },
        ]),
      );
    }
  }

  return { findings, core, notEvaluated: [...notEvaluated] };
}

/** Résumé lisible d'une chaîne, pour l'affichage et pour l'outil MCP. */
export function summarizeTcf(core: TcfCore): {
  cmpId: number;
  created: string;
  purposesConsent: readonly { id: number; label: string }[];
  purposesLegitimateInterest: readonly { id: number; label: string }[];
  specialFeatures: readonly string[];
  vendorConsentCount: number;
  vendorLegitimateInterestCount: number;
  publisherRestrictionCount: number;
} {
  return {
    cmpId: core.cmpId,
    created: core.created,
    purposesConsent: core.purposesConsent.map((id) => ({ id, label: purposeLabel(id) })),
    purposesLegitimateInterest: core.purposesLegitimateInterest.map((id) => ({
      id,
      label: purposeLabel(id),
    })),
    specialFeatures: core.specialFeatureOptIns.map(
      (id) => TCF_SPECIAL_FEATURES.find((f) => f.id === id)?.plain ?? `Fonctionnalité ${id}`,
    ),
    vendorConsentCount: core.vendorConsents.length,
    vendorLegitimateInterestCount: core.vendorLegitimateInterests.length,
    publisherRestrictionCount: core.publisherRestrictions.length,
  };
}
