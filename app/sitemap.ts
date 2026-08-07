import type { MetadataRoute } from "next";
import { RULES } from "@/lib/rulepack";
import { TRACKERS } from "@/lib/trackers/db";

const BASE = "https://konsent.fr";

/**
 * Socle du référencement programmatique (§17.1) : chaque règle et chaque
 * traceur est une page à part entière, générée depuis la base — coût
 * marginal nul.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    "",
    "/regles",
    "/traceurs",
    "/methodologie",
    "/tarifs",
    "/bot",
    "/sources",
    "/mentions-legales",
    "/confidentialite",
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

  return [...staticPages, ...rulePages, ...trackerPages];
}
