/**
 * Formatage des montants en euros, déterministe.
 *
 * `Intl.NumberFormat` dépend de la version d'ICU embarquée : Node et le
 * navigateur ne placent pas toujours les mêmes espaces entre « 5 M » et
 * « € », et le texte rendu sur le serveur diffère alors de celui que React
 * recalcule côté client. React signale un écart d'hydratation et régénère
 * tout l'arbre — un coût invisible à l'œil, réel pour le visiteur.
 *
 * Ce formateur n'a aucune dépendance de version : espace fine insécable
 * (U+202F) entre les groupes de milliers, espace insécable (U+00A0) avant le
 * symbole, virgule décimale. Il produit exactement ce que la typographie
 * française attend, sur n'importe quel moteur.
 */
const THIN = " ";
const NBSP = " ";

function group(integer: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, THIN);
}

/** `200 000 €` — sans décimales. */
export function formatEur(value: number): string {
  const rounded = Math.round(Math.abs(value));
  const sign = value < 0 ? "-" : "";
  return `${sign}${group(String(rounded))}${NBSP}€`;
}

/** `5 M€`, `250 k€`, `900 €` — une décimale au plus, sans zéro inutile. */
export function formatEurCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const scaled = (n: number, unit: string) => {
    const v = Math.round(n * 10) / 10;
    const text = Number.isInteger(v) ? String(v) : String(v).replace(".", ",");
    return `${sign}${text}${NBSP}${unit}€`;
  };
  if (abs >= 1_000_000_000) return scaled(abs / 1_000_000_000, "Md");
  if (abs >= 1_000_000) return scaled(abs / 1_000_000, "M");
  if (abs >= 1_000) return scaled(abs / 1_000, "k");
  return formatEur(value);
}
