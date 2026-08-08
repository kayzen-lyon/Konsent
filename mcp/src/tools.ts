/**
 * Registre des outils MCP.
 *
 * Règle d'admission, et elle n'a pas d'exception : un outil n'entre ici que
 * s'il est adossé à une capacité RÉELLE du produit. Le PRD §12.2 en liste 28 ;
 * plusieurs supposent des fonctions qui n'existent pas encore — profil
 * d'organisation, assistance AIPD, comparaison sectorielle. Les exposer
 * quand même donnerait à un agent des outils qui échouent ou, pire, qui
 * répondent quelque chose d'inventé.
 *
 * Les 28 outils ci-dessous sont donc un ensemble DIFFÉRENT de celui du PRD :
 * les manquants sont remplacés par des outils que le produit sait tenir, dont
 * plusieurs — juridictions, couverture d'analyse, décodage TCF — n'étaient pas
 * prévus et valent mieux que ce qu'ils remplacent.
 *
 * Second principe : chaque réponse porte l'avertissement de portée, et les
 * outils qui touchent à une analyse remontent ce que le moteur n'a PAS pu
 * évaluer. Un agent qui résume un rapport doit pouvoir dire « 96 règles n'ont
 * pas été vérifiées » — sans cette information, il conclura à tort.
 */

const BASE_URL = process.env["KONSENT_API_URL"] ?? "https://konsent-zeta.vercel.app";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

/* --------------------------------------------------------------- transport */

async function api(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    });
  } catch (error) {
    throw new Error(
      `Konsent injoignable a ${BASE_URL} : ${error instanceof Error ? error.message : "erreur reseau"}.`,
    );
  }

  const raw = await res.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Une page HTML au lieu du JSON attendu signifie presque toujours un point
    // d'entree absent de cette instance. « Unexpected token < » ne dit rien a
    // un agent ; il faut lui dire quoi faire, pas ce que le parseur a vu.
    throw new Error(
      res.status === 404
        ? `Le point d'entree ${path} n'existe pas sur cette instance de Konsent (${BASE_URL}). ` +
          `Verifiez KONSENT_API_URL, ou l'outil correspond a une fonction non deployee.`
        : `Reponse non-JSON du point d'entree ${path} (code ${res.status}).`,
    );
  }

  if (!res.ok || body["error"]) {
    throw new Error(String(body["error"] ?? `Requete refusee (code ${res.status}).`));
  }
  return body;
}

const scanOf = (url: string) => api(`/api/scan?url=${encodeURIComponent(String(url))}`);

function need(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Paramètre « ${key} » requis.`);
  }
  return value.trim();
}

/** Schéma d'entrée à un seul paramètre `url`, le cas le plus fréquent. */
const URL_SCHEMA = {
  type: "object",
  properties: { url: { type: "string", description: "Domaine ou URL, ex. exemple.fr" } },
  required: ["url"],
};

/* ----------------------------------------------------------------- helpers */

type Finding = { ruleId: string; severity: string; family: string; title: string; occurrences: number };

function coverageNote(scan: Record<string, unknown>): Record<string, unknown> {
  const coverage = scan["coverage"] as Record<string, unknown> | undefined;
  return {
    rulepackTotal: coverage?.["rulepackTotal"] ?? null,
    evaluated: coverage?.["evaluatedByThisMode"] ?? null,
    notEvaluatedCount: Array.isArray(coverage?.["notEvaluated"])
      ? (coverage["notEvaluated"] as unknown[]).length
      : null,
    warning:
      "Les règles non évaluées ne sont PAS satisfaites : elles n'ont pas été vérifiées. Ne les présentez jamais comme conformes.",
  };
}

/* ------------------------------------------------------------------ outils */

export const TOOLS: readonly ToolDefinition[] = [
  /* --- Analyse ---------------------------------------------------------- */
  {
    name: "konsent_scan_url",
    description:
      "Audite un site : score de conformité, écarts relevés avec leur référence normative, destinataires des données et leur juridiction. Renvoie aussi ce que le mode d'analyse n'a PAS pu évaluer.",
    inputSchema: URL_SCHEMA,
    handler: async (a) => scanOf(need(a, "url")),
  },
  {
    name: "konsent_scan_coverage",
    description:
      "Ce que l'analyse n'a pas pu vérifier, et pourquoi. À appeler avant de résumer un rapport : sans cela, un résumé laisse croire que tout a été contrôlé.",
    inputSchema: URL_SCHEMA,
    handler: async (a) => {
      const scan = await scanOf(need(a, "url"));
      const coverage = scan["coverage"] as Record<string, unknown>;
      return { hostname: scan["scan"], coverage, ...coverageNote(scan) };
    },
  },
  {
    name: "konsent_list_findings",
    description:
      "Liste les écarts d'un site, filtrables par gravité et par famille. Chaque écart porte son identifiant de règle et ses preuves.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        severity: {
          type: "string",
          enum: ["CRITICAL", "MAJOR", "MODERATE", "MINOR", "INFO"],
        },
        family: { type: "string", description: "ex. DEPOT, BANNER, TRANSFER, TCF" },
      },
      required: ["url"],
    },
    handler: async (a) => {
      const scan = await scanOf(need(a, "url"));
      let findings = (scan["findings"] ?? []) as Finding[];
      if (typeof a["severity"] === "string") {
        findings = findings.filter((f) => f.severity === a["severity"]);
      }
      if (typeof a["family"] === "string") {
        findings = findings.filter((f) => f.family === a["family"]);
      }
      return { count: findings.length, findings, ...coverageNote(scan) };
    },
  },
  {
    name: "konsent_explain_score",
    description:
      "Détaille comment le score a été obtenu : poids retirés par écart, et plafond appliqué le cas échéant. Un score plafonné ne se déduit pas de la somme des poids.",
    inputSchema: URL_SCHEMA,
    handler: async (a) => {
      const scan = await scanOf(need(a, "url"));
      const s = scan["scan"] as Record<string, unknown>;
      const findings = (scan["findings"] ?? []) as Finding[];
      return {
        score: s["score"],
        grade: s["grade"],
        gradeLabel: s["gradeLabel"],
        cappedBy: s["cappedBy"],
        cappedNote:
          s["cappedBy"]
            ? "Un plafond a été appliqué : un manquement grave empêche mécaniquement un bon score, même si tout le reste est correct."
            : "Aucun plafond appliqué.",
        bySeverity: findings.reduce<Record<string, number>>((acc, f) => {
          acc[f.severity] = (acc[f.severity] ?? 0) + 1;
          return acc;
        }, {}),
        ...coverageNote(scan),
      };
    },
  },
  {
    name: "konsent_scan_portfolio",
    description:
      "Analyse plusieurs domaines et renvoie un tableau consolidé, trié du plus exposé au moins exposé. Pour une agence qui pilote un portefeuille clients.",
    inputSchema: {
      type: "object",
      properties: {
        urls: { type: "array", items: { type: "string" }, description: "Jusqu'à 25 domaines." },
      },
      required: ["urls"],
    },
    handler: async (a) => {
      const urls = Array.isArray(a["urls"]) ? (a["urls"] as string[]).slice(0, 25) : [];
      if (urls.length === 0) throw new Error("Paramètre « urls » requis (tableau non vide).");
      const rows = await Promise.all(
        urls.map(async (u) => {
          try {
            const scan = await scanOf(u);
            const s = scan["scan"] as Record<string, unknown>;
            return {
              hostname: s["hostname"],
              score: s["score"],
              grade: s["grade"],
              findings: ((scan["findings"] ?? []) as unknown[]).length,
              ok: true,
            };
          } catch (error) {
            return { hostname: u, ok: false, error: (error as Error).message };
          }
        }),
      );
      const scored = rows.filter((r) => r.ok);
      return {
        analysed: scored.length,
        failed: rows.length - scored.length,
        portfolio: [...rows].sort((x, y) => Number(x.score ?? 999) - Number(y.score ?? 999)),
      };
    },
  },

  /* --- Référentiel ------------------------------------------------------ */
  {
    name: "konsent_list_rules",
    description:
      "Le référentiel complet : 139 règles versionnées, avec famille, gravité, poids et moteur requis. Filtrable par famille.",
    inputSchema: {
      type: "object",
      properties: { family: { type: "string" } },
    },
    handler: async (a) => {
      const pack = await api("/api/rulepack");
      let rules = (pack["rules"] ?? []) as Record<string, unknown>[];
      if (typeof a["family"] === "string") {
        rules = rules.filter((r) => r["family"] === a["family"]);
      }
      return { version: pack["version"], counts: pack["counts"], count: rules.length, rules };
    },
  },
  {
    name: "konsent_explain_rule",
    description:
      "Une règle en détail : références normatives précises, message pour dirigeant, message technique, correctif, et statut sous le projet Digital Omnibus.",
    inputSchema: {
      type: "object",
      properties: { ruleId: { type: "string", description: "ex. KZC-DEPOT-001" } },
      required: ["ruleId"],
    },
    handler: async (a) => {
      const id = need(a, "ruleId").toUpperCase();
      const pack = await api("/api/rulepack");
      const rule = ((pack["rules"] ?? []) as Record<string, unknown>[]).find((r) => r["id"] === id);
      if (!rule) throw new Error(`Règle inconnue : ${id}`);
      return { version: pack["version"], rule };
    },
  },
  {
    name: "konsent_list_families",
    description:
      "Les quatorze familles de règles et les quatre piliers de lecture du rapport. Utile pour structurer une restitution.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const pack = await api("/api/rulepack");
      return { version: pack["version"], pillars: pack["pillars"], counts: pack["counts"] };
    },
  },
  {
    name: "konsent_regwatch",
    description:
      "Veille réglementaire rattachée aux règles : ce qui est en vigueur, ce qui n'est qu'un projet, ce qui a été retiré. Ne jamais présenter un projet comme applicable.",
    inputSchema: {
      type: "object",
      properties: { ruleId: { type: "string", description: "Filtrer sur une règle." } },
    },
    handler: async (a) => {
      const query = typeof a["ruleId"] === "string" ? `?rule=${encodeURIComponent(a["ruleId"])}` : "";
      return api(`/api/regwatch${query}`);
    },
  },

  /* --- Destinataires et transferts -------------------------------------- */
  {
    name: "konsent_list_vendors",
    description:
      "Les destinataires des données d'un site : entité juridique, société mère, juridiction effective, statut d'adéquation, et ce que chacun fait — rédigé pour un dirigeant.",
    inputSchema: URL_SCHEMA,
    handler: async (a) => {
      const scan = await scanOf(need(a, "url"));
      const vendors = (scan["vendors"] ?? []) as Record<string, unknown>[];
      return { count: vendors.length, vendors };
    },
  },
  {
    name: "konsent_vendor_lookup",
    description:
      "Fiche d'un destinataire par domaine ou par nom, indépendamment de tout scan : qui l'exploite, sous quelle juridiction, avec quelles alternatives européennes.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Domaine ou nom, ex. google-analytics.com" } },
      required: ["query"],
    },
    handler: async (a) => api(`/api/vendors?q=${encodeURIComponent(need(a, "query"))}`),
  },
  {
    name: "konsent_transfer_analysis",
    description:
      "Les transferts hors Espace économique européen relevés sur un site : destinataire, juridiction effective, base d'adéquation invoquée.",
    inputSchema: URL_SCHEMA,
    handler: async (a) => {
      const scan = await scanOf(need(a, "url"));
      const vendors = (scan["vendors"] ?? []) as Record<string, unknown>[];
      const outside = vendors.filter((v) => v["effectiveJurisdiction"] !== "FR" && v["adequacy"] !== "EEA");
      return {
        outsideEeaCount: outside.length,
        transfers: outside,
        findings: ((scan["findings"] ?? []) as Finding[]).filter((f) => f.family === "TRANSFER"),
      };
    },
  },

  /* --- Mécanique du consentement ---------------------------------------- */
  {
    name: "konsent_banner_audit",
    description:
      "Ce que l'analyse relève sur le bandeau : dispositif détecté, méthode de détection, et écarts de la famille BANNER. Signale explicitement une détection non résolue plutôt que de conclure à l'absence de bandeau.",
    inputSchema: URL_SCHEMA,
    handler: async (a) => {
      const scan = await scanOf(need(a, "url"));
      return {
        cmp: scan["cmp"],
        findings: ((scan["findings"] ?? []) as Finding[]).filter((f) => f.family === "BANNER"),
        ...coverageNote(scan),
      };
    },
  },
  {
    name: "konsent_consent_mode_audit",
    description:
      "État du Consent Mode v2 de Google : présence d'un état par défaut, autorisations accordées d'office, gestion de ad_user_data et ad_personalization.",
    inputSchema: URL_SCHEMA,
    handler: async (a) => {
      const scan = await scanOf(need(a, "url"));
      return {
        findings: ((scan["findings"] ?? []) as Finding[]).filter((f) => f.family === "CMV2"),
        ...coverageNote(scan),
      };
    },
  },
  {
    name: "konsent_tcf_decode",
    description:
      "Décode une chaîne de consentement TCF v2 : finalités consenties, finalités activées en intérêt légitime, partenaires, date de recueil, restrictions éditeur. Le TCF est un cadre privé, sans valeur normative propre.",
    inputSchema: {
      type: "object",
      properties: { tcString: { type: "string", description: "Valeur du cookie euconsent-v2." } },
      required: ["tcString"],
    },
    handler: async (a) =>
      api("/api/tcf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tcString: need(a, "tcString") }),
      }),
  },
  {
    name: "konsent_legal_pages_check",
    description:
      "Présence et complétude des pages légales : politique de confidentialité, mentions légales, politique cookies. Signale les cas où la page existe mais ne livre aucun texte exploitable.",
    inputSchema: URL_SCHEMA,
    handler: async (a) => {
      const scan = await scanOf(need(a, "url"));
      return {
        legalPages: scan["legalPages"],
        findings: ((scan["findings"] ?? []) as Finding[]).filter((f) => f.family === "DOC"),
        ...coverageNote(scan),
      };
    },
  },

  /* --- Juridictions ----------------------------------------------------- */
  {
    name: "konsent_list_jurisdictions",
    description:
      "Les juridictions couvertes et leur régime de consentement. Sous un régime d'opposition (Suisse, Californie), un dépôt avant action n'est PAS un écart — ne transposez jamais un constat français tel quel.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => api("/api/juridictions"),
  },
  {
    name: "konsent_rule_applicability",
    description:
      "Dit si une règle s'applique dans une juridiction donnée, et sinon pourquoi. À utiliser avant de restituer un rapport à un client hors de France.",
    inputSchema: {
      type: "object",
      properties: {
        ruleId: { type: "string" },
        jurisdiction: { type: "string", enum: ["FR", "EU", "QC", "CA", "CH", "US_CA"] },
      },
      required: ["ruleId", "jurisdiction"],
    },
    handler: async (a) =>
      api(
        `/api/juridictions?rule=${encodeURIComponent(need(a, "ruleId"))}&code=${encodeURIComponent(need(a, "jurisdiction"))}`,
      ),
  },

  /* --- Surveillance ----------------------------------------------------- */
  {
    name: "konsent_diff_scans",
    description:
      "Compare l'état actuel d'un site à un jeton de référence antérieur : écarts apparus, aggravations, nouveaux destinataires, pages légales disparues.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        reference: { type: "string", description: "Jeton de référence obtenu lors d'une analyse antérieure." },
      },
      required: ["url", "reference"],
    },
    handler: async (a) =>
      api(
        `/api/diff?url=${encodeURIComponent(need(a, "url"))}&ref=${encodeURIComponent(need(a, "reference"))}`,
      ),
  },
  {
    name: "konsent_monitor_add",
    description:
      "Inscrit un domaine à la surveillance planifiée. La propriété du domaine doit être vérifiée : on ne surveille pas le site d'autrui.",
    inputSchema: {
      type: "object",
      properties: {
        hostname: { type: "string" },
        email: { type: "string", description: "Adresse recevant les alertes." },
        frequency: { type: "string", enum: ["daily", "weekly", "monthly"] },
      },
      required: ["hostname", "email"],
    },
    handler: async (a) =>
      api("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostname: need(a, "hostname"),
          email: need(a, "email"),
          frequency: a["frequency"] ?? "weekly",
        }),
      }),
  },
  {
    name: "konsent_monitor_status",
    description:
      "État de la surveillance d'un domaine : vérification de propriété, fréquence, prochaine échéance, dernières alertes.",
    inputSchema: {
      type: "object",
      properties: { hostname: { type: "string" } },
      required: ["hostname"],
    },
    handler: async (a) => api(`/api/monitors?hostname=${encodeURIComponent(need(a, "hostname"))}`),
  },

  /* --- Correction et commerce ------------------------------------------- */
  {
    name: "konsent_remediation_plan",
    description:
      "Plan de correction priorisé : pour chaque écart, l'effort, le caractère facturable et les étapes concrètes, avec les références normatives.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        stack: { type: "string", description: "wordpress, shopify, custom…" },
      },
      required: ["url"],
    },
    handler: async (a) => {
      const stack = typeof a["stack"] === "string" ? `&stack=${encodeURIComponent(a["stack"])}` : "";
      const data = await api(`/api/remediation?url=${encodeURIComponent(need(a, "url"))}${stack}`);
      return { hostname: data["hostname"], detectedStack: data["detectedStack"], plan: data["plan"] };
    },
  },
  {
    name: "konsent_generate_quote",
    description:
      "Devis de correction calculé depuis les écarts réellement relevés : forfait, lignes par gravité, coefficient de pile technique.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string" }, stack: { type: "string" } },
      required: ["url"],
    },
    handler: async (a) => {
      const stack = typeof a["stack"] === "string" ? `&stack=${encodeURIComponent(a["stack"])}` : "";
      const data = await api(`/api/remediation?url=${encodeURIComponent(need(a, "url"))}${stack}`);
      return { hostname: data["hostname"], quote: data["quote"] };
    },
  },
  {
    name: "konsent_risk_exposure",
    description:
      "Exposition théorique chiffrée sur le chiffre d'affaires fourni. Renvoie TOUJOURS le plafond légal ET la fourchette réellement observée en procédure simplifiée : présenter le plafond seul serait trompeur.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        revenueEur: { type: "number", description: "Chiffre d'affaires annuel en euros." },
      },
      required: ["url", "revenueEur"],
    },
    handler: async (a) => {
      // L'URL est validee EN PREMIER : un appel sans argument doit indiquer le
      // parametre le plus evident a corriger, pas le second.
      const url = need(a, "url");
      const revenue = Number(a["revenueEur"]);
      if (!Number.isFinite(revenue) || revenue < 0) {
        throw new Error("Parametre « revenueEur » requis : un nombre positif, en euros.");
      }
      const data = await api(`/api/remediation?url=${encodeURIComponent(url)}&ca=${revenue}`);
      return {
        hostname: data["hostname"],
        exposure: data["exposure"],
        note: data["exposureNote"],
        correctionCost: (data["quote"] as Record<string, unknown> | undefined)?.["total"],
      };
    },
  },

  /* --- Documents -------------------------------------------------------- */
  {
    name: "konsent_list_templates",
    description:
      "Catalogue documentaire. Distingue les gabarits ÉCRITS de ceux seulement prévus : n'appelez la génération que sur les premiers.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => api("/api/documents"),
  },
  {
    name: "konsent_generate_document",
    description:
      "Génère un document juridique depuis un scan réel. Aucun modèle de langage n'intervient : gabarits déterministes, et tout champ inconnu apparaît en clair comme [[À COMPLÉTER]] plutôt que d'être deviné.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        slug: {
          type: "string",
          description:
            "politique-cookies, politique-confidentialite, mentions-legales, registre-traitements, contrat-sous-traitance, procedure-violation, procedure-droits",
        },
      },
      required: ["url", "slug"],
    },
    handler: async (a) =>
      api(
        `/api/documents?url=${encodeURIComponent(need(a, "url"))}&slug=${encodeURIComponent(need(a, "slug"))}`,
      ),
  },
  {
    name: "konsent_build_register",
    description:
      "Registre des activités de traitement au titre de l'article 30, pré-rempli par les destinataires réellement observés. Les traitements qu'un scan ne peut pas connaître restent des canevas vides, explicitement signalés.",
    inputSchema: URL_SCHEMA,
    handler: async (a) =>
      api(`/api/documents?url=${encodeURIComponent(need(a, "url"))}&slug=registre-traitements`),
  },

  /* --- Preuve ------------------------------------------------------------ */
  {
    name: "konsent_evidence_bundle",
    description:
      "Archive de preuve d'une analyse : constats, observation brute, empreintes SHA-256 et signature Ed25519, vérifiable hors ligne. Atteste l'origine et l'intégrité, PAS la date au sens d'un horodatage qualifié.",
    inputSchema: URL_SCHEMA,
    handler: async (a) => {
      const url = need(a, "url");
      return {
        downloadUrl: `${BASE_URL}/api/evidence?url=${encodeURIComponent(url)}`,
        format: "ZIP signé",
        verification:
          "unzip puis `sha256sum -c SHA256SUMS`, puis vérification de la signature avec la clé publique incluse.",
        scope:
          "La signature atteste l'origine et l'intégrité de l'archive. Elle ne vaut pas horodatage qualifié eIDAS.",
      };
    },
  },
];
