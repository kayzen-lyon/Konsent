import type { MetadataRoute } from "next";
import { EDITOR } from "@/lib/disclaimer";
import { RULES } from "@/lib/rulepack";
import { TRACKERS } from "@/lib/trackers/db";
import { COOKIES } from "@/lib/seo/cookies";
import { GLOSSARY } from "@/lib/seo/glossary";
import { GUIDES } from "@/lib/seo/guides";

const BASE = EDITOR.productSite;

/**
 * Socle du référencement programmatique (§17.1) : chaque règle et chaque
 * traceur est une page à part entière, générée depuis la base — coût
 * marginal nul.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    "",
    "/fonctionnalites",
    "/comparatif",
    "/simulateur",
    "/surveillance",
    "/veille",
    "/agence",
    "/regles",
    "/traceurs",
    "/cookies",
    "/guides",
    "/glossaire",
    "/methodologie",
    "/tarifs",
    "/bot",
    "/sources",
    "/mentions-legales",
    "/confidentialite",
    "/cgu",
    "/cgv",
    "/contact",
    "/accessibilite",
    "/plan-du-site",
    "/outils",
    "/outils/decodeur-tcf",
    "/outils/generateur-bandeau",
    "/comparer",
    "/auto-evaluation",
    "/badge",
    "/analyse-en-lot",
    "/outils/generateur-mentions-legales",
    "/outils/generateur-confidentialite",
    "/outils/verificateur-preuve",
    "/outils/en-tetes-securite",
    "/outils/testeur-cookie",
    "/outils/duree-conservation",
    "/outils/reponse-droits",
    "/secteurs",
    "/secteurs/e-commerce",
    "/secteurs/sante",
    "/secteurs/collectivites-territoriales",
    "/secteurs/medias-presse",
    "/a-propos",
    "/presse",
    "/statut",
  ].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const rulePages = RULES.map((r) => ({
    url: `${BASE}/regles/${r.id.toLowerCase()}`,
    lastModified: new Date(r.lastReviewed),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const trackerPages = TRACKERS.map((t) => ({
    url: `${BASE}/traceurs/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const cookiePages = COOKIES.map((c) => ({
    url: `${BASE}/cookies/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  const guidePages = GUIDES.map((g) => ({
    url: `${BASE}/guides/${g.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const glossaryPages = GLOSSARY.map((t) => ({
    url: `${BASE}/glossaire/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: "yearly" as const,
    priority: 0.5,
  }));

  return [
    ...staticPages,
    ...rulePages,
    ...trackerPages,
    ...cookiePages,
    ...guidePages,
    ...glossaryPages,
  ];
}
