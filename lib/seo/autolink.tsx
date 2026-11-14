import Link from "next/link";
import type { ReactNode } from "react";
import { GLOSSARY, type Term } from "./glossary";

/**
 * Maillage interne automatique vers le glossaire.
 *
 * Dans un texte courant (description de règle, fiche cookie, guide), la
 * PREMIÈRE occurrence de chaque terme du glossaire devient un lien vers sa
 * définition. Règles du jeu :
 *  - une seule fois par terme et par page, et au plus `max` liens par page
 *    (5 par défaut) : au-delà, le lien n'aide plus, il distrait ;
 *  - insensible à la casse et aux accents (« interet legitime » trouve
 *    « Intérêt légitime »), mots entiers seulement, pluriel en -s/-x admis ;
 *  - l'expression la plus longue l'emporte (« cookie tiers » avant « cookie ») ;
 *  - ne s'applique qu'à du texte brut : les titres et les liens existants ne
 *    passent jamais par ici, c'est à l'appelant de n'y soumettre que des
 *    paragraphes.
 *
 * Usage : un `createAutolinker()` par page, appelé sur chaque paragraphe
 * dans l'ordre d'affichage, pour que le quota et la « première occurrence »
 * valent pour la page entière.
 */

interface Pattern {
  slug: string;
  needle: string;
}

/** Forme comparable d'un caractère : minuscule, sans diacritique. */
function fold(ch: string): string {
  return ch
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘]/g, "'")
    .toLowerCase();
}

/** Texte replié, avec pour chaque caractère replié son index d'origine. */
function foldWithMap(text: string): { folded: string; map: number[] } {
  let folded = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const f = fold(text[i]!);
    for (let k = 0; k < f.length; k++) map.push(i);
    folded += f;
  }
  map.push(text.length);
  return { folded, map };
}

/** Intitulé, sigle entre parenthèses, partie qui précède, et alias déclarés. */
function variantsOf(term: Term): string[] {
  const out = new Set<string>([term.term]);
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(term.term);
  if (m) {
    out.add(m[1]!);
    out.add(m[2]!);
  }
  for (const a of term.aliases ?? []) out.add(a);
  return [...out].filter((v) => v.trim().length >= 3);
}

const PATTERNS: readonly Pattern[] = GLOSSARY.flatMap((t) =>
  variantsOf(t).map((v) => ({ slug: t.slug, needle: [...v].map(fold).join("") })),
);

const isWordChar = (ch: string | undefined) => !!ch && /[\p{L}\p{N}_]/u.test(ch);

interface Match {
  start: number;
  end: number;
  slug: string;
}

function findMatches(folded: string): Match[] {
  const found: Match[] = [];
  for (const { slug, needle } of PATTERNS) {
    let from = 0;
    for (;;) {
      const at = folded.indexOf(needle, from);
      if (at < 0) break;
      from = at + 1;
      let end = at + needle.length;
      if (isWordChar(folded[at - 1])) continue;
      if (/[sx]/.test(folded[end] ?? "") && !isWordChar(folded[end + 1])) end += 1;
      if (isWordChar(folded[end])) continue;
      found.push({ start: at, end, slug });
    }
  }
  return found.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
}

export function createAutolinker(options: { max?: number; exclude?: readonly string[] } = {}) {
  const max = options.max ?? 5;
  const used = new Set<string>(options.exclude ?? []);
  let count = 0;

  return function autolink(text: string): ReactNode {
    if (count >= max || !text) return text;
    const { folded, map } = foldWithMap(text);

    const accepted: Match[] = [];
    let cursor = 0;
    for (const m of findMatches(folded)) {
      if (count >= max) break;
      if (m.start < cursor || used.has(m.slug)) continue;
      accepted.push(m);
      used.add(m.slug);
      cursor = m.end;
      count += 1;
    }
    if (accepted.length === 0) return text;

    const parts: ReactNode[] = [];
    let last = 0;
    for (const m of accepted) {
      const start = map[m.start]!;
      const end = map[m.end]!;
      if (start > last) parts.push(text.slice(last, start));
      parts.push(
        <Link
          key={`${m.slug}-${start}`}
          href={`/glossaire/${m.slug}`}
          className="text-flame underline decoration-1 underline-offset-2 hover:decoration-2"
        >
          {text.slice(start, end)}
        </Link>,
      );
      last = end;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  };
}
