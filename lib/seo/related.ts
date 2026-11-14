import { RULES, getRule, type Family, type Rule } from "../rulepack";
import { CATEGORY_LABELS, TRACKERS, getTrackerBySlug } from "../trackers/db";
import type { TrackerEntity } from "../trackers/types";
import { COOKIES, type CookieEntry } from "./cookies";
import { GLOSSARY, type Term } from "./glossary";
import { GUIDES, type Guide } from "./guides";

/**
 * Maillage « Voir aussi » des fiches.
 *
 * Logique pure, sans rendu : chaque fiche reçoit de 3 à 6 liens calculés à
 * partir des mêmes données que les pages (référentiel, base des traceurs,
 * index des cookies, glossaire, guides). Rien n'est saisi à la main, donc
 * rien ne peut pointer vers une page disparue.
 *
 * Les liens déjà présents ailleurs sur la fiche sont exclus par l'appelant
 * via `exclude`, pour que le bloc apporte des pistes nouvelles.
 */

export interface RelatedLink {
  href: string;
  label: string;
  /** Nature de la page liée, affichée en surtitre. */
  kind: "Règle" | "Traceur" | "Cookie" | "Guide" | "Glossaire";
  hint?: string;
}

/** Au plus six liens ; le bloc n'est rendu qu'à partir de trois. */
export const SEE_ALSO_MIN = 3;
const MAX = 6;

const ruleHref = (r: Rule) => `/regles/${r.id.toLowerCase()}`;
const ruleLink = (r: Rule): RelatedLink => ({
  href: ruleHref(r),
  label: r.title,
  kind: "Règle",
  hint: r.id,
});
const trackerLink = (t: TrackerEntity): RelatedLink => ({
  href: `/traceurs/${t.slug}`,
  label: t.name,
  kind: "Traceur",
  hint: t.categories.map((c) => CATEGORY_LABELS[c] ?? c).slice(0, 2).join(" · "),
});
const cookieLink = (c: CookieEntry): RelatedLink => ({
  href: `/cookies/${c.slug}`,
  label: c.name,
  kind: "Cookie",
  hint: c.vendorName,
});
const guideLink = (g: Guide): RelatedLink => ({
  href: `/guides/${g.slug}`,
  label: g.title,
  kind: "Guide",
});
const termLink = (t: Term): RelatedLink => ({
  href: `/glossaire/${t.slug}`,
  label: t.term,
  kind: "Glossaire",
});

/**
 * Assemble les candidats par ordre de priorité : chaque groupe apporte au
 * plus `quota` liens au premier passage, puis les restes complètent jusqu'au
 * maximum. Ainsi une fiche mêle les natures de liens au lieu d'aligner six
 * règles de la même famille.
 */
function assemble(
  groups: readonly { links: readonly RelatedLink[]; quota: number }[],
  exclude: readonly string[] = [],
): RelatedLink[] {
  const seen = new Set(exclude);
  const out: RelatedLink[] = [];
  const take = (l: RelatedLink) => {
    if (out.length >= MAX || seen.has(l.href)) return false;
    seen.add(l.href);
    out.push(l);
    return true;
  };
  const rest: RelatedLink[] = [];
  for (const g of groups) {
    let n = 0;
    for (const l of g.links) {
      if (n < g.quota && take(l)) n += 1;
      else rest.push(l);
    }
  }
  for (const l of rest) take(l);
  return out;
}

/* ───────────────────── termes du glossaire cités ───────────────────── */

/** Termes trop généraux pour être un lien utile : relégués en fin de liste. */
const GENERIC = new Set(["cookie", "traceur", "consentement", "refus"]);

const TERM_PATTERNS: readonly { term: Term; re: RegExp; weight: number }[] = GLOSSARY.map(
  (term) => {
    const base = term.term.replace(/\s*\(([^)]+)\)\s*/g, " ").trim();
    const inner = [...term.term.matchAll(/\(([^)]+)\)/g)].map((m) => m[1] ?? "");
    const names = [base, ...inner, ...(term.aliases ?? [])]
      .filter((n) => n.length >= 3)
      .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/['’]/g, "['’]"));
    return {
      term,
      re: new RegExp(`(?<![\\p{L}\\p{N}])(?:${names.join("|")})s?(?![\\p{L}\\p{N}])`, "iu"),
      weight: GENERIC.has(term.slug) ? 0 : base.length,
    };
  },
);

/** Termes du glossaire mentionnés dans un texte, du plus précis au plus général. */
export function termsCitedIn(text: string, excludeSlugs: readonly string[] = []): Term[] {
  return TERM_PATTERNS.filter((p) => !excludeSlugs.includes(p.term.slug) && p.re.test(text))
    .sort((a, b) => b.weight - a.weight)
    .map((p) => p.term);
}

function termsBySlug(slugs: readonly string[]): RelatedLink[] {
  return slugs
    .map((s) => GLOSSARY.find((t) => t.slug === s))
    .filter((t): t is Term => Boolean(t))
    .map(termLink);
}

/** Notions de base proposées à défaut, sur une fiche peu reliée. */
const FALLBACK_TERMS = ["duree-de-vie", "cookie", "cookie-tiers", "consentement", "traceur"];

/**
 * Famille du référentiel que chaque terme du glossaire décrit. Sert à relier
 * une définition aux règles qui la mettent en œuvre, même quand leur libellé
 * n'emploie pas le mot exact.
 */
const TERM_FAMILIES: Partial<Record<string, readonly Family[]>> = {
  traceur: ["DEPOT"],
  cookie: ["DEPOT"],
  "cookie-tiers": ["DEPOT"],
  consentement: ["CONSENT"],
  refus: ["REFUS"],
  cmp: ["BANNER"],
  "dark-pattern": ["BANNER"],
  "empreinte-du-terminal": ["FP"],
  "canvas-fingerprinting": ["FP"],
  "masquage-par-cname": ["STORAGE"],
  "marquage-cote-serveur": ["STORAGE"],
  tcf: ["TCF"],
  "signal-de-consentement": ["CMV2", "CONSENT"],
  "enchere-en-temps-reel": ["VENDOR", "TCF"],
  "mesure-daudience-exemptee": ["EXEMPT"],
  "duree-de-vie": ["EXEMPT"],
  "responsable-de-traitement": ["DOC"],
  "sous-traitant": ["VENDOR"],
  "registre-des-traitements": ["DOC"],
  aipd: ["SPECIAL"],
  "transfert-hors-ue": ["TRANSFER"],
  "decision-dadequation": ["TRANSFER"],
  "data-privacy-framework": ["TRANSFER"],
  "clauses-contractuelles-types": ["TRANSFER"],
  "donnees-sensibles": ["SPECIAL"],
  "interet-legitime": ["TCF"],
  "digital-omnibus": ["EXEMPT", "REFUS"],
  dpo: ["DOC"],
  "stockage-local": ["STORAGE"],
};

/* ─────────────────────────────── fiches ─────────────────────────────── */

/** Distance entre deux identifiants de la même famille (KZC-DEPOT-003 / 005 → 2). */
function idDistance(a: string, b: string): number {
  const n = (id: string) => Number(id.split("-").pop());
  return Math.abs(n(a) - n(b));
}

export function relatedForRule(rule: Rule, exclude: readonly string[] = []): RelatedLink[] {
  const sameFamily = RULES.filter((r) => r.family === rule.family && r.id !== rule.id)
    .sort((a, b) => idDistance(a.id, rule.id) - idDistance(b.id, rule.id))
    .map(ruleLink);
  const guides = GUIDES.filter((g) => g.relatedRules.includes(rule.id)).map(guideLink);
  const terms = termsCitedIn(
    [rule.title, rule.messageExec, rule.messageTech].join(" "),
  ).map(termLink);
  return assemble(
    [
      { links: sameFamily, quota: 3 },
      { links: guides, quota: 2 },
      { links: terms, quota: 1 },
    ],
    [ruleHref(rule), ...exclude],
  );
}

export function relatedForTracker(
  tracker: TrackerEntity,
  exclude: readonly string[] = [],
): RelatedLink[] {
  const guide = GUIDES.find((g) => g.tracker.slug === tracker.slug);
  const parent = tracker.ultimateParent ?? tracker.entity;
  const sameOwner = TRACKERS.filter(
    (t) => t.slug !== tracker.slug && (t.ultimateParent ?? t.entity) === parent,
  ).map(trackerLink);
  const primary = tracker.categories[0];
  const sameCategory = TRACKERS.filter(
    (t) => t.slug !== tracker.slug && primary !== undefined && t.categories.includes(primary),
  )
    // Les alternatives européennes d'abord : c'est le lien le plus utile.
    .sort((a, b) => Number(b.adequacy === "EEA") - Number(a.adequacy === "EEA"))
    .map(trackerLink);
  const cookies = COOKIES.filter((c) => c.vendorSlug === tracker.slug).map(cookieLink);
  const rules = (guide?.relatedRules ?? [])
    .map((id) => getRule(id))
    .filter((r): r is Rule => Boolean(r))
    .map(ruleLink);
  return assemble(
    [
      { links: guide ? [guideLink(guide)] : [], quota: 1 },
      { links: sameOwner, quota: 2 },
      { links: sameCategory, quota: 2 },
      { links: rules, quota: 1 },
      { links: cookies, quota: 1 },
      { links: termsCitedIn(`${tracker.purposeFr} ${tracker.riskNotesFr}`).map(termLink), quota: 1 },
    ],
    [`/traceurs/${tracker.slug}`, ...exclude],
  );
}

export function relatedForCookie(
  cookie: CookieEntry,
  exclude: readonly string[] = [],
): RelatedLink[] {
  const vendor = cookie.vendorSlug ? getTrackerBySlug(cookie.vendorSlug) : undefined;
  const guide = vendor ? GUIDES.find((g) => g.tracker.slug === vendor.slug) : undefined;
  const siblings = COOKIES.filter(
    (c) => c.slug !== cookie.slug && c.vendorSlug && c.vendorSlug === cookie.vendorSlug,
  ).map(cookieLink);
  const sameCategory = COOKIES.filter(
    (c) => c.slug !== cookie.slug && c.vendorSlug !== cookie.vendorSlug && c.category === cookie.category,
  ).map(cookieLink);
  const terms = termsCitedIn([cookie.purposeFr, cookie.noteFr ?? ""].join(" ")).map(termLink);
  const rules = (guide?.relatedRules ?? [])
    .map((id) => getRule(id))
    .filter((r): r is Rule => Boolean(r))
    .map(ruleLink);
  const primary = vendor?.categories[0];
  const similarServices = TRACKERS.filter(
    (t) => vendor && t.slug !== vendor.slug && primary !== undefined && t.categories.includes(primary),
  )
    .sort((a, b) => Number(b.adequacy === "EEA") - Number(a.adequacy === "EEA"))
    .map(trackerLink);
  return assemble(
    [
      { links: vendor ? [trackerLink(vendor)] : [], quota: 1 },
      { links: guide ? [guideLink(guide)] : [], quota: 1 },
      { links: siblings, quota: 2 },
      { links: rules, quota: 1 },
      { links: similarServices, quota: 1 },
      { links: sameCategory, quota: 1 },
      { links: terms, quota: 1 },
      { links: termsBySlug(FALLBACK_TERMS), quota: 0 },
    ],
    [`/cookies/${cookie.slug}`, ...exclude],
  );
}

export function relatedForTerm(term: Term, exclude: readonly string[] = []): RelatedLink[] {
  const cited = termsCitedIn([term.short, ...term.body].join(" "), [term.slug]).map(termLink);
  const re = TERM_PATTERNS.find((p) => p.term.slug === term.slug)?.re;
  const citing = re
    ? RULES.filter((r) => re.test(`${r.title} ${r.messageExec} ${r.messageTech}`))
    : [];
  const families = TERM_FAMILIES[term.slug] ?? [];
  const ofFamily = RULES.filter((r) => families.includes(r.family));
  // Règles qui citent le terme d'abord, puis celles de la famille qu'il décrit.
  const rules = [...citing, ...ofFamily.filter((r) => !citing.includes(r))].map(ruleLink);
  const guides = re
    ? GUIDES.filter((g) => re.test([...g.why, ...g.steps].join(" "))).map(guideLink)
    : [];
  const linked = (term.related ?? [])
    .map((s) => GLOSSARY.find((t) => t.slug === s))
    .filter((t): t is Term => Boolean(t))
    .map(termLink);
  return assemble(
    [
      { links: cited, quota: 3 },
      { links: rules, quota: 3 },
      { links: guides, quota: 1 },
      { links: linked, quota: 1 },
      { links: termsBySlug(FALLBACK_TERMS), quota: 0 },
    ],
    [`/glossaire/${term.slug}`, ...exclude],
  );
}

export function relatedForGuide(guide: Guide, exclude: readonly string[] = []): RelatedLink[] {
  const { tracker } = guide;
  const primary = tracker.categories[0];
  const sameCategory = GUIDES.filter(
    (g) => g.slug !== guide.slug && primary !== undefined && g.tracker.categories.includes(primary),
  ).map(guideLink);
  const parent = tracker.ultimateParent ?? tracker.entity;
  const sameOwner = GUIDES.filter(
    (g) => g.slug !== guide.slug && (g.tracker.ultimateParent ?? g.tracker.entity) === parent,
  ).map(guideLink);
  const terms = termsCitedIn([...guide.why, ...guide.steps].join(" ")).map(termLink);
  const alternatives = TRACKERS.filter(
    (t) =>
      t.slug !== tracker.slug &&
      t.adequacy === "EEA" &&
      primary !== undefined &&
      t.categories.includes(primary),
  ).map(trackerLink);
  return assemble(
    [
      { links: sameOwner, quota: 2 },
      { links: sameCategory, quota: 2 },
      { links: terms, quota: 2 },
      { links: alternatives, quota: 1 },
      { links: termsBySlug(FALLBACK_TERMS), quota: 0 },
    ],
    [`/guides/${guide.slug}`, ...exclude],
  );
}
