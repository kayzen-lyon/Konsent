import { siteOrigin } from "@/lib/security/origin";
import { buildOpenApiDocument } from "@/lib/api/openapi";

export const dynamic = "force-dynamic";

/**
 * Description OpenAPI de l'API publique.
 *
 *   GET /api/openapi.json
 *
 * Servie depuis le registre plutôt que depuis un fichier figé : la
 * description ne peut pas décrire une route qui n'existe plus, ni taire une
 * route ajoutée. `npm run check` confronte le registre au système de
 * fichiers dans les deux sens.
 *
 * L'origine est lue sur la requête pour que le champ `servers` soit juste
 * aussi bien en local qu'en production ou en marque blanche.
 */
export async function GET(request: Request) {
  const origin = siteOrigin();

  return Response.json(buildOpenApiDocument(origin), {
    status: 200,
    headers: {
      // Publique et stable entre deux déploiements : elle se met en cache.
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
