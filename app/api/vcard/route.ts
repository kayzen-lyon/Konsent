import { VCARD_FILENAME, buildVCard } from "@/lib/contact/vcard";

/**
 * Fiche de contact de l'éditeur, au format vCard.
 *
 *   GET /api/vcard
 *
 * Route interne au sens du registre : elle ne sert pas de données d'audit et
 * n'a pas de portée. Elle ne renvoie que ce que les mentions légales
 * affichent déjà publiquement — aucune donnée personnelle n'y transite, dans
 * un sens comme dans l'autre.
 *
 * Le contenu ne dépend d'aucune entrée : il est donc mis en cache longuement
 * et de façon publique. Le seul motif d'invalidation est un changement du
 * bloc d'identité, qui suppose un déploiement.
 */
export function GET() {
  const card = buildVCard();

  return new Response(card, {
    status: 200,
    headers: {
      // `charset=utf-8` est obligatoire : sans lui, plusieurs carnets
      // d'adresses interprètent le fichier en latin-1 et affichent « Soci�t� ».
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${VCARD_FILENAME}"`,
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
