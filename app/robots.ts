import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Les pages de résultat sont propres à une requête et n'ont pas
      // vocation à être indexées.
      disallow: ["/scan", "/api/", "/documents/", "/devis"],
    },
    sitemap: "https://konsent.fr/sitemap.xml",
  };
}
