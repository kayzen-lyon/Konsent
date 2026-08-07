import type { Finding, Phase } from "../rulepack/types";
import type { TrackerEntity } from "../trackers/types";

/**
 * Mode de scan effectivement exécuté.
 *
 *  - `static`   : sans navigateur. Déployable en serverless. Observe le
 *                 document servi, les en-têtes, le DNS et les pages légales.
 *                 Ne peut PAS constater ce qui relève de l'exécution
 *                 JavaScript ni du comportement après refus.
 *  - `headless` : protocole complet en trois phases avec Playwright.
 *
 * Le mode est affiché sans détour dans le rapport : un scan qui admet ses
 * limites est plus crédible qu'un scan qui invente (§5.4).
 */
export type EngineMode = "static" | "headless";

export interface ObservedRequest {
  url: string;
  hostname: string;
  /** Comment la ressource a été découverte dans le document. */
  origin: "script" | "iframe" | "img" | "link" | "form" | "inline" | "connect";
  tracker?: TrackerEntity;
  /** Millisecondes depuis le début du chargement, si mesurable. */
  tMs?: number;
  phase: Phase;
}

export interface ObservedCookie {
  name: string;
  domain: string;
  path: string;
  /** Durée de vie en jours ; null pour un cookie de session. */
  lifetimeDays: number | null;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  source: "http" | "js";
  tracker?: TrackerEntity;
  phase: Phase;
}

export interface CmpDetection {
  /** true si un mécanisme de recueil du consentement a été identifié. */
  detected: boolean;
  /** Nom du dispositif identifié, si reconnu. */
  name?: string;
  slug?: string;
  /**
   * Méthode ayant permis la détection. `unresolved` signifie que le moteur
   * n'a pas pu conclure : le rapport le dit, plutôt que de produire un
   * faux négatif silencieux.
   */
  method: "api_signature" | "marker" | "selector" | "heuristic" | "unresolved";
  confidence: "high" | "medium" | "low";
}

export interface LegalPage {
  kind: "privacy" | "legal" | "cookies" | "terms";
  url: string;
  label: string;
  reachable: boolean;
  /** Longueur du texte extrait, indicateur grossier de substance. */
  textLength?: number;
  /**
   * true si le texte extrait est assez fourni pour que l'absence d'un
   * lexique normatif signifie réellement quelque chose.
   *
   * Une page rendue côté client ne livre qu'une coque de quelques centaines
   * de caractères : conclure « les droits ne sont pas énumérés » à partir
   * d'une coque vide serait un faux positif. Dans ce cas, les règles de
   * contenu sont reportées en « non évalué ».
   */
  substantive?: boolean;
  /** Lexiques normatifs repérés dans la page. */
  signals?: readonly string[];
}

export interface DnsResolution {
  hostname: string;
  cnameChain: readonly string[];
  /** Entité de suivi atteinte au bout de la chaîne CNAME, le cas échéant. */
  cloakedTracker?: TrackerEntity;
}

export interface SecurityHeaders {
  hsts: string | null;
  csp: string | null;
  referrerPolicy: string | null;
  permissionsPolicy: string | null;
  xContentTypeOptions: string | null;
}

/** Ce que le moteur a réellement observé. Aucune interprétation ici. */
export interface Observation {
  url: string;
  finalUrl: string;
  hostname: string;
  mode: EngineMode;
  httpStatus: number;
  /** Durée totale de l'observation, en millisecondes. */
  durationMs: number;
  requests: readonly ObservedRequest[];
  cookies: readonly ObservedCookie[];
  cmp: CmpDetection;
  legalPages: readonly LegalPage[];
  dns: readonly DnsResolution[];
  headers: SecurityHeaders;
  /** Signaux Consent Mode relevés dans le document. */
  consentMode: {
    gtagPresent: boolean;
    defaultCallPresent: boolean;
    grantedByDefault: readonly string[];
    handlesAdUserData: boolean;
  };
  /** Indices lexicaux de thématique sensible (santé, mineurs…). */
  sensitiveTopics: readonly string[];
  formsInsecure: readonly string[];
  /** Nombre de pages effectivement analysées. */
  pagesAnalyzed: number;
}

export interface ScanResult {
  id: string;
  url: string;
  finalUrl: string;
  hostname: string;
  mode: EngineMode;
  rulepackVersion: string;
  scannedAt: string;
  durationMs: number;
  score: number;
  grade: string;
  gradeLabel: string;
  /** Plafond de score appliqué, le cas échéant (§8.1). */
  cappedBy?: string;
  findings: readonly Finding[];
  /**
   * Règles du rulepack que ce mode de scan ne peut pas évaluer.
   * Elles ne comptent jamais comme conformes.
   */
  notEvaluatedRuleIds: readonly string[];
  observation: Observation;
  /** Entités distinctes ayant reçu ou pouvant recevoir des données. */
  vendors: readonly TrackerEntity[];
  /** Destinataires dont la juridiction effective est hors EEE. */
  outsideEea: readonly TrackerEntity[];
}
