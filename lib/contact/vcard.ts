import { EDITOR } from "../disclaimer";

/**
 * Fiche de contact vCard 4.0 (RFC 6350).
 *
 * Écrite à la main plutôt que tirée d'une bibliothèque : le format tient en
 * une vingtaine de lignes, et les deux seuls pièges — l'échappement et le
 * pliage — sont exactement ceux qu'une bibliothèque masquerait sans qu'on
 * sache s'ils sont traités.
 *
 * Les deux pièges, justement :
 *
 *  1. **L'échappement.** Les caractères `\`, `;`, `,` et le saut de ligne ont
 *     un sens structurel dans vCard. Une adresse contenant une virgule non
 *     échappée décale tous les champs suivants, et le carnet d'adresses
 *     enregistre la ville dans le champ « code postal » sans rien signaler.
 *
 *  2. **Le pliage.** RFC 6350 §3.2 impose des lignes de 75 octets au plus,
 *     coupées par CRLF suivi d'une espace. Le compte se fait en OCTETS, pas
 *     en caractères : « Société » occupe 8 octets pour 7 caractères, et un
 *     découpage au caractère près couperait un é en deux, produisant un
 *     fichier illisible sur certains téléphones.
 */

/** Échappe un texte destiné à une valeur de propriété (RFC 6350 §3.4). */
export function escapeValue(text: string): string {
  return text
    // La barre oblique inverse d'abord, sinon on échapperait les échappements
    // qu'on vient soi-même d'ajouter.
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/**
 * Plie une ligne à 75 octets, continuation par CRLF + espace.
 *
 * Le découpage se fait sur les frontières de caractères UTF-8 : on n'ajoute un
 * caractère que s'il tient entièrement dans le segment courant.
 */
export function foldLine(line: string): string {
  const LIMIT = 75;
  const encoder = new TextEncoder();
  const segments: string[] = [];
  let current = "";
  let bytes = 0;

  for (const char of line) {
    const size = encoder.encode(char).length;
    // Une continuation commence par une espace, qui consomme un octet du
    // budget : on réserve donc un octet dès la deuxième ligne.
    const budget = segments.length === 0 ? LIMIT : LIMIT - 1;
    if (bytes + size > budget) {
      segments.push(current);
      current = char;
      bytes = size;
      continue;
    }
    current += char;
    bytes += size;
  }
  segments.push(current);

  return segments.join("\r\n ");
}

/**
 * Construit la fiche de contact de l'éditeur.
 *
 * Aucune donnée n'est inventée : tout provient du bloc `EDITOR`, qui est
 * aussi ce qu'affichent les mentions légales. Une carte de visite numérique
 * qui divergerait des mentions légales serait un écart relevable sur notre
 * propre site.
 */
export function buildVCard(): string {
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:4.0",
    // KIND:org : il s'agit d'une organisation, pas d'une personne. Les
    // carnets d'adresses qui l'ignorent retombent sur FN, d'où sa présence.
    "KIND:org",
    `FN:${escapeValue(EDITOR.tradeName)}`,
    `ORG:${escapeValue(EDITOR.tradeName)}`,
    // ADR a sept composantes séparées par des points-virgules, dans un ordre
    // fixe : boîte postale ; complément ; rue ; ville ; région ; code postal ;
    // pays. Les composantes vides restent présentes, sans quoi tout décale.
    `ADR;TYPE=work:;;${escapeValue(EDITOR.street)};${escapeValue(EDITOR.city)};;${escapeValue(EDITOR.postalCode)};${escapeValue(EDITOR.country)}`,
    `TEL;TYPE=work,voice;VALUE=uri:tel:${EDITOR.phoneE164}`,
    `EMAIL;TYPE=work:${escapeValue(EDITOR.email)}`,
    `URL;TYPE=work:${escapeValue(EDITOR.agencySite)}`,
    `NOTE:${escapeValue(
      `${EDITOR.legalForm} — SIREN ${EDITOR.siren}, SIRET ${EDITOR.siret}, RCS ${EDITOR.rcs}, TVA ${EDITOR.vatNumber}, APE ${EDITOR.apeCode}.`,
    )}`,
    // REV est figée à la date de dernière modification du bloc d'identité, et
    // non à `Date.now()` : une fiche dont l'horodatage change à chaque
    // téléchargement empêche tout carnet d'adresses de détecter qu'elle n'a
    // pas bougé, et provoque un doublon à chaque import.
    "REV:20260809T000000Z",
    "END:VCARD",
  ];

  // CRLF partout, y compris en fin de fichier : plusieurs lecteurs ignorent
  // silencieusement la dernière ligne si elle n'est pas terminée.
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

/** Nom de fichier proposé au téléchargement. */
export const VCARD_FILENAME = "kayzen-lyon.vcf";
