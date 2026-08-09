/**
 * Normalisation et contrôle de l'adresse à analyser, côté worker.
 *
 * Ce contrôle existe DÉJÀ dans `lib/engine/scan.ts`, côté application. Le
 * dupliquer n'est pas un oubli : le worker est un service joignable sur le
 * réseau, et il ne doit pas dépendre de la vigilance de son appelant. S'il
 * acceptait `http://169.254.169.254/`, il deviendrait un relais vers les
 * métadonnées de l'hébergeur pour quiconque atteint son port.
 *
 * Les deux implémentations doivent rester d'accord — `scripts/test-worker.mjs`
 * les confronte sur le même jeu de cas et échoue si elles divergent.
 *
 * Ce module ne dépend ni de Playwright ni du serveur : il est importable et
 * testable seul.
 */

/** L'hôte est-il routable sur l'internet public ? */
export function isPublicHost(host: string): boolean {
  const h = host.toLowerCase();
  // Un nom sans point n'est pas un domaine public ; les littéraux IPv6 sont
  // entre crochets et échappent donc à cette règle.
  if (!h.includes(".") && !h.startsWith("[")) return false;
  return !(
    h === "localhost" ||
    h === "0.0.0.0" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.endsWith(".localhost") ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^169\.254\./.test(h) ||
    h === "[::1]" ||
    h.startsWith("[fc") ||
    h.startsWith("[fd")
  );
}

/**
 * Accepte « exemple.fr », « www.exemple.fr », « https://exemple.fr/page ».
 * Renvoie `null` plutôt que de lever : l'appelant est un serveur HTTP qui doit
 * répondre 400, pas planter.
 */
export function normalizeTarget(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!isPublicHost(url.hostname)) return null;
  return url;
}
