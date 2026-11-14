/**
 * Export CSV pour tableur (Excel, LibreOffice, Numbers).
 *
 * Séparateur « ; » et BOM UTF-8 : c'est ce qu'attend un Excel réglé en
 * français, faute de quoi les accents et les colonnes sont brouillés.
 *
 * Injection de formules (CSV injection) : une cellule commençant par =, +, -
 * ou @ est interprétée comme une formule par le tableur. Un nom de domaine
 * ou une adresse de client n'en a jamais besoin ; on la préfixe d'une
 * apostrophe, qui force la lecture en texte. Tabulation et retour chariot en
 * tête sont traités de même (vecteurs connus).
 */

export const CSV_BOM = "﻿";
export const CSV_SEPARATOR = ";";

export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[";\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: readonly (readonly unknown[])[]): string {
  return CSV_BOM + rows.map((row) => row.map(csvCell).join(CSV_SEPARATOR)).join("\r\n") + "\r\n";
}
