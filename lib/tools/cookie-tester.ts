import {
  exceedsRecommendedLifetime,
  lifetimeLabel,
  matchCookieName,
  vendorOf,
  type CookieEntry,
} from "../seo/cookies";

/**
 * Testeur de cookie : extrait les NOMS d'une saisie libre et les rapproche
 * de l'index `lib/seo/cookies.ts`.
 *
 * Les valeurs ne sont jamais conservées, ni même affichées : une valeur de
 * cookie peut être un identifiant de session, et ce que l'on n'a pas lu ne
 * peut pas fuiter.
 */

export const MAX_COOKIES = 200;

/**
 * Accepte un nom seul, une liste (une par ligne), la chaîne de
 * `document.cookie` (« a=1; b=2 ») ou un en-tête « Cookie: a=1; b=2 ».
 */
export function extractCookieNames(input: string): string[] {
  const cleaned = input.replace(/^\s*cookie\s*:\s*/i, "");
  const names: string[] = [];
  const seen = new Set<string>();
  for (const token of cleaned.split(/[;\n\r]+/)) {
    const t = token.trim();
    if (!t) continue;
    const eq = t.indexOf("=");
    const name = (eq >= 0 ? t.slice(0, eq) : t).trim().replace(/^["']|["']$/g, "");
    if (!name || name.length > 200 || /\s/.test(name) || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
    if (names.length >= MAX_COOKIES) break;
  }
  return names;
}

export interface CookieIdentification {
  name: string;
  entry: CookieEntry | null;
  vendor: { slug: string; name: string; entity: string; jurisdiction: string } | null;
  lifetime: string | null;
  tooLong: boolean;
}

export function identifyCookies(input: string): CookieIdentification[] {
  return extractCookieNames(input).map((name) => {
    const entry = matchCookieName(name) ?? null;
    const tracker = entry ? vendorOf(entry) : undefined;
    return {
      name,
      entry,
      vendor: tracker
        ? {
            slug: tracker.slug,
            name: tracker.name,
            entity: tracker.entity,
            jurisdiction: tracker.effectiveJurisdiction,
          }
        : null,
      lifetime: entry ? lifetimeLabel(entry.maxLifetimeDays) : null,
      tooLong: entry ? exceedsRecommendedLifetime(entry) : false,
    };
  });
}
