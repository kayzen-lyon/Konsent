#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { PROMPTS, RESOURCES, readResource } from "./prompts.js";
import { TOOLS } from "./tools.js";

/**
 * M13 — Serveur MCP Konsent.
 *
 * Rend l'audit appelable par un agent : une agence pilote soixante domaines
 * depuis son assistant, un DPO externalisé prépare un contrôle, un
 * développeur bloque une mise en production sur une régression.
 *
 * Aucun concurrent européen du consentement n'expose de serveur MCP. C'est le
 * seul avantage du produit qui ne se rattrape pas en recopiant une page
 * marketing.
 *
 * Contrainte non négociable (§12.5 du PRD) : chaque réponse d'outil embarque
 * l'avertissement de portée. Il n'est pas désactivable. Un agent qui relaie un
 * constat doit relayer ses limites en même temps — sans quoi le constat
 * devient, dans sa bouche, une affirmation juridique que personne n'a écrite.
 */

const BASE_URL = process.env["KONSENT_API_URL"] ?? "https://konsent-zeta.vercel.app";

const DISCLAIMER =
  "Analyse technique automatisée — résultat indicatif, non juridique. Ne constitue ni une consultation ni une certification.";

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
  { name: "konsent", version: "0.2.0" },
  { capabilities: { tools: {}, resources: {}, prompts: {} } },
);

const BY_NAME = new Map(TOOLS.map((t) => [t.name, t] as const));

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })) as never,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = BY_NAME.get(request.params.name);
  if (!tool) return fail(`Outil inconnu : ${request.params.name}`);

  try {
    const result = await tool.handler((request.params.arguments ?? {}) as Record<string, unknown>);
    return reply(result);
  } catch (error) {
    // Un échec est renvoyé comme tel, jamais masqué par une réponse vide :
    // un agent qui reçoit un objet vide conclut « rien à signaler ».
    return fail(error instanceof Error ? error.message : "Échec de l'appel.");
  }
});

/* -------------------------------------------------------------- ressources */

server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: RESOURCES as never }));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  try {
    const text = await readResource(uri);
    return { contents: [{ uri, mimeType: "application/json", text }] };
  } catch (error) {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({
            disclaimer: DISCLAIMER,
            error: error instanceof Error ? error.message : "Ressource illisible.",
          }),
        },
      ],
    };
  }
});

/* ----------------------------------------------------------------- prompts */

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: PROMPTS.map((p) => ({
    name: p.name,
    description: p.description,
    arguments: p.arguments,
  })) as never,
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const prompt = PROMPTS.find((p) => p.name === request.params.name);
  if (!prompt) throw new Error(`Prompt inconnu : ${request.params.name}`);
  return {
    description: prompt.description,
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: prompt.build((request.params.arguments ?? {}) as Record<string, string>),
        },
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write(
  `Serveur MCP Konsent démarré — ${TOOLS.length} outils, ${RESOURCES.length} ressources, ${PROMPTS.length} prompts — API : ${BASE_URL}\n`,
);
