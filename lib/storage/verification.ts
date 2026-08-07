import { promises as dns } from "node:dns";

/**
 * Vérification de la maîtrise d'un domaine.
 *
 * Le scan à la demande observe un site public, comme le ferait n'importe
 * quel navigateur : aucune vérification n'est nécessaire, et rien n'est
 * conservé.
 *
 * La surveillance planifiée est différente : elle suppose de conserver un
 * historique et d'envoyer des alertes. On ne le fait pas pour le site
 * d'autrui. La vérification protège à la fois les tiers et l'éditeur
 * (§5.6 du PRD).
 */

export type VerificationMethod = "dns_txt" | "well_known";

export interface VerificationResult {
  verified: boolean;
  method?: VerificationMethod;
  /** Ce qui a été cherché, et ce qui a été trouvé. */
  detail: string;
}

const RECORD_PREFIX = "konsent-verification=";
const WELL_KNOWN_PATH = "/.well-known/konsent-verification.txt";
const FETCH_TIMEOUT_MS = 8_000;

export function dnsInstructions(hostname: string, token: string): string {
  return `Créez un enregistrement TXT sur ${hostname} avec la valeur : ${RECORD_PREFIX}${token}`;
}

export function fileInstructions(hostname: string, token: string): string {
  return `Publiez https://${hostname}${WELL_KNOWN_PATH} contenant : ${token}`;
}

async function checkDns(hostname: string, token: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(hostname);
    const flattened = records.map((parts) => parts.join(""));
    return flattened.some((r) => r.trim() === `${RECORD_PREFIX}${token}`);
  } catch {
    return false;
  }
}

async function checkFile(hostname: string, token: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://${hostname}${WELL_KNOWN_PATH}`, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "KonsentBot/1.0 (+https://konsent.fr/bot)" },
      cache: "no-store",
    });
    if (!res.ok) return false;
    // Un fichier de vérification tient en une ligne : au-delà, on refuse
    // plutôt que d'aller chercher un jeton dans une page d'erreur HTML.
    const text = (await res.text()).slice(0, 512);
    return text.trim() === token;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Teste les deux méthodes. L'une suffit. */
export async function verifyOwnership(
  hostname: string,
  token: string,
): Promise<VerificationResult> {
  const [viaDns, viaFile] = await Promise.all([
    checkDns(hostname, token),
    checkFile(hostname, token),
  ]);

  if (viaDns) {
    return {
      verified: true,
      method: "dns_txt",
      detail: `Enregistrement TXT trouvé sur ${hostname}.`,
    };
  }
  if (viaFile) {
    return {
      verified: true,
      method: "well_known",
      detail: `Fichier de vérification trouvé à ${WELL_KNOWN_PATH}.`,
    };
  }

  return {
    verified: false,
    detail: `Ni l'enregistrement TXT sur ${hostname}, ni le fichier ${WELL_KNOWN_PATH} n'ont été trouvés. La propagation DNS peut prendre quelques minutes.`,
  };
}

export { RECORD_PREFIX, WELL_KNOWN_PATH };
