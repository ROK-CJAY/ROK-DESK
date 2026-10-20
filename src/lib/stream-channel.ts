/** Parse a stream handle or URL for the Live badge and slates. */

export type StreamPlatform = "twitch" | "youtube" | "x" | "tiktok";

export const STREAM_PLATFORMS: { id: StreamPlatform; label: string }[] = [
  { id: "twitch", label: "Twitch" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X" },
  { id: "tiktok", label: "TikTok" },
];

export function coerceStreamPlatform(value: unknown): StreamPlatform {
  return value === "youtube" || value === "x" || value === "tiktok" || value === "twitch" ? value : "twitch";
}

export type StreamChannelRow = {
  platform: StreamPlatform;
  handle: string;
  note: string;
};

export function blankStreamChannel(): StreamChannelRow {
  return { platform: "twitch", handle: "", note: "" };
}

export function streamChannelsOf(desk: {
  streamChannel: string;
  streamPlatform: StreamPlatform;
  streamChannels?: StreamChannelRow[];
}): StreamChannelRow[] {
  if (desk.streamChannels?.length) return desk.streamChannels;
  if (desk.streamChannel.trim()) return [{ platform: desk.streamPlatform, handle: desk.streamChannel, note: "" }];
  return [];
}

export function syncPrimaryChannel(rows: StreamChannelRow[]) {
  const first = rows.find((row) => row.handle.trim()) ?? rows[0];
  return {
    streamChannels: rows,
    streamChannel: first?.handle.trim() ?? "",
    streamPlatform: first?.platform ?? "twitch",
  };
}

const PLATFORM_ON_AIR: Record<StreamPlatform, string> = {
  twitch: "Twitch",
  youtube: "YouTube",
  x: "X",
  tiktok: "TikTok",
};

export function streamProfileName(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (!looksLikeUrl(raw)) return handleOf(raw);
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    const name = parts[parts.length - 1] ?? "";
    return name.replace(/^@/, "");
  } catch {
    return handleOf(raw);
  }
}

/** Hold slates: "Live on YouTube @channel". */
export function streamLiveOn(row: StreamChannelRow): string {
  const name = streamProfileName(row.handle);
  if (!name) return row.note.trim();
  const line = `Live on ${PLATFORM_ON_AIR[row.platform]} @${name}`;
  return row.note.trim() ? `${line} · ${row.note.trim()}` : line;
}

export function streamChannelLine(row: StreamChannelRow): string {
  const label = streamChannelLabel(row.handle, row.platform);
  if (!label) return row.note.trim();
  return row.note.trim() ? `${label} · ${row.note.trim()}` : label;
}

function handleOf(value: string): string {
  return value.trim().replace(/^@/, "");
}

function looksLikeUrl(value: string): boolean {
  return value.includes("://") || value.includes(".");
}

export function streamChannelLabel(value: string, platform: StreamPlatform = "twitch"): string {
  const raw = value.trim();
  if (!raw) return "";
  if (!looksLikeUrl(raw)) {
    const handle = handleOf(raw);
    if (!handle) return "";
    if (platform === "youtube") return `youtube.com/@${handle}`;
    if (platform === "x") return `x.com/${handle}`;
    if (platform === "tiktok") return `tiktok.com/@${handle}`;
    return `twitch.tv/${handle}`;
  }
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
    if (host === "x.com" || host === "twitter.com") {
      const name = path.split("/").filter(Boolean)[0] ?? "";
      return name ? `x.com/${name}` : host;
    }
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
      const name = path.split("/").filter(Boolean)[0] ?? "";
      return name ? `tiktok.com/${name}` : host;
    }
    if (path && path !== "/") return `${host}${path}`;
    return host;
  } catch {
    return handleOf(raw);
  }
}

export function streamChannelUrl(value: string, platform: StreamPlatform = "twitch"): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(www\.)?(twitch\.tv|kick\.com|youtube\.com|youtu\.be|x\.com|twitter\.com|tiktok\.com)\//i.test(raw)) {
    return `https://${raw.replace(/^\/\//, "")}`;
  }
  const handle = handleOf(raw);
  if (!handle || /\s/.test(handle)) return null;
  if (platform === "youtube") return `https://www.youtube.com/@${handle}`;
  if (platform === "x") return `https://x.com/${handle}`;
  if (platform === "tiktok") return `https://www.tiktok.com/@${handle}`;
  return `https://twitch.tv/${handle}`;
}
