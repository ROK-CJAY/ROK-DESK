/** Parse a stream handle or URL for the Live badge and slates. */

export function streamChannelLabel(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "");
    if (host === "twitch.tv" || host.endsWith(".twitch.tv")) {
      const name = path.split("/").filter(Boolean)[0] ?? "";
      return name ? `twitch.tv/${name}` : host;
    }
    if (host === "kick.com") {
      const name = path.split("/").filter(Boolean)[0] ?? "";
      return name ? `kick.com/${name}` : host;
    }
    if (host === "youtube.com" || host === "youtu.be") {
      return raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    }
    if (path && path !== "/") return `${host}${path}`;
    return host;
  } catch {
    return raw.replace(/^@/, "");
  }
}

export function streamChannelUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(www\.)?(twitch\.tv|kick\.com|youtube\.com|youtu\.be|tiktok\.com)\//i.test(raw)) {
    return `https://${raw.replace(/^\/\//, "")}`;
  }
  const handle = raw.replace(/^@/, "");
  if (/^[a-zA-Z0-9_]{2,25}$/.test(handle)) return `https://twitch.tv/${handle}`;
  return null;
}
