/**
 * Données structurées schema.org, en JSON-LD.
 *
 * Servies en ligne dans la page : la CSP n'autorise aucun script externe et
 * un bloc `application/ld+json` n'est de toute façon jamais exécuté. Le
 * contenu est produit côté serveur depuis les mêmes sources que les pages
 * (identité de l'éditeur, référentiel, FAQ), donc jamais désynchronisé.
 *
 * Les caractères `<` sont échappés pour qu'un texte ne puisse pas fermer le
 * bloc de script.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
