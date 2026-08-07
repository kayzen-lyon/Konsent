import { requireRule } from "../rulepack";
import type { Evidence, Finding } from "../rulepack/types";
import type { PhaseComparison } from "./headless-adapter";

/**
 * Constats propres au protocole en trois phases.
 *
 * Ces règles sont la raison d'être du worker navigateur : elles ne se lisent
 * pas dans un instantané, mais dans l'ÉCART entre trois moments. Aucune
 * analyse statique ne peut les produire, et c'est pourquoi elles étaient
 * jusqu'ici reportées en « non évalué ».
 */
export function evaluatePhases(cmp: PhaseComparison): readonly Finding[] {
  const findings: Finding[] = [];

  const add = (ruleId: string, evidence: readonly Evidence[], occurrences?: number) => {
    if (evidence.length === 0 && (occurrences ?? 0) === 0) return;
    const rule = requireRule(ruleId);
    findings.push({
      ruleId: rule.id,
      severity: rule.severity,
      family: rule.family,
      title: rule.title,
      occurrences: occurrences ?? evidence.length,
      evidence,
      phase: rule.phases[0] ?? "A",
    });
  };

  // ── Phase A : dépôt avant consentement ──
  const advertisingCookies = cmp.cookiesBeforeConsent.filter((c) =>
    c.tracker?.categories.some((k) => k === "advertising" || k === "rtb"),
  );
  add(
    "KZC-DEPOT-001",
    advertisingCookies.map((c) => ({
      kind: "cookie" as const,
      label: `${c.name} sur ${c.domain}`,
      detail: `${c.tracker?.name} — durée ${c.lifetimeDays === null ? "session" : `${c.lifetimeDays} jours`}. Déposé sans aucune interaction du visiteur.`,
    })),
  );

  const analyticsCookies = cmp.cookiesBeforeConsent.filter(
    (c) => c.tracker?.categories.includes("analytics") && !c.tracker.exemptEligible,
  );
  add(
    "KZC-DEPOT-002",
    analyticsCookies.map((c) => ({
      kind: "cookie" as const,
      label: `${c.name} sur ${c.domain}`,
      detail: `${c.tracker?.name} — conditions de l'exemption non réunies.`,
    })),
  );

  const socialCookies = cmp.cookiesBeforeConsent.filter((c) =>
    c.tracker?.categories.includes("social"),
  );
  add(
    "KZC-DEPOT-003",
    socialCookies.map((c) => ({
      kind: "cookie" as const,
      label: `${c.name} sur ${c.domain}`,
      detail: c.tracker?.name,
    })),
  );

  // ── Phase B : le refus n'est pas respecté ──
  add(
    "KZC-REFUS-001",
    cmp.cookiesAfterRefusal.map((c) => ({
      kind: "cookie" as const,
      label: `${c.name} sur ${c.domain}`,
      detail: `${c.tracker?.name} — toujours présent après un clic explicite sur le refus.`,
    })),
  );

  add(
    "KZC-REFUS-002",
    cmp.survivingRefusal.map((t) => ({
      kind: "request" as const,
      label: `${t.name} — ${t.entity}`,
      detail: "Des requêtes continuent d'être émises vers ce destinataire après le refus.",
    })),
  );

  if (cmp.tcStringAfterRefusal) {
    add("KZC-REFUS-006", [
      {
        kind: "note",
        label: "Chaîne de consentement transmise après refus",
        detail: `TCString présent en phase B : ${cmp.tcStringAfterRefusal.slice(0, 40)}…. Son contenu doit refléter le refus exprimé.`,
      },
    ]);
  }

  // ── Bandeau : symétrie du refus ──
  if (!cmp.rejectAtFirstLevel && cmp.clicksToAccept !== null) {
    add("KZC-BANNER-002", [
      {
        kind: "dom",
        label: "Aucun bouton de refus au premier niveau",
        detail:
          "Le visiteur peut accepter en un clic, mais doit passer par un panneau de réglages pour refuser.",
      },
    ]);
  }

  if (
    cmp.clicksToReject !== null &&
    cmp.clicksToAccept !== null &&
    cmp.clicksToReject > cmp.clicksToAccept
  ) {
    add("KZC-BANNER-003", [
      {
        kind: "dom",
        label: `Accepter : ${cmp.clicksToAccept} clic(s) — Refuser : ${cmp.clicksToReject} clic(s)`,
        detail:
          "Cette asymétrie est un procédé identifié par le régulateur : elle décourage le refus sans l'interdire formellement.",
      },
    ]);
  }

  // ── Stockage alternatif ──
  add(
    "KZC-STORAGE-001",
    cmp.storageIdentifiersBeforeConsent.map((key) => ({
      kind: "dom" as const,
      label: `localStorage["${key}"]`,
      detail:
        "Valeur à forte entropie écrite avant toute interaction. Le stockage local relève du même régime que les cookies.",
    })),
  );

  add(
    "KZC-STORAGE-003",
    cmp.serviceWorkersBeforeConsent.map((scope) => ({
      kind: "dom" as const,
      label: `Service Worker enregistré sur ${scope}`,
      detail: "Composant persistant installé avant tout accord du visiteur.",
    })),
  );

  // ── Empreinte du terminal ──
  const fpBefore = cmp.fingerprintingBeforeConsent;
  const canvasCalls = (fpBefore["canvas.toDataURL"] ?? 0) + (fpBefore["canvas.getImageData"] ?? 0);
  if (canvasCalls > 0) {
    add("KZC-FP-001", [
      {
        kind: "note",
        label: `${canvasCalls} appel(s) aux API de rendu graphique`,
        detail:
          "Lecture du rendu d'un canvas avant tout consentement : technique caractéristique de l'empreinte du terminal.",
      },
    ]);
  }

  if ((fpBefore["webgl.getParameter"] ?? 0) > 3) {
    add("KZC-FP-002", [
      {
        kind: "note",
        label: `${fpBefore["webgl.getParameter"]} lectures de paramètres WebGL`,
        detail: "Interrogation répétée des caractéristiques de la carte graphique.",
      },
    ]);
  }

  if ((fpBefore["webrtc.createDataChannel"] ?? 0) > 0) {
    add("KZC-FP-006", [
      {
        kind: "note",
        label: "RTCPeerConnection instanciée sans usage de communication",
        detail: "Technique employée pour révéler l'adresse réseau locale du visiteur.",
      },
    ]);
  }

  const distinctSignals = Object.keys(fpBefore).length;
  if (distinctSignals >= 6) {
    add("KZC-FP-007", [
      {
        kind: "note",
        label: `${distinctSignals} familles de signaux d'entropie collectées`,
        detail: `Signaux relevés : ${Object.keys(fpBefore).join(", ")}.`,
      },
    ]);
  }

  // Empreinte maintenue après refus : contournement caractérisé.
  const fpAfter = cmp.fingerprintingAfterRefusal;
  const persistedSignals = Object.keys(fpAfter).filter((k) => (fpAfter[k] ?? 0) > 0);
  if (persistedSignals.length > 0 && Object.keys(fpBefore).length > 0) {
    add("KZC-FP-008", [
      {
        kind: "note",
        label: `${persistedSignals.length} technique(s) d'empreinte toujours actives après refus`,
        detail: `Signaux persistants : ${persistedSignals.join(", ")}. Le refus n'interrompt pas l'identification.`,
      },
    ]);
  }

  return findings;
}

/** Règles couvertes par le protocole en trois phases. */
export const PHASE_RULE_IDS: readonly string[] = [
  "KZC-DEPOT-001",
  "KZC-DEPOT-002",
  "KZC-DEPOT-003",
  "KZC-REFUS-001",
  "KZC-REFUS-002",
  "KZC-REFUS-006",
  "KZC-BANNER-002",
  "KZC-BANNER-003",
  "KZC-STORAGE-001",
  "KZC-STORAGE-003",
  "KZC-FP-001",
  "KZC-FP-002",
  "KZC-FP-006",
  "KZC-FP-007",
  "KZC-FP-008",
];
