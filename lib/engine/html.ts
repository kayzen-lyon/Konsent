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

/**
 * Décodage des références de caractères numériques, décimales et
 * HEXADÉCIMALES.
 *
 * L'oubli de la forme hexadécimale a coûté cher : React encode les apostrophes
 * en `&#x27;`, si bien que « droit d'accès » arrivait au lexique sous la forme
 * « droit d&#x27;acces » et n'y correspondait jamais. Conséquence, tout site
 * rendu par React — une part considérable du web — se voyait reprocher de ne
 * pas énumérer les droits des personnes alors qu'il le faisait.
 *
 * C'est exactement le faux positif décrédibilisant que le §20 classe en
 * risque n°1, et il visait la majorité du marché.
 */
/**
 * Entités nommées courantes, accents francais compris.
 *
 * Beaucoup de gestionnaires de contenu produisent `&eacute;` plutot que le
 * caractere. Sans cette table, « duree de conservation » arrive au lexique
 * sous la forme « dur&eacute;e » et n'y correspond pas : le site se voit
 * reprocher de ne pas indiquer ses durees alors qu'il les indique.
 */
const NAMED_ENTITIES: Record<string, string> = {
  agrave: "a", aacute: "a", acirc: "a", auml: "a", atilde: "a", aring: "a", aelig: "ae",
  egrave: "e", eacute: "e", ecirc: "e", euml: "e",
  igrave: "i", iacute: "i", icirc: "i", iuml: "i",
  ograve: "o", oacute: "o", ocirc: "o", ouml: "o", otilde: "o", oslash: "o", oelig: "oe",
  ugrave: "u", uacute: "u", ucirc: "u", uuml: "u",
  ccedil: "c", ntilde: "n", yacute: "y", yuml: "y",
  laquo: '"', raquo: '"', ldquo: '"', rdquo: '"', lsquo: "'", rsquo: "'",
  rsquor: "'", sbquo: "'", bdquo: '"',
  ndash: "-", mdash: "-", hellip: "...", middot: "-", bull: "-",
  euro: "EUR", copy: "(c)", reg: "(r)", trade: "(tm)", deg: "deg",
  eur: "EUR", sect: "art.", para: "par.",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name: string) => {
      const lower = name.toLowerCase();
      // Les entités structurelles sont traitées plus bas, dans l'ordre voulu.
      if (["amp", "lt", "gt", "quot", "apos", "nbsp"].includes(lower)) return match;
      return NAMED_ENTITIES[lower] ?? match;
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    // `&amp;` en dernier : le décoder avant transformerait `&amp;#x27;` en
    // apostrophe, alors que le texte d'origine affichait « &#x27; ».
    .replace(/&amp;/gi, "&");
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return " ";
  try {
    return String.fromCodePoint(code);
  } catch {
    return " ";
  }
}

export function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ");
}

/**
 * Ne conserve que la STRUCTURE d'un document : balises, attributs, scripts —
 * et jette tout le texte visible.
 *
 * Sert à chercher la trace d'un service tiers. Chercher « Cookiebot » dans le
 * HTML entier revient à signaler comme utilisatrice d'une plateforme de
 * consentement toute page qui en parle : un article de blog, un comparatif,
 * la documentation d'un cabinet d'avocats. Konsent se détectait ainsi
 * lui-même comme utilisant Cookiebot, Didomi et OneTrust, sur un site qui ne
 * charge aucun script tiers.
 */
export function structureOnly(html: string): string {
  return html.replace(/>([^<]*)</g, (_, text: string) =>
    // Le texte visible est remplacé par du vide ; les balises et leurs
    // attributs, où figurent les vrais marqueurs (`id="onetrust-banner"`,
    // `data-cookieconsent`), sont conservés.
    text.trim() === "" ? "><" : "> <",
  );
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

/**
 * Un marqueur est-il UTILISÉ comme identifiant JavaScript, ou seulement cité ?
 *
 * La distinction est vitale sur les sites rendus par React : Next.js embarque
 * le contenu textuel des pages dans des scripts inline (`self.__next_f.push`).
 * Le texte visible se retrouve donc dans le JavaScript, et une recherche par
 * simple inclusion signale comme UTILISATRICE d'une plateforme de consentement
 * toute page qui en PARLE — un comparatif, un guide, un article de blog.
 *
 * Konsent s'est lui-même détecté comme utilisant Cookiebot, Didomi, OneTrust
 * et tarteaucitron, alors qu'il ne charge aucun script tiers. Un scanner qui
 * se trompe sur son propre site n'a rien à reprocher à personne.
 *
 * On exige donc une forme d'emploi : accès membre (`window.X`, `X.propriete`),
 * appel (`X(`), affectation (`X =`) ou indexation (`X[`).
 */
export function usedAsIdentifier(source: string, marker: string): boolean {
  let index = source.indexOf(marker);
  while (index !== -1) {
    const before = source.slice(Math.max(0, index - 8), index);
    const after = source.slice(index + marker.length);

    // Le caractère précédent ne doit pas prolonger un identifiant plus long,
    // sauf s'il s'agit précisément d'un accès membre.
    const prevChar = source[index - 1] ?? " ";
    const isMemberAccess = before.endsWith("window.") || before.endsWith(".");
    const boundaryOk = isMemberAccess || !/[A-Za-z0-9_$]/.test(prevChar);

    const used =
      isMemberAccess ||
      /^\s*\(/.test(after) ||
      /^\.[A-Za-z_$]/.test(after) ||
      /^\s*=[^=]/.test(after) ||
      /^\[/.test(after);

    if (boundaryOk && used) return true;
    index = source.indexOf(marker, index + 1);
  }
  return false;
}

/**
 * Certains marqueurs ne sont pas des identifiants : fragments d'URL
 * (`googletagmanager.com/gtm.js`), motifs d'appel (`gtag(`), préfixes
 * (`UA-`). Pour ceux-là, l'inclusion simple reste le bon critère.
 */
export function isIdentifierMarker(marker: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(marker);
}

/** Recherche d'un marqueur, avec le critère adapté à sa nature. */
export function markerPresent(source: string, marker: string): boolean {
  return isIdentifierMarker(marker)
    ? usedAsIdentifier(source, marker)
    : source.includes(marker);
}
