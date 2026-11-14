import { BlockList, isIP } from "node:net";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { Agent, fetch as undiciFetch, type RequestInit as UndiciInit } from "undici";

/**
 * Garde réseau du scanner : seules les adresses PUBLIQUES sont jointes.
 *
 * Le contrôle sur le seul nom saisi ne suffit pas. Un nom peut résoudre vers
 * 127.0.0.1, et une page publique peut rediriger vers http://10.0.0.5/ : dans
 * les deux cas le serveur irait chercher une ressource interne pour le
 * compte d'un anonyme (SSRF). La vérification se fait donc :
 *  1. sur le littéral IP s'il y en a un ;
 *  2. sur CHAQUE adresse résolue, au moment même de la connexion (pas de
 *     fenêtre entre la vérification et l'usage, donc pas de « DNS
 *     rebinding ») ;
 *  3. à CHAQUE redirection, suivie à la main.
 */
const BLOCKED = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3],
] as const) {
  BLOCKED.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  BLOCKED.addSubnet(net, prefix, "ipv6");
}

/**
 * Adresse IPv4 embarquée dans une adresse IPv6 « mappée » (::ffff:a.b.c.d ou
 * ::ffff:XXXX:XXXX), ou `null`. Elle est contrôlée comme une IPv4 : sans
 * cela, ::ffff:127.0.0.1 joindrait la boucle locale. (Une règle IPv6
 * ::ffff:0:0/96 ne convient pas : `BlockList` l'applique aussi à TOUTES les
 * adresses IPv4.)
 */
function mappedIpv4(ipv6: string): string | null {
  const m = /^(?:0{0,4}:){0,5}:?ffff:(.+)$/i.exec(ipv6) ?? /^::ffff:(.+)$/i.exec(ipv6);
  if (!m) return null;
  const tail = m[1]!;
  if (isIP(tail) === 4) return tail;
  const hex = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(tail);
  if (!hex) return null;
  const hi = parseInt(hex[1]!, 16);
  const lo = parseInt(hex[2]!, 16);
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

export function isBlockedAddress(address: string): boolean {
  const bare = address.replace(/^\[|\]$/g, "");
  const family = isIP(bare);
  if (family === 0) return true;
  if (family === 6) {
    const v4 = mappedIpv4(bare);
    if (v4) return BLOCKED.check(v4, "ipv4");
  }
  return BLOCKED.check(bare, family === 4 ? "ipv4" : "ipv6");
}

/** Contrôle syntaxique du nom d'hôte, avant toute résolution. */
export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.+$/, "");
  if (!h) return true;
  const bare = h.replace(/^\[|\]$/g, "");
  if (isIP(bare)) return isBlockedAddress(bare);
  return (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.endsWith(".lan") ||
    h.endsWith(".home.arpa") ||
    !h.includes(".")
  );
}

export class BlockedTargetError extends Error {
  constructor() {
    super("Seules les adresses publiques peuvent être analysées.");
    this.name = "BlockedTargetError";
  }
}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void;

/** Résolution filtrée, appelée par la pile réseau au moment de la connexion. */
function guardedLookup(
  hostname: string,
  options: { all?: boolean; family?: number },
  callback: LookupCallback,
): void {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, []);
    const list = addresses as LookupAddress[];
    if (list.length === 0 || list.some((a) => isBlockedAddress(a.address))) {
      return callback(new BlockedTargetError() as NodeJS.ErrnoException, []);
    }
    if (options.all) return callback(null, list);
    const first = list[0]!;
    callback(null, first.address, first.family);
  });
}

const dispatcher = new Agent({
  connect: { lookup: guardedLookup as never },
});

const MAX_REDIRECTS = 5;

/**
 * `fetch` limité à l'internet public, redirections comprises.
 * Renvoie la dernière réponse et l'URL finale effectivement jointe.
 */
export async function safeFetch(
  input: string,
  init: Omit<UndiciInit, "redirect" | "dispatcher"> = {},
): Promise<{ response: Awaited<ReturnType<typeof undiciFetch>>; finalUrl: string }> {
  let current = new URL(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (current.protocol !== "http:" && current.protocol !== "https:") {
      throw new BlockedTargetError();
    }
    if (isBlockedHostname(current.hostname)) throw new BlockedTargetError();

    const response = await undiciFetch(current, { ...init, redirect: "manual", dispatcher });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      // Le corps d'une redirection n'est pas lu : on libère la connexion.
      await response.body?.cancel().catch(() => undefined);
      current = new URL(location, current);
      continue;
    }
    return { response, finalUrl: current.toString() };
  }
  throw new Error("Trop de redirections.");
}
