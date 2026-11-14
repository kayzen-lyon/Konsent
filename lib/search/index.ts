import { FAMILY_LABELS, RULES } from "@/lib/rulepack";
import { CATEGORY_LABELS, TRACKERS } from "@/lib/trackers/db";
import { COOKIES } from "@/lib/seo/cookies";
import { GLOSSARY } from "@/lib/seo/glossary";
import { GUIDES } from "@/lib/seo/guides";
import { FREE_TOOLS, toolHref } from "@/lib/tools/catalog";

/**
 * Recherche globale du site.
 *
 * L'index est construit une fois, au chargement du module, à partir des
 * mêmes sources que les pages elles-mêmes : aucune vérité dupliquée, donc
 * aucun résultat qui pointerait vers une page disparue ou renommée.
 *
 * Le module est pur : pas d'E/S, pas d'état mutable après construction.
 * `search()` peut être testé en important simplement ce fichier.
 */

export type SearchType = "page" | "outil" | "regle" | "traceur" | "cookie" | "guide" | "glossaire";

export interface SearchResult {
  type: SearchType;
  title: string;
  url: string;
  excerpt: string;
}

export interface SearchGroup {
  type: SearchType;
  label: string;
  results: SearchResult[];
}

/** Ordre d'affichage des groupes et libellés au pluriel. */
export const TYPE_ORDER: readonly SearchType[] = [
  "page",
  "outil",
  "regle",
  "traceur",
  "cookie",
  "guide",
  "glossaire",
];

export const TYPE_LABELS: Record<SearchType, string> = {
  page: "Pages",
  outil: "Outils gratuits",
  regle: "Règles du référentiel",
  traceur: "Traceurs",
  cookie: "Cookies",
  guide: "Guides",
  glossaire: "Glossaire",
};

interface Entry extends SearchResult {
  /** Champs normalisés, prêts à la comparaison. */
  nTitle: string;
  nKeywords: string;
  nDescription: string;
}

/** Minuscules, sans accents, espaces compactés. Les `_` et `*` sont gardés : ils font le nom des cookies. */
export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_*.\-\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  "le", "la", "les", "l", "un", "une", "des", "de", "du", "d", "et", "ou", "a", "au", "aux",
  "en", "pour", "sur", "par", "que", "qui", "quoi", "est", "c", "ce", "mon", "ma", "mes",
]);

function tokenize(query: string): string[] {
  const all = normalize(query).split(" ").filter(Boolean);
  const meaningful = all.filter((t) => !STOP_WORDS.has(t));
  // Une requête faite uniquement de mots vides (« la ») reste cherchable.
  return meaningful.length > 0 ? meaningful : all;
}

function excerpt(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`;
}

function entry(
  type: SearchType,
  title: string,
  url: string,
  description: string,
  keywords: readonly (string | undefined)[] = [],
): Entry {
  return {
    type,
    title,
    url,
    excerpt: excerpt(description),
    nTitle: normalize(title),
    nKeywords: normalize(keywords.filter(Boolean).join(" ")),
    nDescription: normalize(description),
  };
}

const STATIC_PAGES: readonly [string, string, string, string[]][] = [
  ["Accueil — audit RGPD et cookies", "/", "Lancez un audit gratuit de votre site : traceurs déposés avant consentement, bandeau, transferts hors UE.", ["audit", "scan", "analyser", "konsent"]],
  ["Fonctionnalités", "/fonctionnalites", "Tout ce que Konsent analyse et produit : constats, preuves, plan de correction, documents.", ["features", "rapport"]],
  ["Tarifs", "/tarifs", "Les offres Konsent, de l'audit gratuit à la surveillance continue.", ["prix", "abonnement", "offre", "pricing"]],
  ["Surveillance continue", "/surveillance", "Surveillez vos sites dans la durée et soyez alerté dès qu'un écart réapparaît.", ["monitoring", "alerte", "suivi"]],
  ["Outils gratuits", "/outils", "Les outils gratuits de Konsent : générateur de bandeau, comparateur, auto-évaluation, décodeur TCF.", ["gratuit", "tools"]],
  ["Référentiel des règles", "/regles", "L'ensemble des règles évaluées par Konsent, avec leurs références normatives.", ["rulepack", "referentiel", "cnil"]],
  ["Base des traceurs", "/traceurs", "Les services tiers identifiés par Konsent : entité, juridiction, cookies, risques.", ["trackers", "destinataires", "services tiers"]],
  ["Index des cookies", "/cookies", "À quoi sert chaque cookie, qui le dépose, combien de temps, et s'il exige un consentement.", ["cookie", "liste"]],
  ["Glossaire", "/glossaire", "Le vocabulaire du RGPD, des cookies et des traceurs expliqué simplement.", ["definition", "lexique", "vocabulaire"]],
  ["Guides de mise en conformité", "/guides", "Comment bloquer chaque service tiers avant le consentement, étape par étape.", ["tutoriel", "bloquer", "how-to"]],
  ["Veille réglementaire", "/veille", "Les évolutions de la doctrine CNIL, de la jurisprudence et des textes européens.", ["actualite", "jurisprudence", "sanctions", "omnibus"]],
  ["Méthodologie", "/methodologie", "Comment Konsent analyse un site : protocole en trois phases, limites et aveux d'incertitude.", ["protocole", "methode"]],
  ["Comparer deux sites", "/comparer", "Deux audits côte à côte : scores, écarts communs et écarts propres à chacun.", ["comparateur", "concurrent", "benchmark"]],
  ["Badge de conformité", "/badge", "Affichez sur votre site un badge reflétant le résultat de votre dernier audit.", ["badge", "label"]],
  ["Auto-évaluation RGPD", "/auto-evaluation", "Questionnaire sur le registre, les contrats, les droits des personnes et la sécurité.", ["questionnaire", "checklist", "registre"]],
  ["Générateur de bandeau cookies", "/outils/generateur-bandeau", "Configurez un bandeau conforme, voyez-le en direct et copiez le code.", ["bandeau", "banniere", "cmp", "consentement"]],
  ["Contact", "/contact", "Écrire à l'équipe Konsent by KAYZEN.", ["contacter", "email", "telephone", "aide"]],
  ["Mentions légales", "/mentions-legales", "Éditeur, hébergeur et informations légales du site.", ["legal", "editeur", "siren"]],
  ["Politique de confidentialité", "/confidentialite", "Comment Konsent traite vos données personnelles.", ["vie privee", "donnees personnelles", "rgpd"]],
  ["Conditions générales d'utilisation", "/cgu", "Conditions d'utilisation du service Konsent.", ["cgu", "conditions"]],
  ["Conditions générales de vente", "/cgv", "Conditions de vente des offres Konsent.", ["cgv", "vente"]],
  ["Déclaration d'accessibilité", "/accessibilite", "État de conformité du site au RGAA.", ["rgaa", "accessibilite", "handicap"]],
  ["Plan du site", "/plan-du-site", "Toutes les pages du site.", ["sitemap", "plan"]],
];

function buildIndex(): readonly Entry[] {
  const out: Entry[] = [];

  for (const tool of FREE_TOOLS) {
    if (!tool.available) continue;
    out.push(entry("outil", tool.title, toolHref(tool), tool.description, [tool.question, tool.slug]));
  }

  for (const [title, url, description, keywords] of STATIC_PAGES) {
    out.push(entry("page", title, url, description, keywords));
  }

  for (const rule of RULES) {
    out.push(
      entry("regle", `${rule.id} — ${rule.title}`, `/regles/${rule.id.toLowerCase()}`, rule.messageExec, [
        rule.id,
        FAMILY_LABELS[rule.family],
      ]),
    );
  }

  for (const t of TRACKERS) {
    out.push(
      entry("traceur", t.name, `/traceurs/${t.slug}`, t.purposeFr, [
        t.entity,
        t.ultimateParent,
        ...t.categories.map((c) => CATEGORY_LABELS[c] ?? c),
        ...t.domains,
        ...(t.cookies ?? []).map((c) => c.name),
      ]),
    );
  }

  for (const c of COOKIES) {
    out.push(
      entry("cookie", `Cookie ${c.name}`, `/cookies/${c.slug}`, c.purposeFr, [
        c.name,
        c.vendorName,
        CATEGORY_LABELS[c.category] ?? c.category,
      ]),
    );
  }

  for (const g of GUIDES) {
    out.push(entry("guide", g.title, `/guides/${g.slug}`, g.metaDescription, [g.tracker.name, g.tracker.entity]));
  }

  for (const term of GLOSSARY) {
    out.push(entry("glossaire", term.term, `/glossaire/${term.slug}`, term.short, [...(term.aliases ?? []), term.reference]));
  }

  // Un outil peut aussi figurer dans les pages statiques : la première
  // occurrence (l'outil, plus précis) l'emporte.
  const seen = new Set<string>();
  return out.filter((e) => (seen.has(e.url) ? false : (seen.add(e.url), true)));
}

const INDEX = buildIndex();

/** Nombre d'entrées indexées, utile aux tests et à l'affichage. */
export const INDEX_SIZE = INDEX.length;

function wordStart(haystack: string, token: string): boolean {
  return haystack.startsWith(token) || haystack.includes(` ${token}`);
}

/**
 * Score d'un jeton : titre > mots-clés > description, avec un bonus quand le
 * jeton commence un mot. 0 si le jeton n'apparaît nulle part.
 */
function tokenScore(e: Entry, token: string): number {
  if (e.nTitle === token) return 100;
  if (e.nTitle.includes(token)) return wordStart(e.nTitle, token) ? 60 : 40;
  if (e.nKeywords.includes(token)) return wordStart(e.nKeywords, token) ? 25 : 15;
  if (e.nDescription.includes(token)) return wordStart(e.nDescription, token) ? 8 : 4;
  return 0;
}

/**
 * Résultats classés par pertinence. Tous les jetons significatifs doivent
 * apparaître (ET logique) : une recherche à plusieurs mots affine, elle
 * n'élargit pas.
 */
export function search(query: string, limit = 20): SearchResult[] {
  const tokens = tokenize(query.slice(0, 100));
  if (tokens.length === 0 || limit <= 0) return [];
  const phrase = tokens.join(" ");

  const scored: { e: Entry; score: number }[] = [];
  for (const e of INDEX) {
    let score = 0;
    let matched = true;
    for (const token of tokens) {
      const s = tokenScore(e, token);
      if (s === 0) {
        matched = false;
        break;
      }
      score += s;
    }
    if (!matched) continue;
    if (tokens.length > 1 && e.nTitle.includes(phrase)) score += 50;
    if (e.nTitle.startsWith(phrase)) score += 20;
    scored.push({ e, score });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      TYPE_ORDER.indexOf(a.e.type) - TYPE_ORDER.indexOf(b.e.type) ||
      a.e.title.length - b.e.title.length ||
      a.e.title.localeCompare(b.e.title, "fr"),
  );

  return scored.slice(0, limit).map(({ e }) => ({
    type: e.type,
    title: e.title,
    url: e.url,
    excerpt: e.excerpt,
  }));
}

/** Regroupe des résultats par type, dans l'ordre de `TYPE_ORDER`, en gardant le classement interne. */
export function groupResults(results: readonly SearchResult[]): SearchGroup[] {
  return TYPE_ORDER.map((type) => ({
    type,
    label: TYPE_LABELS[type],
    results: results.filter((r) => r.type === type),
  })).filter((g) => g.results.length > 0);
}
