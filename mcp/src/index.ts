#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * M13 — Serveur MCP Konsent.
 *
 * Rend l'audit appelable par un agent : une agence pilote soixante domaines
 * depuis son assistant, un DPO externalisé prépare un contrôle, un
 * développeur bloque une mise en production sur une régression.
 *
 * Contrainte non négociable (§12.5 du PRD) : chaque réponse d'outil embarque
 * l'avertissement. Il n'est pas désactivable. Un agent qui relaie un constat
 * doit relayer sa portée en même temps.
 */

const BASE_URL = process.env["KONSENT_API_URL"] ?? "https://konsent-zeta.vercel.app";

const DISCLAIMER =
  "Analyse technique automatisée — résultat indicatif, non juridique. Ne constitue ni une consultation ni une certification.";

interface ApiScan {
  scan: {
    hostname: string;
    score: number;
    grade: string;
    gradeLabel: string;
    cappedBy: string | null;
    rulepackVersion: string;
    scannedAt: string;
    mode: string;
    durationMs: number;
  };
  findings: {
    ruleId: string;
    severity: string;
    family: string;
    title: string;
    occurrences: number;
    evidence: { label: string; detail?: string; url?: string }[];
  }[];
  vendors: {
    slug: string;
    name: string;
    entity: string;
    ultimateParent: string | null;
    effectiveJurisdiction: string;
    adequacy: string;
    purposeFr: string;
    riskNotesFr: string;
  }[];
  coverage: { rulepackTotal: number; evaluatedByThisMode: number; notEvaluated: string[]; note: string };
  cmp: { detected: boolean; name?: string; method: string; confidence: string };
  legalPages: { kind: string; url: string; reachable: boolean }[];
}

async function fetchScan(url: string): Promise<ApiScan> {
  const endpoint = `${BASE_URL}/api/scan?url=${encodeURIComponent(url)}`;
  const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
  const body = (await res.json()) as ApiScan & { error?: string };
  if (!res.ok || body.error) {
    throw new Error(body.error ?? `L'analyse a échoué (code ${res.status}).`);
  }
  return body;
}

/** Toute sortie d'outil passe par ici : l'avertissement ne peut pas être omis. */
function reply(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ disclaimer: DISCLAIMER, ...(payload as object) }, null, 2),
      },
    ],
  };
}

function fail(message: string) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ disclaimer: DISCLAIMER, error: message }, null, 2),
      },
    ],
  };
}

const server = new Server(
  { name: "konsent", version: "0.1.0" },
  { capabilities: { tools: {}, resources: {} } },
);

const TOOLS = [
  {
    name: "konsent_scan_url",
    description:
      "Audite un site : score de conformité, écarts relevés avec leur référence normative, destinataires des données et leur juridiction. Renvoie aussi la liste des règles que le mode d'analyse n'a PAS pu évaluer — elles ne doivent jamais être présentées comme satisfaites.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Domaine ou URL à analyser, ex. exemple.fr" },
      },
      required: ["url"],
    },
  },
  {
    name: "konsent_list_findings",
    description:
      "Liste les écarts d'un site, filtrables par gravité. Chaque écart porte son identifiant de règle et sa preuve.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        severity: {
          type: "string",
          enum: ["CRITICAL", "MAJOR", "MODERATE", "MINOR", "INFO"],
          description: "Ne retenir que cette gravité.",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "konsent_list_vendors",
    description:
      "Liste les destinataires des données d'un site : entreprise contractante, société mère ultime, juridiction effective et statut d'adéquation.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
    },
  },
  {
    name: "konsent_transfer_analysis",
    description:
      "Analyse des transferts hors Espace économique européen pour un site : qui reçoit quoi, sous quelle juridiction, avec quel statut d'adéquation.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
    },
  },
  {
    name: "konsent_scan_portfolio",
    description:
      "Audite plusieurs domaines et renvoie une synthèse triée par score croissant. Conçu pour une agence pilotant un portefeuille de clients.",
    inputSchema: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          description: "Domaines à analyser, huit au maximum.",
        },
      },
      required: ["urls"],
    },
  },
  {
    name: "konsent_check_regression",
    description:
      "Compare deux analyses successives d'un même domaine pour détecter les régressions. Nécessite un jeton de référence obtenu lors d'un audit antérieur.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        baseline_token: { type: "string", description: "Jeton de référence." },
      },
      required: ["url", "baseline_token"],
    },
  },
] as const;

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS as never }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const input = (args ?? {}) as Record<string, unknown>;

  try {
    switch (name) {
      case "konsent_scan_url": {
        const data = await fetchScan(String(input["url"]));
        return reply({
          scan: data.scan,
          cmp: data.cmp,
          findingCount: data.findings.length,
          criticalCount: data.findings.filter((f) => f.severity === "CRITICAL").length,
          findings: data.findings,
          vendors: data.vendors,
          coverage: data.coverage,
        });
      }

      case "konsent_list_findings": {
        const data = await fetchScan(String(input["url"]));
        const severity = input["severity"] ? String(input["severity"]) : null;
        const findings = severity
          ? data.findings.filter((f) => f.severity === severity)
          : data.findings;
        return reply({
          hostname: data.scan.hostname,
          count: findings.length,
          findings,
          coverage: data.coverage,
        });
      }

      case "konsent_list_vendors": {
        const data = await fetchScan(String(input["url"]));
        return reply({ hostname: data.scan.hostname, vendors: data.vendors });
      }

      case "konsent_transfer_analysis": {
        const data = await fetchScan(String(input["url"]));
        const outside = data.vendors.filter((v) => v.adequacy !== "EEA");
        return reply({
          hostname: data.scan.hostname,
          outsideEeaCount: outside.length,
          byJurisdiction: outside.reduce<Record<string, string[]>>((acc, v) => {
            (acc[v.effectiveJurisdiction] ??= []).push(v.name);
            return acc;
          }, {}),
          vendors: outside,
          note: "Le statut d'adéquation est un instantané daté. Il doit être reverifié à sa source officielle avant toute conclusion juridique.",
        });
      }

      case "konsent_scan_portfolio": {
        const urls = (input["urls"] as string[] | undefined) ?? [];
        if (urls.length === 0) return fail("Aucun domaine fourni.");

        const results = await Promise.all(
          urls.slice(0, 8).map(async (url) => {
            try {
              const data = await fetchScan(url);
              return {
                url,
                hostname: data.scan.hostname,
                score: data.scan.score,
                grade: data.scan.grade,
                findingCount: data.findings.length,
                criticalCount: data.findings.filter((f) => f.severity === "CRITICAL").length,
                outsideEeaCount: data.vendors.filter((v) => v.adequacy !== "EEA").length,
              };
            } catch (error) {
              return { url, error: error instanceof Error ? error.message : "échec" };
            }
          }),
        );

        const scored = results.filter(
          (r): r is Extract<typeof r, { score: number }> => "score" in r,
        );
        scored.sort((a, b) => a.score - b.score);

        return reply({
          analysed: scored.length,
          failed: results.length - scored.length,
          averageScore:
            scored.length > 0
              ? Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length)
              : null,
          results,
          note: "Domaines triés par score croissant : les plus exposés en premier.",
        });
      }

      case "konsent_check_regression": {
        const url = String(input["url"]);
        const token = String(input["baseline_token"]);
        const endpoint = `${BASE_URL}/api/diff?url=${encodeURIComponent(url)}&ref=${encodeURIComponent(token)}`;
        const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
        const body = (await res.json()) as Record<string, unknown> & { error?: string };
        if (!res.ok || body.error) return fail(String(body.error ?? `Échec (code ${res.status}).`));
        return reply(body);
      }

      default:
        return fail(`Outil inconnu : ${name}`);
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erreur inattendue.");
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "konsent://rulepack",
      name: "Référentiel de règles",
      description: "Les règles d'analyse, avec leur référence normative et leur statut Omnibus.",
      mimeType: "application/json",
    },
    {
      uri: "konsent://regwatch",
      name: "Veille réglementaire",
      description: "Textes applicables, projets non adoptés et jurisprudence.",
      mimeType: "application/json",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const path = uri === "konsent://rulepack" ? "/api/rulepack" : "/api/regwatch";

  const res = await fetch(`${BASE_URL}${path}`, { headers: { Accept: "application/json" } });
  const text = await res.text();

  return { contents: [{ uri, mimeType: "application/json", text }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write(`Serveur MCP Konsent démarré — API : ${BASE_URL}\n`);
