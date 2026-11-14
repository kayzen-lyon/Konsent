import { BlockList, isIP } from "node:net";
import { lookup } from "node:dns/promises";

/**
 * Garde réseau du navigateur du worker.
 *
 * `normalizeTarget` ne contrôle que l'adresse de départ. Chromium suit
 * ensuite les redirections et charge des sous-ressources : une page publique
 * pourrait le faire joindre 169.254.169.254 (métadonnées de l'hébergeur) ou
 * un service interne. Chaque requête du navigateur est donc interceptée, son
 * hôte résolu, et annulée s'il pointe vers une plage non publique.
 *
 * Copie volontaire de `lib/security/network.ts` : le worker est un service
 * autonome et ne dépend pas du code de l'application.
 */
const BLOCKED = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["224.0.0.0", 3],
] as const) BLOCKED.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [
  ["::", 128], ["::1", 128], ["64:ff9b::", 96], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
] as const) BLOCKED.addSubnet(net, prefix, "ipv6");

function mappedIpv4(ipv6: string): string | null {
  const m = /^::ffff:(.+)$/i.exec(ipv6);
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

const cache = new Map<string, Promise<boolean>>();

/** L'hôte résout-il exclusivement vers des adresses publiques ? */
export function isReachablePublicHost(hostname: string): Promise<boolean> {
  const h = hostname.toLowerCase().replace(/\.+$/, "").replace(/^\[|\]$/g, "");
  if (isIP(h)) return Promise.resolve(!isBlockedAddress(h));
  let pending = cache.get(h);
  if (!pending) {
    pending = lookup(h, { all: true })
      .then((list) => list.length > 0 && list.every((a) => !isBlockedAddress(a.address)))
      .catch(() => false);
    cache.set(h, pending);
    if (cache.size > 2000) cache.delete(cache.keys().next().value!);
  }
  return pending;
}
