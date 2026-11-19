import { organizationJsonLd, webSiteJsonLd } from "@/lib/seo/jsonld";

type Node = Record<string, unknown>;

/**
 * Données structurées schema.org, en JSON-LD.
 *
 * Servies en ligne dans la page : la CSP n'autorise aucun script externe et
 * un bloc `application/ld+json` n'est de toute façon jamais exécuté. Le
 * contenu est produit côté serveur depuis les mêmes sources que les pages
 * (identité de l'éditeur, référentiel, FAQ), donc jamais désynchronisé.
 *
 * Un seul graphe par page : l'Organization commune à l'écosystème KAYZEN et
 * le WebSite sont toujours inclus, les nœuds propres à la page s'y ajoutent.
 * Une page ne doit donc rendre qu'un seul `<JsonLd>` (le fil d'Ariane
 * accepte les nœuds de la page pour cette raison). Les doublons d'`@id` sont
 * écartés.
 *
 * Les caractères `<` sont échappés pour qu'un texte ne puisse pas fermer le
 * bloc de script.
 */
export function JsonLd({ data }: { data?: Node | Node[] }) {
  const nodes = [organizationJsonLd(), webSiteJsonLd(), ...(data ? [data].flat() : [])];
  const seen = new Set<unknown>();
  const graph = nodes
    .map((input) => {
      const node = { ...input };
      delete node["@context"];
      return node;
    })
    .filter((node) => {
      if (!node["@id"]) return true;
      if (seen.has(node["@id"])) return false;
      seen.add(node["@id"]);
      return true;
    });
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(
    /</g,
    "\\u003c",
  );
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
