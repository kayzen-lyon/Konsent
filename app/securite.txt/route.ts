import { EDITOR } from "@/lib/disclaimer";

/**
 * security.txt (RFC 9116) : où signaler une vulnérabilité. Un auditeur de
 * sécurité doit pouvoir nous joindre sans chercher — c'est ce que Konsent
 * attend aussi des sites qu'il analyse. La date d'expiration est recalculée
 * à chaque déploiement (un an au plus, comme l'exige la RFC).
 */
export const dynamic = "force-static";

export function GET() {
  const expires = new Date(Date.now() + 300 * 86_400_000).toISOString();
  const body = [
    `Contact: mailto:${EDITOR.email}`,
    `Expires: ${expires}`,
    "Preferred-Languages: fr, en",
    `Canonical: ${EDITOR.productSite}/.well-known/security.txt`,
    `Policy: ${EDITOR.productSite}/securite`,
    `Acknowledgments: ${EDITOR.productSite}/securite#remerciements`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
