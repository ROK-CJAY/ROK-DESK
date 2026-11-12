/**
 * Who may touch the host's own start.gg login and the strike-tablet login.
 * No runtime imports so node tests can load it.
 */

/** A request that came from this PC (the host's own desk window), not from a client on the LAN. */
export function isLoopbackRequest(requestUrl: string): boolean {
  try {
    const host = new URL(requestUrl).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "[::1]";
  } catch {
    return false;
  }
}

/** The TCP peer is this PC. Undefined (runtime gave no address) falls back to the URL check. */
export function isLoopbackPeer(ip: string | undefined | null): boolean | null {
  if (ip == null || ip === "") return null;
  const value = ip.trim().toLowerCase();
  return value === "::1" || value.startsWith("127.") || value.startsWith("::ffff:127.");
}

/**
 * Request from the host's own window: the URL host is loopback AND (when the runtime reports it)
 * the socket peer is loopback, so a LAN client cannot pass by sending "Host: 127.0.0.1".
 */
export function fromThisPc(requestUrl: string, peerIp: string | undefined | null): boolean {
  if (!isLoopbackRequest(requestUrl)) return false;
  return isLoopbackPeer(peerIp) !== false;
}

/**
 * Binding (or clearing) the strike-tablet login: the host's own window may do it automatically,
 * anyone else only by pressing "Use my login for strike tablets" (explicit) and confirming.
 */
export function mayBindTablets(requestUrl: string, peerIp: string | undefined | null, explicit: unknown): boolean {
  return fromThisPc(requestUrl, peerIp) || explicit === true;
}

/** Desk pages that run on the host PC (or the hosted website) bind the tablets automatically. */
export function autoBindsTablets(page: { hostname: string; origin: string }, mode: "host" | "client" | "web", website: string): boolean {
  if (mode === "client") return false;
  return page.hostname === "127.0.0.1" || page.hostname === "localhost" || mode === "host" || page.origin === website;
}
