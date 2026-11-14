import { EDITOR } from "../disclaimer";
import { getRule } from "../rulepack";
import { STATUS_LABELS, WATCH_ENTRIES, type WatchEntry } from "../regwatch/entries";

/**
 * Flux de la veille réglementaire (RSS 2.0 et JSON Feed 1.1).
 *
 * Construits depuis `WATCH_ENTRIES`, la même source que la page /veille : un
 * abonné lit exactement ce qui est publié, statut compris. Le statut ouvre
 * chaque titre — un projet contesté ne doit jamais se lire comme un texte en
 * vigueur, même dans un lecteur de flux qui n'affiche que les titres.
 */

const BASE = EDITOR.productSite;
export const FEED_TITLE = "Konsent — Veille réglementaire cookies et RGPD";
export const FEED_DESCRIPTION =
  "Ce qui est en vigueur, ce qui n'est qu'un projet, et les règles du référentiel Konsent que chaque évolution impacte.";
export const VEILLE_URL = `${BASE}/veille`;
export const RSS_URL = `${BASE}/veille/rss.xml`;
export const JSON_FEED_URL = `${BASE}/veille/feed.json`;
/** Cache public d'une heure, côté navigateur comme côté CDN. */
export const FEED_CACHE = "public, max-age=3600, s-maxage=3600";

/** Entrées de la plus récente à la plus ancienne. */
export function feedEntries(): WatchEntry[] {
  return [...WATCH_ENTRIES].sort((a, b) => b.date.localeCompare(a.date));
}

export function entryTitle(e: WatchEntry): string {
  return `[${STATUS_LABELS[e.status]}] ${e.title}`;
}

export function entryUrl(e: WatchEntry): string {
  return `${VEILLE_URL}#${e.id}`;
}

/** Texte complet d'une entrée, en clair. */
export function entryText(e: WatchEntry): string {
  const rules = e.rules.map((id) => `${id} (${getRule(id)?.title ?? "règle"})`);
  return [
    e.summary,
    `Ce que cela change : ${e.impact}`,
    `Recommandation : ${e.action}`,
    e.horizon ? `Échéance annoncée : ${e.horizon}` : "",
    rules.length > 0 ? `Règles du référentiel concernées : ${rules.join(", ")}.` : "",
    `Source : ${e.source} — ${e.sourceUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Date de dernière mise à jour : celle de l'entrée la plus récente. */
export function lastUpdated(): Date {
  const latest = feedEntries()[0];
  return latest ? new Date(`${latest.date}T00:00:00Z`) : new Date(0);
}

function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function rssFeed(): string {
  const items = feedEntries().map((e) => {
    const pubDate = new Date(`${e.date}T00:00:00Z`).toUTCString();
    return [
      "    <item>",
      `      <title>${xml(entryTitle(e))}</title>`,
      `      <link>${xml(entryUrl(e))}</link>`,
      `      <guid isPermaLink="false">${xml(`${BASE}/veille/${e.id}`)}</guid>`,
      `      <pubDate>${pubDate}</pubDate>`,
      `      <category>${xml(STATUS_LABELS[e.status])}</category>`,
      ...e.rules.map((id) => `      <category domain="${xml(`${BASE}/regles`)}">${xml(id)}</category>`),
      `      <description>${xml(entryText(e))}</description>`,
      "    </item>",
    ].join("\n");
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${xml(FEED_TITLE)}</title>`,
    `    <link>${xml(VEILLE_URL)}</link>`,
    `    <description>${xml(FEED_DESCRIPTION)}</description>`,
    "    <language>fr-FR</language>",
    `    <copyright>${xml(`${EDITOR.legalName} (${EDITOR.tradeName})`)}</copyright>`,
    `    <lastBuildDate>${lastUpdated().toUTCString()}</lastBuildDate>`,
    "    <ttl>60</ttl>",
    `    <atom:link href="${xml(RSS_URL)}" rel="self" type="application/rss+xml"/>`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

export function jsonFeed() {
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: FEED_TITLE,
    home_page_url: VEILLE_URL,
    feed_url: JSON_FEED_URL,
    description: FEED_DESCRIPTION,
    language: "fr-FR",
    icon: `${BASE}/opengraph-image`,
    authors: [{ name: `${EDITOR.tradeName} — Konsent`, url: BASE }],
    items: feedEntries().map((e) => ({
      id: `${BASE}/veille/${e.id}`,
      url: entryUrl(e),
      external_url: e.sourceUrl,
      title: entryTitle(e),
      summary: e.summary,
      content_text: entryText(e),
      date_published: new Date(`${e.date}T00:00:00Z`).toISOString(),
      tags: [STATUS_LABELS[e.status], ...e.rules],
      language: "fr-FR",
    })),
  };
}
