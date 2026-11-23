import { RULES, requireRule } from "../rulepack";
import { STATIC_UNDECIDABLE_SET } from "./coverage";
import type { Evidence, Finding } from "../rulepack/types";
import { CONSENT_REQUIRED_CATEGORIES } from "../trackers/db";
import type { TrackerEntity } from "../trackers/types";
import { normalize } from "./html";
import { POLICY_SIGNALS } from "./lexicons";
import type { Observation } from "./types";

/** Petit assembleur de constats, pour éviter la répétition. */
class FindingBuilder {
  private readonly findings: Finding[] = [];

  add(ruleId: string, evidence: readonly Evidence[], occurrences?: number): void {
    if (evidence.length === 0 && (occurrences ?? 0) === 0) return;
    const rule = requireRule(ruleId);
    this.findings.push({
      ruleId: rule.id,
      severity: rule.severity,
      family: rule.family,
      title: rule.title,
      occurrences: occurrences ?? evidence.length,
      evidence,
      phase: rule.phases[0] ?? "A",
    });
  }

  build(): readonly Finding[] {
    return this.findings;
  }
}

function isConsentRequired(tracker: TrackerEntity): boolean {
  if (tracker.exemptEligible) return false;
  return tracker.categories.some((c) => CONSENT_REQUIRED_CATEGORIES.has(c));
}

function hasCategory(tracker: TrackerEntity, category: string): boolean {
  return tracker.categories.includes(category as TrackerEntity["categories"][number]);
}

interface PolicyView {
  signals: Set<string>;
  hasPrivacy: boolean;
  /**
   * true si au moins une page légale a livré assez de texte pour que
   * l'absence d'un lexique soit interprétable. Sinon, toutes les règles de
   * CONTENU documentaire sont reportées en « non évalué » plutôt que levées.
   */
  contentAssessable: boolean;
  hasLegalNotice: boolean;
  legalNoticeAssessable: boolean;
}

function policyText(obs: Observation): PolicyView {
  const signals = new Set<string>();
  let hasPrivacy = false;
  let hasLegalNotice = false;
  let contentAssessable = false;
  let legalNoticeAssessable = false;

  for (const page of obs.legalPages) {
    if (!page.reachable) continue;
    if (page.kind === "privacy") {
      hasPrivacy = true;
      if (page.substantive) contentAssessable = true;
    }
    if (page.kind === "legal") {
      hasLegalNotice = true;
      if (page.substantive) legalNoticeAssessable = true;
    }
    for (const s of page.signals ?? []) signals.add(s);
  }
  return { signals, hasPrivacy, contentAssessable, hasLegalNotice, legalNoticeAssessable };
}

/**
 * Règles dont le constat repose sur la LECTURE du contenu d'une politique.
 * Elles ne sont évaluables que si la page a livré un texte exploitable.
 */
const POLICY_CONTENT_RULES = [
  "KZC-DOC-005",
  "KZC-DOC-006",
  "KZC-DOC-007",
  "KZC-DOC-008",
  "KZC-DOC-010",
  "KZC-DOC-014",
  "KZC-DOC-015",
  "KZC-DOC-009",
  "KZC-DOC-011",
  "KZC-DOC-012",
  "KZC-DOC-013",
  "KZC-TRANSFER-007",
] as const;

/**
 * Applique le rulepack à une observation.
 *
 * Règle d'or : une règle que le moteur courant ne sait pas évaluer n'est
 * JAMAIS traitée comme satisfaite. Elle ressort dans `notEvaluated`, et le
 * rapport l'affiche (§5.4).
 */
export function evaluate(obs: Observation): {
  findings: readonly Finding[];
  notEvaluatedRuleIds: readonly string[];
} {
  const b = new FindingBuilder();

  // Les préconnexions sont tenues à l'écart des constats de chargement :
  // elles relèvent de la seule règle KZC-DEPOT-013, de faible sévérité.
  const loaded = obs.requests.filter((r) => r.origin !== "connect");
  const preconnects = obs.requests.filter((r) => r.origin === "connect");

  const trackers = [
    ...new Set(loaded.map((r) => r.tracker).filter((t): t is TrackerEntity => Boolean(t))),
  ];
  const consentRequired = trackers.filter(isConsentRequired);
  const { signals, hasPrivacy, contentAssessable, hasLegalNotice, legalNoticeAssessable } =
    policyText(obs);

  const evidenceFor = (t: TrackerEntity, note?: string): Evidence => {
    const req = loaded.find((r) => r.tracker?.slug === t.slug);
    return {
      kind: "request",
      label: `${t.name} — ${t.entity}`,
      detail: note ?? t.riskNotesFr,
      ...(req && !req.url.startsWith("inline:") ? { url: req.url } : {}),
    };
  };

  // ───────────────────────── Famille DEPOT ─────────────────────────
  const advertising = trackers.filter(
    (t) => hasCategory(t, "advertising") && !t.exemptEligible,
  );
  b.add(
    "KZC-DEPOT-004",
    advertising.map((t) => evidenceFor(t)),
  );

  const trackingScripts = loaded.filter(
    (r) => r.origin === "script" && r.tracker && isConsentRequired(r.tracker),
  );
  b.add(
    "KZC-DEPOT-005",
    trackingScripts.map((r) => ({
      kind: "request" as const,
      label: r.tracker?.name ?? r.hostname,
      detail: `Script chargé depuis ${r.hostname}`,
      url: r.url,
    })),
  );

  const pixels = loaded.filter(
    (r) => r.origin === "img" && r.tracker && hasCategory(r.tracker, "advertising"),
  );
  b.add(
    "KZC-DEPOT-006",
    pixels.map((r) => ({
      kind: "request" as const,
      label: r.tracker?.name ?? r.hostname,
      detail: "Pixel de mesure présent dans le document",
      url: r.url,
    })),
  );

  const iframes = loaded.filter(
    (r) => r.origin === "iframe" && r.tracker && !r.tracker.exemptEligible,
  );
  b.add(
    "KZC-DEPOT-008",
    iframes.map((r) => ({
      kind: "request" as const,
      label: r.tracker?.name ?? r.hostname,
      detail: r.tracker?.riskNotesFr,
      url: r.url,
    })),
  );

  const adPreconnects = preconnects.filter(
    (r) => r.tracker && hasCategory(r.tracker, "advertising"),
  );
  b.add(
    "KZC-DEPOT-013",
    adPreconnects.map((r) => ({
      kind: "dom" as const,
      label: `Préconnexion vers ${r.hostname}`,
      detail: `${r.tracker?.name} — signal de préparation de connexion, sans transmission applicative constatée.`,
    })),
  );

  const cdnFonts = trackers.filter(
    (t) => hasCategory(t, "fonts") || (hasCategory(t, "cdn") && t.effectiveJurisdiction !== "FR"),
  );
  b.add(
    "KZC-DEPOT-009",
    cdnFonts
      .filter((t) => t.adequacy !== "EEA")
      .map((t) => evidenceFor(t)),
  );

  const captcha = trackers.filter((t) => hasCategory(t, "captcha"));
  const hasForm = obs.requests.some((r) => r.origin === "form") || obs.formsInsecure.length > 0;
  if (!hasForm) {
    b.add(
      "KZC-DEPOT-010",
      captcha.map((t) =>
        evidenceFor(t, "Chargé sur une page où aucun formulaire n'a été détecté."),
      ),
    );
  }

  const replay = trackers.filter((t) => hasCategory(t, "session_replay"));
  b.add("KZC-DEPOT-011", replay.map((t) => evidenceFor(t)));

  const chat = trackers.filter((t) => hasCategory(t, "chat"));
  b.add("KZC-DEPOT-012", chat.map((t) => evidenceFor(t)));

  const gtm = trackers.find((t) => hasCategory(t, "tag_manager"));
  const marketingPresent = consentRequired.length > 0;
  if (gtm && marketingPresent && !obs.consentMode.defaultCallPresent) {
    b.add("KZC-DEPOT-014", [
      {
        kind: "note",
        label: `${gtm.name} chargé sans état de consentement préalable`,
        detail: `${consentRequired.length} service(s) soumis à consentement observés en parallèle.`,
      },
    ]);
  }

  // ───────────────────────── Famille BANNER ────────────────────────
  if (!obs.cmp.detected && consentRequired.length > 0) {
    b.add("KZC-BANNER-001", [
      {
        kind: "dom",
        label: "Aucun mécanisme de recueil du consentement identifié",
        detail: `${consentRequired.length} service(s) soumis à consentement sont pourtant présents : ${consentRequired
          .map((t) => t.name)
          .join(", ")}.`,
      },
    ]);
  }

  if (obs.cmp.detected && consentRequired.length > 0) {
    const hasWithdrawLink = obs.legalPages.some((p) => p.kind === "cookies");
    if (!hasWithdrawLink) {
      b.add("KZC-BANNER-014", [
        {
          kind: "dom",
          label: "Aucun point de retrait du consentement détecté",
          detail:
            "Aucun lien permanent de type « Gérer mes cookies » n'a été repéré dans le document.",
        },
      ]);
    }
  }

  // ──────────────────────── Famille TRANSFER ───────────────────────
  const outsideEea = trackers.filter((t) => t.adequacy !== "EEA");
  const noAdequacy = trackers.filter((t) => t.adequacy === "NONE");
  const extendedAccess = trackers.filter((t) => t.adequacy === "EXTENDED_ACCESS");
  const usConditional = trackers.filter(
    (t) => t.adequacy === "DPF_CONDITIONAL" && t.dpf?.certified !== true,
  );
  const euFrontedUsOwned = trackers.filter(
    (t) =>
      ["IE", "LU", "NL", "FR", "DE", "GB", "MT"].includes(t.hqJurisdiction) &&
      t.effectiveJurisdiction === "US",
  );

  b.add(
    "KZC-TRANSFER-001",
    outsideEea
      .filter((t) => isConsentRequired(t))
      .map((t) => ({
        kind: "request" as const,
        label: `${t.name} → ${t.effectiveJurisdiction}`,
        detail: `${t.entity} — juridiction effective : ${t.effectiveJurisdiction}.`,
      })),
  );

  b.add(
    "KZC-TRANSFER-002",
    noAdequacy.map((t) => ({
      kind: "request" as const,
      label: `${t.name} — ${t.effectiveJurisdiction}`,
      detail: t.riskNotesFr,
    })),
  );

  b.add(
    "KZC-TRANSFER-003",
    usConditional.map((t) => ({
      kind: "request" as const,
      label: `${t.name} — statut DPF non confirmé`,
      detail: `${t.entity}. À vérifier sur la liste officielle dataprivacyframework.gov.`,
    })),
  );

  b.add(
    "KZC-TRANSFER-005",
    extendedAccess.map((t) => ({
      kind: "request" as const,
      label: `${t.name} — ${t.effectiveJurisdiction}`,
      detail: t.riskNotesFr,
    })),
  );

  b.add(
    "KZC-TRANSFER-006",
    euFrontedUsOwned.map((t) => ({
      kind: "note" as const,
      label: `${t.name} — ${t.entity} (${t.hqJurisdiction})`,
      detail: `Société mère ultime : ${t.ultimateParent ?? "hors EEE"}.`,
    })),
  );

  if (outsideEea.length > 0 && contentAssessable && !signals.has("transfers")) {
    b.add("KZC-TRANSFER-007", [
      {
        kind: "page",
        label: "Aucune information sur les garanties de transfert",
        detail: `${outsideEea.length} destinataire(s) hors EEE observés ; la politique n'évoque ni clauses contractuelles types ni autre garantie.`,
      },
    ]);
  }

  // ───────────────────────── Famille VENDOR ────────────────────────
  const cookiePolicy = obs.legalPages.find((p) => p.kind === "cookies" && p.reachable);
  if (cookiePolicy && trackers.length > 0) {
    // On ne dispose pas ici du texte intégral : le constat de désynchronisation
    // n'est levé que par le moteur headless, qui compare nom à nom.
  }

  const distinctEntities = new Set(trackers.map((t) => t.entity));
  if (distinctEntities.size > 30) {
    b.add("KZC-VENDOR-007", [
      {
        kind: "note",
        label: `${distinctEntities.size} entités distinctes contactées`,
        detail: "Seuil d'alerte : 30 destinataires distincts.",
      },
    ]);
  }

  const rtb = trackers.filter((t) => hasCategory(t, "rtb"));
  b.add("KZC-VENDOR-004", rtb.map((t) => evidenceFor(t)));

  // ───────────────────────── Famille STORAGE ───────────────────────
  const cloaked = obs.dns.filter((d) => d.cloakedTracker);
  b.add(
    "KZC-STORAGE-007",
    cloaked.map((d) => ({
      kind: "dns" as const,
      label: `${d.hostname} → ${d.cnameChain.join(" → ")}`,
      detail: `Cible rattachée à ${d.cloakedTracker?.entity}.`,
    })),
  );

  // ────────────────────────── Famille CMV2 ─────────────────────────
  if (obs.consentMode.gtagPresent && !obs.consentMode.defaultCallPresent) {
    b.add("KZC-CMV2-001", [
      {
        kind: "dom",
        label: "Aucun appel gtag('consent', 'default', …) détecté",
        detail: "Les outils Google démarrent sans état de consentement déclaré.",
      },
    ]);
  }
  if (obs.consentMode.grantedByDefault.length > 0) {
    b.add(
      "KZC-CMV2-002",
      obs.consentMode.grantedByDefault.map((k) => ({
        kind: "dom" as const,
        label: `${k} : 'granted' par défaut`,
      })),
    );
  }
  if (obs.consentMode.gtagPresent && obs.consentMode.defaultCallPresent && !obs.consentMode.handlesAdUserData) {
    b.add("KZC-CMV2-003", [
      {
        kind: "dom",
        label: "ad_user_data et ad_personalization absents",
        detail: "Ces deux signaux sont attendus par Google depuis mars 2024.",
      },
    ]);
  }

  // ────────────────────────── Famille EXEMPT ───────────────────────
  const exemptTools = trackers.filter((t) => t.exemptEligible && hasCategory(t, "analytics"));
  const hostedExempt = exemptTools.filter((t) => t.adequacy !== "EEA");
  b.add(
    "KZC-EXEMPT-002",
    hostedExempt.map((t) => ({
      kind: "request" as const,
      label: `${t.name} en mode hébergé`,
      detail: `Données transmises à ${t.entity} (${t.effectiveJurisdiction}).`,
    })),
  );
  const cleanExempt = exemptTools.filter((t) => t.adequacy === "EEA");
  b.add(
    "KZC-EXEMPT-001",
    cleanExempt.map((t) => ({
      kind: "note" as const,
      label: `${t.name} — configuration potentiellement exemptée`,
      detail: t.riskNotesFr,
    })),
  );

  // ─────────────────────────── Famille DOC ─────────────────────────
  const kinds = new Set(obs.legalPages.filter((p) => p.reachable).map((p) => p.kind));
  const pageEvidence = (label: string, detail?: string): Evidence[] => [
    { kind: "page", label, ...(detail ? { detail } : {}) },
  ];

  if (!kinds.has("privacy")) {
    b.add(
      "KZC-DOC-001",
      pageEvidence(
        "Aucune politique de confidentialité atteignable",
        "Aucun lien correspondant n'a été trouvé, ou la page n'a pas répondu.",
      ),
    );
  }
  if (!kinds.has("legal")) {
    b.add("KZC-DOC-002", pageEvidence("Aucune page de mentions légales atteignable"));
  }
  if (!kinds.has("cookies") && consentRequired.length > 0) {
    b.add(
      "KZC-DOC-003",
      pageEvidence(
        "Aucune politique de gestion des cookies distincte",
        `${consentRequired.length} service(s) soumis à consentement sont pourtant présents.`,
      ),
    );
  }

  // Les règles ci-dessous lisent le CONTENU de la politique. Si la page n'a
  // livré qu'une coque rendue côté client, on s'abstient : un constat inventé
  // coûte plus cher en crédibilité qu'un constat manquant (§5.4, §20).
  if (contentAssessable) {
    if (!signals.has("controller")) {
      b.add("KZC-DOC-005", pageEvidence("Responsable de traitement non identifié dans la politique"));
    }
    if (!signals.has("dpo")) {
      b.add("KZC-DOC-006", pageEvidence("Aucun contact « protection des données » identifié"));
    }
    if (!signals.has("retention") || !signals.has("duration_precise")) {
      b.add("KZC-DOC-009", pageEvidence("Durées de conservation absentes ou non chiffrées"));
    }
    if (!signals.has("rights")) {
      b.add("KZC-DOC-012", pageEvidence("Droits des personnes non énumérés"));
    }
    if (!signals.has("cnil")) {
      b.add("KZC-DOC-013", pageEvidence("Droit de réclamation auprès de la CNIL non mentionné"));
    }
    // Détection lexicale : l'ABSENCE d'une notion dans un texte substantiel
    // est un constat fiable ; sa présence ne prouve pas la qualité de la
    // rédaction, ce que les messages de ces règles disent au lecteur.
    if (!signals.has("purposes")) {
      b.add("KZC-DOC-007", pageEvidence("Aucune finalité énoncée dans la politique"));
    }
    if (!signals.has("legal_basis_explicit")) {
      b.add(
        "KZC-DOC-008",
        pageEvidence(
          "Bases légales non nommées",
          "Ni « base légale », ni « fondement juridique », ni renvoi à l'article 6 du RGPD.",
        ),
      );
    }
    if (!signals.has("recipients")) {
      b.add(
        "KZC-DOC-010",
        pageEvidence(
          "Catégories de destinataires absentes",
          `${new Set(obs.requests.map((r) => r.tracker?.slug).filter(Boolean)).size} destinataire(s) tiers identifié(s) sur la page analysée.`,
        ),
      );
    }
    if (signals.has("rights") && !(signals.has("rights_exercise") && signals.has("contact_channel"))) {
      b.add(
        "KZC-DOC-014",
        pageEvidence(
          "Droits énumérés sans modalités d'exercice",
          "Aucune procédure (« exercer vos droits ») associée à un canal (adresse e-mail, formulaire, courrier).",
        ),
      );
    }
    if (!signals.has("dated")) {
      b.add("KZC-DOC-015", pageEvidence("Politique ni datée ni versionnée"));
    }
    if (outsideEea.length > 0 && !signals.has("transfers")) {
      b.add(
        "KZC-DOC-011",
        pageEvidence(
          "Transferts hors UE non mentionnés",
          `${outsideEea.length} destinataire(s) hors EEE observés : ${outsideEea
            .map((t) => t.name)
            .join(", ")}.`,
        ),
      );
    }
  }
  if (hasLegalNotice && legalNoticeAssessable && !signals.has("host")) {
    b.add("KZC-DOC-017", pageEvidence("Hébergeur non identifié dans les mentions légales"));
  }

  // ───────────────────────── Famille SPECIAL ───────────────────────
  if (obs.sensitiveTopics.includes("health") && advertising.length > 0) {
    b.add("KZC-SPECIAL-002", [
      {
        kind: "note",
        label: "Thématique de santé détectée avec traceurs publicitaires",
        detail: `${advertising.length} traceur(s) publicitaire(s) : ${advertising.map((t) => t.name).join(", ")}.`,
      },
    ]);
  }
  const permissiveReferrer =
    !obs.headers.referrerPolicy ||
    ["unsafe-url", "no-referrer-when-downgrade", "origin-when-cross-origin"].includes(
      obs.headers.referrerPolicy.toLowerCase(),
    );
  if (permissiveReferrer && trackers.length >= 3) {
    b.add("KZC-SPECIAL-005", [
      {
        kind: "header",
        label: `Referrer-Policy : ${obs.headers.referrerPolicy ?? "absente"}`,
        detail: `${trackers.length} destinataires tiers peuvent recevoir l'adresse complète des pages consultées.`,
      },
    ]);
  }

  // ─────────────────────────── Famille SEC ─────────────────────────
  if (!obs.headers.hsts) {
    b.add("KZC-SEC-001", [{ kind: "header", label: "Strict-Transport-Security absent" }]);
  }
  if (permissiveReferrer) {
    b.add("KZC-SEC-002", [
      { kind: "header", label: `Referrer-Policy : ${obs.headers.referrerPolicy ?? "absente"}` },
    ]);
  }
  if (!obs.headers.csp || obs.headers.csp.includes("unsafe-inline")) {
    b.add("KZC-SEC-003", [
      {
        kind: "header",
        label: obs.headers.csp ? "Content-Security-Policy permissive" : "Content-Security-Policy absente",
        ...(obs.headers.csp ? { detail: "La directive 'unsafe-inline' est présente." } : {}),
      },
    ]);
  }
  b.add(
    "KZC-SEC-004",
    obs.formsInsecure.map((action) => ({
      kind: "dom" as const,
      label: "Formulaire soumis en clair",
      detail: action,
    })),
  );
  if (!obs.headers.permissionsPolicy) {
    b.add("KZC-SEC-005", [{ kind: "header", label: "Permissions-Policy absente" }]);
  }

  const findings = b.build();

  // Toute règle que ce mode n'a pas su évaluer est déclarée telle quelle.
  // Elle n'est jamais comptée comme satisfaite.
  const raised = new Set(findings.map((f) => f.ruleId));
  const notEvaluated = new Set(
    RULES.filter(
      (r) =>
        !raised.has(r.id) &&
        // Le moteur headless n'a pas tourné : tout ce qui en dépend est inconnu.
        (r.engine === "headless" ||
          // Et parmi les règles statiques, celles que ce moteur ne sait pas
          // encore décider. Sans cette branche, elles passeraient pour
          // satisfaites — le seul défaut que le produit ne peut pas se permettre.
          STATIC_UNDECIDABLE_SET.has(r.id)),
    ).map((r) => r.id),
  );

  // Les règles de contenu documentaire rejoignent cette liste lorsque la page
  // n'a pas livré de texte exploitable — typiquement une politique rendue
  // côté client, que seul le moteur headless saura lire.
  if (!contentAssessable) {
    for (const id of POLICY_CONTENT_RULES) {
      if (!raised.has(id)) notEvaluated.add(id);
    }
  }
  if (hasLegalNotice && !legalNoticeAssessable) {
    notEvaluated.add("KZC-DOC-017");
  }

  return { findings, notEvaluatedRuleIds: [...notEvaluated] };
}

/** Utilitaire de présentation : les signaux normatifs manquants d'une politique. */
export function missingPolicySignals(obs: Observation): readonly string[] {
  const { signals } = policyText(obs);
  return POLICY_SIGNALS.filter((s) => !signals.has(s.key)).map((s) => s.label);
}

export { normalize };
