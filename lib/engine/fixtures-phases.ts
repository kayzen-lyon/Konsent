import { encodeTcStringForTests } from "../tcf/decode";
import type { BannerMetrics, WorkerOutput, WorkerSnapshot } from "./headless-adapter";

/**
 * Fixtures du protocole en trois phases.
 *
 * Les fixtures statiques partent d'une `Observation` déjà construite. Ici on
 * part volontairement plus en amont, de la **sortie brute du worker** : le
 * chemin traversé est donc celui de la production complète — rapprochement des
 * cookies avec la base des destinataires, classement des requêtes, comparaison
 * des phases, puis évaluation. Une erreur de traduction dans l'adaptateur est
 * au moins aussi probable qu'une erreur de règle, et elle serait invisible si
 * l'on partait de la comparaison déjà faite.
 *
 * Conséquence assumée : ces fixtures emploient de VRAIS traceurs (`_gcl_au`,
 * `_hjSessionUser_*`, `instagram.com`). Si une fiche disparaît de la base, la
 * fixture échoue — et c'est le comportement recherché : cela signifierait que
 * le moteur a cessé de reconnaître un traceur qu'il reconnaissait hier.
 */

const HOST = "exemple.fr";

/** Cookie persistant, tel que le worker le rapporte. */
const cookie = (name: string, domain = `.${HOST}`) => ({
  name,
  domain,
  path: "/",
  // 400 jours : au-delà du plafond de 13 mois, et surtout jamais un cookie de session.
  expires: Math.floor(Date.now() / 1000) + 400 * 86_400,
  secure: true,
  httpOnly: false,
  sameSite: "Lax",
});

const request = (url: string, resourceType = "script") => ({
  url,
  hostname: new URL(url).hostname,
  resourceType,
  tMs: 420,
});

function snapshot(phase: WorkerSnapshot["phase"], patch: Partial<WorkerSnapshot> = {}): WorkerSnapshot {
  return {
    phase,
    requests: [],
    cookies: [],
    localStorage: {},
    sessionStorage: {},
    serviceWorkers: [],
    fingerprinting: {},
    consentMode: null,
    tcString: null,
    ...patch,
  };
}

/**
 * Site témoin : bandeau symétrique, aucun traceur avant consentement, refus
 * respecté, aucune technique d'empreinte.
 *
 * Il ne doit produire AUCUN constat de phase. C'est le contrôle qui compte le
 * plus : un constat qui sort d'ici sortira chez tous les clients.
 */
export function neutralWorkerOutput(): WorkerOutput {
  return {
    url: `https://${HOST}/`,
    mode: "headless",
    scannedAt: new Date(0).toISOString(),
    bannerResolution: "API",
    refusalClicked: true,
    banner: {
      resolution: "API",
      cmpName: "Témoin",
      clicksToAccept: 1,
      clicksToReject: 1,
      hasRejectAtFirstLevel: true,
    },
    snapshots: [snapshot("A"), snapshot("B"), snapshot("C")],
  };
}

export interface PhaseFixture {
  ruleId: string;
  scenario: string;
  positive: (o: WorkerOutput) => WorkerOutput;
  negative?: (o: WorkerOutput) => WorkerOutput;
  /** Constats que le scénario implique légitimement. Mêmes règles qu'en statique. */
  alsoExpected?: readonly string[];
}

/** Remplace un instantané de phase, en laissant les deux autres intacts. */
const setPhase = (
  o: WorkerOutput,
  phase: WorkerSnapshot["phase"],
  patch: Partial<WorkerSnapshot>,
): WorkerOutput => ({
  ...o,
  snapshots: o.snapshots.map((s) => (s.phase === phase ? { ...s, ...patch } : s)),
});

const withBanner = (o: WorkerOutput, patch: Partial<WorkerOutput["banner"]>): WorkerOutput => ({
  ...o,
  banner: { ...o.banner, ...patch },
});

/** Bouton plein, bien contrasté : la référence d'un bandeau symétrique. */
const GOOD_BUTTON = { area: 6_000, prominence: 5, filled: true, label: "Tout accepter" };

/** Bandeau mesuré et conforme, corrigé par `patch`. */
const withMetrics = (o: WorkerOutput, patch: Partial<BannerMetrics>): WorkerOutput =>
  withBanner(o, {
    metrics: {
      accept: GOOD_BUTTON,
      reject: { ...GOOD_BUTTON, label: "Tout refuser" },
      policyLink: true,
      textContrast: { ratio: 9, threshold: 4.5, sample: "Nous utilisons des cookies" },
      ...patch,
    },
  });

export const PHASE_FIXTURES: readonly PhaseFixture[] = [
  /* ═══════════════ Phase A — dépôt avant toute interaction ═══════════════ */

  {
    ruleId: "KZC-DEPOT-001",
    scenario: "Un cookie publicitaire est déposé avant que le visiteur ait cliqué quoi que ce soit.",
    positive: (o) => setPhase(o, "A", { cookies: [cookie("_gcl_au")] }),
  },
  {
    ruleId: "KZC-DEPOT-002",
    scenario: "Un cookie de mesure d'audience non exemptée est déposé avant consentement.",
    positive: (o) => setPhase(o, "A", { cookies: [cookie("_hjSessionUser_1234")] }),
  },
  {
    ruleId: "KZC-DEPOT-003",
    scenario: "Un cookie de réseau social est déposé avant consentement.",
    positive: (o) => setPhase(o, "A", { cookies: [cookie("sessionid", ".instagram.com")] }),
  },

  /* ═════════════════ Phase B — le refus n'est pas respecté ═══════════════ */

  {
    ruleId: "KZC-REFUS-001",
    scenario: "Le cookie publicitaire est toujours là après un clic explicite sur le refus.",
    positive: (o) =>
      setPhase(setPhase(o, "A", { cookies: [cookie("_gcl_au")] }), "B", {
        cookies: [cookie("_gcl_au")],
      }),
    // Le même cookie présent en phase A mais ABSENT en phase B : c'est le
    // comportement correct. Sans ce négatif, un site qui respecte le refus
    // serait accusé de ne pas le respecter — le faux positif le plus grave
    // que cette famille puisse produire.
    negative: (o) => setPhase(o, "A", { cookies: [cookie("_gcl_au")] }),
    alsoExpected: ["KZC-DEPOT-001"],
  },
  {
    ruleId: "KZC-REFUS-002",
    scenario: "Des requêtes partent encore vers un régisseur publicitaire après le refus.",
    positive: (o) =>
      setPhase(o, "B", {
        requests: [request("https://www.googleadservices.com/pagead/conversion.js")],
      }),
    // Requête présente avant consentement puis disparue après refus : le site
    // fait exactement ce qu'on attend de lui.
    negative: (o) =>
      setPhase(o, "A", {
        requests: [request("https://www.googleadservices.com/pagead/conversion.js")],
      }),
  },
  {
    ruleId: "KZC-REFUS-006",
    scenario: "La chaîne de consentement relevée après le refus garde des finalités consenties.",
    positive: (o) =>
      setPhase(o, "B", {
        tcString: encodeTcStringForTests({ purposesConsent: [1, 3, 4], vendorConsents: [755] }),
      }),
    // Un refus correctement enregistré produit LUI AUSSI une chaîne, vide de
    // tout consentement. Sa seule présence ne doit rien déclencher : c'était
    // le faux positif critique de la version précédente.
    negative: (o) => setPhase(o, "B", { tcString: encodeTcStringForTests({}) }),
  },

  /* ═══════════════ Exemption et attributs des cookies ═══════════════════ */

  {
    ruleId: "KZC-EXEMPT-003",
    scenario: "Le cookie d'un outil de mesure exemptable vit 400 jours, au-delà des 13 mois.",
    positive: (o) => setPhase(o, "C", { cookies: [cookie("_pk_id.1.abcd")] }),
    // Même outil, durée conforme : 13 mois tout juste.
    negative: (o) =>
      setPhase(o, "C", {
        cookies: [{ ...cookie("_pk_id.1.abcd"), expires: Math.floor(Date.now() / 1000) + 390 * 86_400 }],
      }),
  },
  {
    ruleId: "KZC-STORAGE-009",
    scenario: "Un cookie de session du site circule sans l'attribut Secure.",
    positive: (o) =>
      setPhase(o, "C", { cookies: [{ ...cookie("app_session_id"), secure: false }] }),
    // Cookie identique, correctement protégé ; et cookie d'un tiers, que
    // l'éditeur ne règle pas.
    negative: (o) =>
      setPhase(o, "C", {
        cookies: [cookie("app_session_id"), { ...cookie("uid", ".tiers.example"), secure: false }],
      }),
  },

  /* ═══════════ Bandeau — dark patterns mesurés au premier niveau ═══════════ */

  {
    ruleId: "KZC-BANNER-004",
    scenario: "Le bouton « Tout accepter » est deux fois plus grand que « Tout refuser ».",
    positive: (o) => withMetrics(o, { reject: { ...GOOD_BUTTON, label: "Tout refuser", area: 3_000 } }),
    // Écart de 20 % : sous le seuil de 1,3, ce n'est pas une asymétrie.
    negative: (o) => withMetrics(o, { reject: { ...GOOD_BUTTON, label: "Tout refuser", area: 5_000 } }),
  },
  {
    ruleId: "KZC-BANNER-005",
    scenario: "Le refus est un bouton gris pâle, à peine distinct du fond du bandeau.",
    positive: (o) => withMetrics(o, { reject: { ...GOOD_BUTTON, label: "Tout refuser", prominence: 1.4 } }),
    // Même pâleur, mais l'accepter l'est aussi : symétrique.
    negative: (o) =>
      withMetrics(o, {
        accept: { ...GOOD_BUTTON, prominence: 1.6 },
        reject: { ...GOOD_BUTTON, label: "Tout refuser", prominence: 1.4 },
      }),
  },
  {
    ruleId: "KZC-BANNER-006",
    scenario: "Le refus est un simple lien texte face à un bouton plein.",
    positive: (o) =>
      withMetrics(o, { reject: { ...GOOD_BUTTON, label: "Continuer sans accepter", prominence: 1, filled: false } }),
    alsoExpected: ["KZC-BANNER-005"],
    // Bouton plein des deux côtés.
    negative: (o) => withMetrics(o, {}),
  },
  {
    ruleId: "KZC-BANNER-013",
    scenario: "Le bandeau ne renvoie vers aucune politique cookies ni de confidentialité.",
    positive: (o) => withMetrics(o, { policyLink: false }),
    negative: (o) => withMetrics(o, { policyLink: true }),
  },
  {
    ruleId: "KZC-BANNER-021",
    scenario: "Le texte du bandeau est gris clair sur blanc, à 2,7:1.",
    positive: (o) =>
      withMetrics(o, { textContrast: { ratio: 2.7, threshold: 4.5, sample: "Nous et nos partenaires utilisons" } }),
    // 3,5:1 suffit pour un grand texte (seuil 3:1).
    negative: (o) =>
      withMetrics(o, { textContrast: { ratio: 3.5, threshold: 3, sample: "Votre vie privée compte" } }),
  },

  /* ═══════════════════ Bandeau — symétrie du refus ═══════════════════════ */

  {
    ruleId: "KZC-BANNER-002",
    scenario: "L'acceptation est au premier niveau, le refus ne l'est pas.",
    positive: (o) =>
      withBanner(o, { hasRejectAtFirstLevel: false, clicksToAccept: 1, clicksToReject: null }),
    // Un bandeau qui propose le refus au premier niveau ne doit rien
    // déclencher, même si le chemin de refus n'a pas été résolu.
    negative: (o) => withBanner(o, { hasRejectAtFirstLevel: true, clicksToReject: null }),
  },
  {
    ruleId: "KZC-BANNER-003",
    scenario: "Accepter coûte un clic, refuser en coûte trois.",
    positive: (o) =>
      withBanner(o, { hasRejectAtFirstLevel: true, clicksToAccept: 1, clicksToReject: 3 }),
    // Coût identique : c'est la symétrie exigée. La règle porte sur l'écart,
    // pas sur le nombre de clics.
    negative: (o) =>
      withBanner(o, { hasRejectAtFirstLevel: true, clicksToAccept: 2, clicksToReject: 2 }),
  },

  /* ═══════════════════════ Stockage alternatif ═══════════════════════════ */

  {
    ruleId: "KZC-STORAGE-001",
    scenario: "Un identifiant persistant est écrit en stockage local avant consentement.",
    positive: (o) => setPhase(o, "A", { localStorage: { visitor_id: "a1b2c3d4e5f6g7h8" } }),
    // Une préférence d'interface n'est pas un identifiant. Confondre les deux
    // reprocherait à un site son sélecteur de langue.
    negative: (o) =>
      setPhase(o, "A", { localStorage: { langue: "fr", theme: "sombre", panier_ouvert: "true" } }),
  },
  {
    ruleId: "KZC-STORAGE-003",
    scenario: "Un Service Worker est enregistré avant tout accord du visiteur.",
    positive: (o) => setPhase(o, "A", { serviceWorkers: [`https://${HOST}/sw.js`] }),
  },

  /* ═══════════════════ Empreinte du terminal ═════════════════════════════ */

  {
    ruleId: "KZC-FP-001",
    scenario: "Le rendu d'un canvas est lu avant consentement.",
    positive: (o) => setPhase(o, "A", { fingerprinting: { "canvas.toDataURL": 2 } }),
  },
  {
    ruleId: "KZC-FP-002",
    scenario: "Les paramètres de la carte graphique sont interrogés à répétition.",
    positive: (o) => setPhase(o, "A", { fingerprinting: { "webgl.getParameter": 12 } }),
    // Trois lectures exactement : sous le seuil. Un site qui détecte simplement
    // la disponibilité de WebGL ne fait pas d'empreinte, et le seuil est là
    // pour cela — un débordement d'une unité serait invisible à la relecture.
    negative: (o) => setPhase(o, "A", { fingerprinting: { "webgl.getParameter": 3 } }),
  },
  {
    ruleId: "KZC-FP-006",
    scenario: "Une connexion WebRTC est ouverte sans aucun usage de communication.",
    positive: (o) => setPhase(o, "A", { fingerprinting: { "webrtc.createDataChannel": 1 } }),
  },
  {
    ruleId: "KZC-FP-007",
    scenario: "Six familles de signaux d'entropie sont collectées avant consentement.",
    positive: (o) =>
      setPhase(o, "A", {
        fingerprinting: {
          "navigator.plugins": 1,
          "navigator.mimeTypes": 1,
          "navigator.hardwareConcurrency": 1,
          "navigator.deviceMemory": 1,
          "screen.colorDepth": 1,
          "audio.createOscillator": 1,
        },
      }),
    // Cinq signaux : sous le seuil de faisceau. Isolément, chacun a des usages
    // légitimes ; c'est leur accumulation qui caractérise l'empreinte.
    negative: (o) =>
      setPhase(o, "A", {
        fingerprinting: {
          "navigator.plugins": 1,
          "navigator.mimeTypes": 1,
          "navigator.hardwareConcurrency": 1,
          "navigator.deviceMemory": 1,
          "screen.colorDepth": 1,
        },
      }),
  },
  {
    ruleId: "KZC-FP-008",
    scenario: "L'empreinte du terminal continue après le refus.",
    positive: (o) =>
      setPhase(setPhase(o, "A", { fingerprinting: { "canvas.toDataURL": 2 } }), "B", {
        fingerprinting: { "canvas.toDataURL": 2 },
      }),
    // Empreinte avant consentement, interrompue après refus : reste un constat
    // au titre de KZC-FP-001, mais pas de contournement du refus.
    negative: (o) => setPhase(o, "A", { fingerprinting: { "canvas.toDataURL": 2 } }),
    alsoExpected: ["KZC-FP-001"],
  },
];
