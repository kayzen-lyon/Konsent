import { requireRule } from "../rulepack";
import type { Evidence, Finding } from "../rulepack/types";
import { refusalFinding } from "./evaluate-tcf";
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

  // La chaîne est DÉCODÉE : un refus correctement enregistré produit lui
  // aussi une chaîne, vide de consentement. Seul ce qui reste consenti est
  // un manquement. Une chaîne illisible est traitée par la famille TCF.
  if (cmp.tcStringAfterRefusal) {
    const refusal = refusalFinding(cmp.tcStringAfterRefusal);
    if (refusal.finding) findings.push(refusal.finding);
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

  // ── Bandeau : dark patterns mesurés au premier niveau (phase A) ──
  // Seuils repris des règles. Une mesure douteuse (bouton « accepter » non
  // reconnu comme plein, refus introuvable) laisse la règle non évaluée :
  // voir `phaseUndecided`.
  const m = cmp.bannerMetrics;
  if (m?.reject) {
    const surface = m.accept.area / Math.max(1, m.reject.area);
    if (surface > BANNER_SURFACE_RATIO) {
      add("KZC-BANNER-004", [
        {
          kind: "dom",
          label: `« ${m.accept.label} » ${round(surface)} fois plus grand que « ${m.reject.label} »`,
          detail: `Surfaces : ${m.accept.area} px² contre ${m.reject.area} px² (seuil : ${BANNER_SURFACE_RATIO}).`,
        },
      ]);
    }
    if (m.accept.filled) {
      const delta = m.accept.prominence - m.reject.prominence;
      if (delta > BANNER_CONTRAST_DELTA) {
        add("KZC-BANNER-005", [
          {
            kind: "dom",
            label: `Contraste du bouton : ${m.accept.prominence}:1 pour accepter, ${m.reject.prominence}:1 pour refuser`,
            detail: `Écart de ${round(delta)} (seuil : ${BANNER_CONTRAST_DELTA}). Le refus se distingue moins du fond du bandeau.`,
          },
        ]);
      }
      if (!m.reject.filled) {
        add("KZC-BANNER-006", [
          {
            kind: "dom",
            label: `« ${m.reject.label} » sans fond ni bordure, face à « ${m.accept.label} » en bouton plein`,
          },
        ]);
      }
    }
  }
  if (m && !m.policyLink) {
    add("KZC-BANNER-013", [
      { kind: "dom", label: "Aucun lien vers une politique cookies ou de confidentialité dans le bandeau" },
    ]);
  }
  if (m?.textContrast && m.textContrast.ratio < m.textContrast.threshold) {
    add("KZC-BANNER-021", [
      {
        kind: "dom",
        label: `Texte du bandeau à ${m.textContrast.ratio}:1 (seuil : ${m.textContrast.threshold}:1)`,
        detail: `« ${m.textContrast.sample}… »`,
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

  // ── Exemption de la mesure d'audience : durée de vie ──
  // CNIL, recommandation mesure d'audience et fiche 17 du guide RGPD du
  // développeur : un traceur exempté ne doit pas vivre plus de 13 mois.
  // Seuls les outils qui pourraient prétendre à l'exemption sont visés : les
  // autres exigent de toute façon un consentement (KZC-DEPOT-002).
  add(
    "KZC-EXEMPT-003",
    cmp.cookiesObserved
      .filter(
        (c) =>
          c.tracker?.categories.includes("analytics") &&
          c.tracker.exemptEligible &&
          c.lifetimeDays !== null &&
          c.lifetimeDays > MAX_EXEMPT_LIFETIME_DAYS,
      )
      .map((c) => ({
        kind: "cookie" as const,
        label: `${c.name} sur ${c.domain}`,
        detail: `${c.tracker?.name} — expiration à ${Math.round(c.lifetimeDays ?? 0)} jours, au-delà des 13 mois (${MAX_EXEMPT_LIFETIME_DAYS} jours) admis pour l'exemption.`,
      })),
  );

  // ── Attributs de sécurité des cookies d'identifiant ──
  // Le worker ne transmet pas les valeurs : un cookie est réputé porter un
  // identifiant ou une session si son NOM le dit. Périmètre : les cookies du
  // site lui-même, hors traceurs connus — ceux-là sont posés par le script
  // d'un tiers, dont l'éditeur ne règle pas les attributs. Les cookies de
  // session sont inclus : ce sont précisément eux que l'article 32 protège.
  // Chromium rapporte « Lax » pour un cookie posé sans SameSite (valeur par
  // défaut du navigateur) : seul `Secure` est donc établi avec certitude.
  if (cmp.https) {
    const weak = cmp.cookiesObserved.filter(
      (c) =>
        isFirstParty(c.domain, cmp.pageHost) &&
        !c.tracker &&
        IDENTIFIER_COOKIE_NAME.test(c.name) &&
        !c.secure,
    );
    add(
      "KZC-STORAGE-009",
      weak.slice(0, 20).map((c) => ({
        kind: "cookie" as const,
        label: `${c.name} sur ${c.domain}`,
        detail: `Secure : non — le navigateur l'enverrait aussi sur une connexion non chiffrée (lien en http://, redirection). SameSite effectif : ${c.sameSite || "non rapporté"}.`,
      })),
      weak.length,
    );
  }

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
  "KZC-EXEMPT-003",
  "KZC-STORAGE-009",
  "KZC-BANNER-004",
  "KZC-BANNER-005",
  "KZC-BANNER-006",
  "KZC-BANNER-013",
  "KZC-BANNER-021",
];

/** Seuils des règles bandeau (repris de leur `messageTech`). */
const BANNER_SURFACE_RATIO = 1.3;
const BANNER_CONTRAST_DELTA = 2;
const round = (n: number) => Math.round(n * 10) / 10;

/**
 * 13 mois, plafond de durée de vie d'un traceur de mesure exempté. Treize
 * mois calendaires font jusqu'à 397 jours : un outil réglé sur « 13 mois »
 * ne doit pas être signalé à tort.
 */
export const MAX_EXEMPT_LIFETIME_DAYS = 397;

/**
 * Règles du protocole que l'observation n'a pas permis de regarder. Elles
 * sortent en « non évalué » au lieu d'être réputées satisfaites.
 */
export function phaseUndecided(cmp: PhaseComparison): readonly string[] {
  const out: string[] = [];
  if (!cmp.https) out.push("KZC-STORAGE-009");
  if (!cmp.refusalClicked) out.push("KZC-REFUS-001", "KZC-REFUS-002", "KZC-REFUS-006", "KZC-FP-008");
  const m = cmp.bannerMetrics;
  if (!m) {
    out.push("KZC-BANNER-004", "KZC-BANNER-005", "KZC-BANNER-006", "KZC-BANNER-013", "KZC-BANNER-021");
  } else {
    if (!m.reject) out.push("KZC-BANNER-004", "KZC-BANNER-005", "KZC-BANNER-006");
    else if (!m.accept.filled) out.push("KZC-BANNER-005", "KZC-BANNER-006");
    if (!m.textContrast) out.push("KZC-BANNER-021");
  }
  return out;
}

/** Noms de cookies qui désignent, par convention, un identifiant ou une session. */
const IDENTIFIER_COOKIE_NAME = /(^|[_.-])(s?id|sess|session|token|uid|uuid|user|auth|visitor)([_.-]|$)/i;

/** Le cookie est-il posé sur le domaine du site (ou l'un de ses parents) ? */
function isFirstParty(cookieDomain: string, pageHost: string): boolean {
  const d = cookieDomain.replace(/^\./, "").toLowerCase();
  const host = pageHost.toLowerCase();
  const base = host.replace(/^www\./, "");
  return host === d || host.endsWith(`.${d}`) || d === base || d.endsWith(`.${base}`);
}
