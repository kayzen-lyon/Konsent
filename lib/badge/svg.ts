import { gradeColor } from "@/lib/risk/score";

/**
 * Génération du badge Konsent, en SVG pur.
 *
 * Aucune police chargée, aucune ressource externe : le badge doit s'afficher
 * tel quel dans un README, un pied de page ou un client qui bloque tout le
 * reste. Les largeurs de texte sont donc approximées — un léger excès de
 * marge vaut mieux qu'un texte tronqué.
 */

export type BadgeStyle = "flat" | "pill";

export interface BadgeInput {
  /** Texte de droite, par exemple « 72/100 B ». */
  message: string;
  /** Couleur de fond de la partie droite. */
  color: string;
  /** Texte lu par les technologies d'assistance (élément <title>). */
  title: string;
  style?: BadgeStyle;
}

const LABEL = "Konsent";
const LABEL_COLOR = "#1f2937";
/** Gris du badge « indisponible » : blanc dessus à 4,7:1. */
export const UNAVAILABLE_COLOR = "#6c757d";
const HEIGHT = 20;
const PAD_X = 7;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Largeur approximative, en pixels, d'un texte en sans-serif 11 px. */
export function textWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    if (" .,:;|!'ilj/".includes(ch)) width += 3.6;
    else if ("mwMW".includes(ch)) width += 9.6;
    else if (/[0-9]/.test(ch)) width += 6.7;
    else if (/[A-Z]/.test(ch)) width += 7.6;
    else width += 6.4;
  }
  return Math.ceil(width);
}

export function renderBadge({ message, color, title, style = "flat" }: BadgeInput): string {
  const labelW = textWidth(LABEL) + PAD_X * 2;
  const messageW = textWidth(message) + PAD_X * 2;
  const totalW = labelW + messageW;
  const radius = style === "pill" ? HEIGHT / 2 : 3;

  const safeMessage = escapeXml(message);
  const safeTitle = escapeXml(title);
  const safeColor = /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : UNAVAILABLE_COLOR;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${HEIGHT}" viewBox="0 0 ${totalW} ${HEIGHT}" role="img" aria-label="${safeTitle}">`,
    `<title>${safeTitle}</title>`,
    `<clipPath id="r"><rect width="${totalW}" height="${HEIGHT}" rx="${radius}"/></clipPath>`,
    `<g clip-path="url(#r)">`,
    `<rect width="${labelW}" height="${HEIGHT}" fill="${LABEL_COLOR}"/>`,
    `<rect x="${labelW}" width="${messageW}" height="${HEIGHT}" fill="${safeColor}"/>`,
    `</g>`,
    `<g fill="#fff" font-family="system-ui,-apple-system,'Segoe UI',Verdana,sans-serif" font-size="11" text-anchor="middle">`,
    `<text x="${labelW / 2}" y="14">${LABEL}</text>`,
    `<text x="${labelW + messageW / 2}" y="14" font-weight="600">${safeMessage}</text>`,
    `</g>`,
    `</svg>`,
  ].join("");
}

/** Badge d'un score calculé. */
export function scoreBadge(params: {
  score: number;
  grade: string;
  hostname: string;
  style?: BadgeStyle;
}): string {
  const score = Math.max(0, Math.min(100, Math.round(params.score)));
  return renderBadge({
    message: `${score}/100 ${params.grade}`,
    color: gradeColor(params.grade),
    title: `Konsent : ${score} sur 100, note ${params.grade} pour ${params.hostname} (analyse automatisée indicative, pas une certification)`,
    style: params.style,
  });
}

/** Badge gris, servi lorsque l'analyse n'a pas pu aboutir. */
export function unavailableBadge(style?: BadgeStyle): string {
  return renderBadge({
    message: "indisponible",
    color: UNAVAILABLE_COLOR,
    title: "Konsent : score indisponible",
    style,
  });
}
