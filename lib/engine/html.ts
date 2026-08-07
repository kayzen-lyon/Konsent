/**
 * Extraction ciblée depuis un document HTML.
 *
 * Volontairement sans dépendance : on n'a besoin que de quelques familles
 * d'attributs, jamais d'un arbre DOM complet. Les limites de cette approche
 * sont réelles (attributs exotiques, HTML malformé) et assumées — le moteur
 * headless, lui, dispose du DOM réel.
 */

export interface ExtractedRef {
  url: string;
  kind: "script" | "iframe" | "img" | "link" | "form";
  /**
   * Valeur de l'attribut `rel`, pour les balises <link>. Permet de
   * distinguer une simple préconnexion (`preconnect`, `dns-prefetch`) d'un
   * chargement effectif de ressource : les deux n'ont pas la même portée.
   */
  rel?: string;
}

const TAG_PATTERNS: readonly { re: RegExp; kind: ExtractedRef["kind"]; attr: RegExp }[] = [
  { re: /<script\b[^>]*>/gi, kind: "script", attr: /\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i },
  { re: /<iframe\b[^>]*>/gi, kind: "iframe", attr: /\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i },
  { re: /<img\b[^>]*>/gi, kind: "img", attr: /\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i },
  { re: /<link\b[^>]*>/gi, kind: "link", attr: /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i },
  { re: /<form\b[^>]*>/gi, kind: "form", attr: /\baction\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i },
];

function attrValue(match: RegExpMatchArray): string | undefined {
  return match[2] ?? match[3] ?? match[4];
}

/** Toutes les ressources référencées par le document, résolues en absolu. */
export function extractRefs(html: string, baseUrl: string): readonly ExtractedRef[] {
  const refs: ExtractedRef[] = [];

  for (const { re, kind, attr } of TAG_PATTERNS) {
    re.lastIndex = 0;
    let tag: RegExpExecArray | null;
    while ((tag = re.exec(html)) !== null) {
      const found = tag[0].match(attr);
      if (!found) continue;
      const raw = attrValue(found);
      if (!raw || raw.startsWith("#") || raw.startsWith("data:") || raw.startsWith("javascript:")) {
        continue;
      }
      const relMatch = kind === "link" ? tag[0].match(/\brel\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i) : null;
      const rel = relMatch ? attrValue(relMatch)?.toLowerCase() : undefined;
      try {
        refs.push({ url: new URL(raw, baseUrl).toString(), kind, ...(rel ? { rel } : {}) });
      } catch {
        // Référence non résolvable : ignorée sans bruit.
      }
    }
  }
  return refs;
}

/** Concaténation du contenu des scripts inline, pour la recherche de marqueurs. */
export function extractInlineScripts(html: string): string {
  const out: string[] = [];
  const re = /<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1]) out.push(m[1]);
  }
  return out.join("\n");
}

export interface ExtractedLink {
  href: string;
  text: string;
}

/** Liens <a> avec leur libellé textuel, pour la découverte des pages légales. */
export function extractLinks(html: string, baseUrl: string): readonly ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const re = /<a\b([^>]*)>([\s\S]{0,300}?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] ?? "";
    const hrefMatch = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (!hrefMatch) continue;
    const raw = attrValue(hrefMatch);
    if (!raw || raw.startsWith("#") || raw.startsWith("javascript:") || raw.startsWith("mailto:")) {
      continue;
    }
    const text = stripTags(m[2] ?? "").trim().slice(0, 120);
    try {
      links.push({ href: new URL(raw, baseUrl).toString(), text });
    } catch {
      // Lien non résolvable : ignoré.
    }
  }
  return links;
}

export function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ");
}

/**
 * Normalisation pour comparaison lexicale : minuscules, sans signes
 * diacritiques, apostrophes et tirets typographiques ramenés à leur forme
 * ASCII. « Politique de confidentialité », « POLITIQUE DE CONFIDENTIALITE »
 * et « droit d'accès » (apostrophe courbe) doivent tous se rapprocher de
 * leur forme de référence — à défaut, on manque des lexiques pourtant
 * présents, ce qui produit des constats faussement négatifs.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/ /g, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
