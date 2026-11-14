import { EDITOR } from "@/lib/disclaimer";

/**
 * Origine canonique du site.
 *
 * Les liens envoyés par e-mail (connexion), les URL de retour Stripe et les
 * documents publics ne doivent JAMAIS être construits depuis l'en-tête Host
 * de la requête : un Host forgé enverrait le jeton de connexion vers le
 * domaine d'un attaquant. En production, l'origine est une constante ; en
 * développement et en préversion, `KONSENT_SITE_URL` peut la remplacer.
 */
export function siteOrigin(): string {
  const fromEnv = process.env.KONSENT_SITE_URL?.trim();
  if (fromEnv && /^https?:\/\/[^/]+$/.test(fromEnv.replace(/\/$/, ""))) {
    return fromEnv.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return EDITOR.productSite;
}

/**
 * Contrôle d'origine des écritures authentifiées par cookie.
 *
 * `SameSite=Lax` ne suffit pas : les autres sous-domaines de
 * kayzen-lyon.com sont « same-site » et pourraient émettre la requête. Le
 * navigateur pose toujours `Origin` sur un POST/DELETE ; une origine
 * différente de la nôtre est refusée. Une requête sans `Origin` (outil en
 * ligne de commande, donc sans cookie de session volé par le navigateur)
 * reste admise.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    const allowed = new Set([new URL(siteOrigin()).host, new URL(request.url).host]);
    return allowed.has(host);
  } catch {
    return false;
  }
}
