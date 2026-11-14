import { DISCLAIMER_SHORT } from "../disclaimer";
import { RULEPACK_VERSION } from "../rulepack/types";
import {
  API_ACCESS_NOTE,
  API_ROUTES,
  API_VERSION,
  SCOPES,
  SCOPE_LABELS,
  type ApiRoute,
} from "./registry";

/**
 * Description OpenAPI, construite depuis le registre.
 *
 * Rien n'est saisi deux fois : ajouter une route au registre la fait
 * apparaître ici, la retirer l'en fait disparaître. Une spécification tenue à
 * la main finit toujours par décrire une API qui n'existe plus, et c'est un
 * mensonge de la même famille que ceux que ce produit relève chez les autres.
 */

function operationFor(route: ApiRoute): Record<string, unknown> {
  const operationId = `${route.method.toLowerCase()}${route.path
    .replace(/^\/api\//, "")
    .split("/")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("")}`;

  const responses: Record<string, unknown> = {
    "200": {
      description: "Requête traitée.",
      content: {
        "application/json": {
          schema: { type: "object" },
        },
      },
    },
    "400": { description: "Paramètre manquant ou invalide." },
    "429": {
      description:
        "Quota de la clé présentée atteint. Sans clé, aucun quota n'est appliqué à ce jour.",
    },
    "502": { description: "Le site analysé n'a pas répondu, ou a refusé l'analyse." },
  };

  // L'archive de preuve n'est pas du JSON : le dire évite à un intégrateur de
  // découvrir un ZIP en tentant de le désérialiser.
  if (route.path === "/api/evidence") {
    responses["200"] = {
      description: "Archive ZIP signée Ed25519.",
      content: { "application/zip": { schema: { type: "string", format: "binary" } } },
    };
  }

  return {
    operationId,
    summary: route.summary,
    description: `${route.description}\n\n${API_ACCESS_NOTE}`,
    tags: [route.path.split("/")[2] ?? "api"],
    ...(route.scope
      ? {
          // Portée INDICATIVE tant que la route est ouverte. On la déclare
          // quand même : un intégrateur qui prépare sa clé doit savoir ce
          // qu'elle devra porter, et une portée annoncée après coup casse
          // les intégrations existantes.
          security: [{ apiKey: [route.scope] }, {}],
        }
      : { security: [{}] }),
    ...(route.params
      ? {
          parameters: route.params.map((p) => ({
            name: p.name,
            in: p.in,
            required: p.required,
            description: p.description,
            schema: p.schema,
          })),
        }
      : {}),
    ...(route.requestExample
      ? {
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { type: "object" },
                example: JSON.parse(route.requestExample) as unknown,
              },
            },
          },
        }
      : {}),
    responses,
  };
}

export function buildOpenApiDocument(origin: string): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const route of API_ROUTES) {
    paths[route.path] ??= {};
    paths[route.path]![route.method.toLowerCase()] = operationFor(route);
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "API Konsent",
      version: `${API_VERSION}.0.0`,
      summary: "Audit RGPD, cookies et traceurs — auditeur indépendant de toute plateforme de consentement.",
      description: [
        "Chaque réponse embarque le champ `disclaimer`, non désactivable : un consommateur",
        "— humain ou agent — doit recevoir l'avertissement en même temps que le constat.",
        "",
        `Référentiel en vigueur : ${RULEPACK_VERSION}.`,
        "",
        "Aucune réponse n'affirme une infraction. Le produit constate un écart ; la",
        "qualification juridique relève de la CNIL ou d'un juge.",
        "",
        API_ACCESS_NOTE,
      ].join("\n"),
      contact: { name: "KAYZEN", url: `${origin}/mentions-legales` },
      license: { name: "Conditions d'utilisation", url: `${origin}/mentions-legales` },
    },
    servers: [{ url: origin, description: "Production" }],
    security: [{}],
    components: {
      securitySchemes: {
        apiKey: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "kzc_…",
          description:
            "Clé d'API en en-tête `Authorization`. Jamais en paramètre d'URL : une clé en " +
            "chaîne de requête se retrouve dans les journaux, l'historique du navigateur et " +
            "l'en-tête Referer transmis aux tiers.",
        },
      },
      schemas: {
        Disclaimer: {
          type: "string",
          description: "Avertissement joint à toute réponse.",
          example: DISCLAIMER_SHORT,
        },
      },
    },
    tags: [...new Set(API_ROUTES.map((r) => r.path.split("/")[2] ?? "api"))].map((name) => ({
      name,
    })),
    "x-scopes": Object.fromEntries(SCOPES.map((s) => [s, SCOPE_LABELS[s]])),
    paths,
  };
}
