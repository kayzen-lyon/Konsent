import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Liaison d'un lien de connexion au navigateur qui l'a demandé.
 *
 * Sans elle, un attaquant demande un lien pour SA propre adresse et le fait
 * ouvrir à sa victime : celle-ci se retrouve connectée au compte de
 * l'attaquant et y dépose ses domaines et son adresse d'alerte (« login
 * CSRF »). La demande pose donc un cookie HttpOnly contenant un HMAC du
 * jeton ; le lien n'est consommé que si ce cookie l'accompagne. Effet de
 * bord voulu : les analyseurs de liens des messageries, qui ouvrent les URL
 * sans ce cookie, ne grillent plus le lien.
 */
export const LOGIN_BINDING_COOKIE = "konsent_login_lie";

function secret(): string {
  const value = process.env.KONSENT_AUTH_SECRET ?? process.env.DATABASE_URL;
  if (!value) throw new Error("Aucun secret d'authentification configuré.");
  return value;
}

export function bindingFor(token: string): string {
  return createHmac("sha256", secret()).update(`connexion:${token}`).digest("base64url");
}

export function bindingMatches(token: string, cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const expected = Buffer.from(bindingFor(token));
  const given = Buffer.from(cookieValue);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
