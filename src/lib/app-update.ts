export const UPDATE_OWNER = "ROK-CJAY";
export const UPDATE_REPO = "ROK-DESK";
export const UPDATE_RELEASES_URL = `https://github.com/${UPDATE_OWNER}/${UPDATE_REPO}/releases`;

export type AppUpdateStatus = {
  status: "idle" | "checking" | "available" | "downloading" | "ready" | "current" | "error";
  current: string;
  latest?: string;
  url?: string;
  notes?: string;
  percent?: number;
  canInstall?: boolean;
  message?: string;
};

export function normalizeVersion(raw: string): string {
  return String(raw || "")
    .trim()
    .replace(/^v/i, "");
}

type Parts = { major: number; minor: number; patch: number; pre: string };

export function parseVersion(raw: string): Parts | null {
  const s = normalizeVersion(raw);
  const m = s.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre: m[4] ?? "" };
}

/** >0 if a is newer than b. */
export function compareVersion(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  if (left.patch !== right.patch) return left.patch - right.patch;
  if (!left.pre && !right.pre) return 0;
  if (!left.pre) return 1;
  if (!right.pre) return -1;
  return left.pre < right.pre ? -1 : left.pre > right.pre ? 1 : 0;
}

export function isNewerVersion(latest: string, current: string): boolean {
  return compareVersion(latest, current) > 0;
}

type GithubRelease = {
  tag_name?: string;
  html_url?: string;
  body?: string | null;
  draft?: boolean;
  prerelease?: boolean;
};

export function pickGithubRelease(rows: GithubRelease[]): GithubRelease | null {
  for (const row of rows) {
    if (!row || row.draft) continue;
    if (!row.tag_name) continue;
    return row;
  }
  return null;
}

export function releaseToStatus(current: string, release: GithubRelease | null): AppUpdateStatus {
  const latest = release?.tag_name ? normalizeVersion(release.tag_name) : "";
  if (!latest) {
    return { status: "error", current, message: "No GitHub release found.", url: UPDATE_RELEASES_URL };
  }
  if (!isNewerVersion(latest, current)) {
    return { status: "current", current, latest, url: release?.html_url || UPDATE_RELEASES_URL };
  }
  return {
    status: "available",
    current,
    latest,
    url: release?.html_url || UPDATE_RELEASES_URL,
    notes: (release?.body || "").trim().slice(0, 480),
    canInstall: false,
  };
}

export async function fetchGithubUpdate(current: string): Promise<AppUpdateStatus> {
  const url = `https://api.github.com/repos/${UPDATE_OWNER}/${UPDATE_REPO}/releases?per_page=15`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "ROK-Desk",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    return {
      status: "error",
      current,
      url: UPDATE_RELEASES_URL,
      message: `GitHub ${res.status}`,
    };
  }
  const rows = (await res.json()) as GithubRelease[];
  if (!Array.isArray(rows)) {
    return { status: "error", current, url: UPDATE_RELEASES_URL, message: "Unexpected GitHub response." };
  }
  return releaseToStatus(current, pickGithubRelease(rows));
}
