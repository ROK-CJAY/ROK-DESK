export type TomPlayer = {
  name: string;
  playerId: string;
  division: "" | "juniors" | "seniors" | "masters";
  dropped?: boolean;
  recordW?: number;
  recordL?: number;
  recordD?: number;
  points?: number;
  standing?: number;
  oppWin?: number;
  oppOppWin?: number;
  birthDate?: string;
  trainerName?: string;
};

export type TomPairing = {
  table: number;
  p1: TomPlayer;
  p2: TomPlayer | null;
  bye: boolean;
};

export type TomReports = {
  eventName: string;
  roundLabel: string;
  currentRound: number;
  totalRounds: number;
  players: TomPlayer[];
  pairings: TomPairing[];
};

export function detectTomKind(name: string, html: string): "roster" | "pairings" | "standings" | "unknown" {
  const file = name.toLowerCase();
  if (file.includes("roster")) return "roster";
  if (file.includes("pairing")) return "pairings";
  if (file.includes("standing")) return "standings";
  const lower = html.toLowerCase();
  if (lower.includes("players_table")) return "roster";
  if (/\bstanding\b/.test(lower) && /\bpoints\b/.test(lower)) return "standings";
  if (/\btable\b/.test(lower) && (/\bplayer 1\b/.test(lower) || /\bfirst player\b/.test(lower) || /\bvs\b/.test(lower))) {
    return "pairings";
  }
  return "unknown";
}

export function parseTomFiles(files: { name: string; html: string }[]): TomReports {
  const out: TomReports = {
    eventName: "",
    roundLabel: "",
    currentRound: 0,
    totalRounds: 0,
    players: [],
    pairings: [],
  };
  const titles = new Set<string>();
  for (const file of files) {
    for (const title of headingTexts(file.html)) {
      if (!out.eventName) out.eventName = title;
      titles.add(title.trim().toLowerCase());
    }
  }
  const eventName = out.eventName;
  const byId = new Map<string, TomPlayer>();
  const byName = new Map<string, TomPlayer>();
  const upsert = (row: TomPlayer) => {
    const parsed = splitNameId(row.name);
    const name = parsed.name || cleanTomPlayerName(row.name);
    if (isJunkTomPlayerName(name, eventName, titles) && !row.playerId && !parsed.playerId) return;
    const next: TomPlayer = {
      ...row,
      name,
      playerId: row.playerId || parsed.playerId,
      division: row.division || parsed.division || "",
    };
    if (!next.name && !next.playerId) return;
    const nameKey = next.name.trim().toLowerCase();
    const prev = (next.playerId ? byId.get(next.playerId) : undefined) ?? (nameKey ? byName.get(nameKey) : undefined);
    const merged: TomPlayer = prev
      ? {
          ...prev,
          ...stripEmpty(next),
          name: preferPlayerName(prev.name, next.name),
          playerId: next.playerId || prev.playerId,
          division: next.division || prev.division,
        }
      : next;
    if (merged.playerId) byId.set(merged.playerId, merged);
    if (nameKey) byName.set(nameKey, merged);
    if (prev?.playerId && prev.playerId !== merged.playerId) byId.set(prev.playerId, merged);
    if (prev?.name) byName.set(prev.name.trim().toLowerCase(), merged);
  };

  for (const file of files) {
    const kind = detectTomKind(file.name, file.html);
    const rounds = parseRoundHeader(file.html);
    if (rounds.currentRound) {
      out.currentRound = rounds.currentRound;
      out.totalRounds = rounds.totalRounds || out.totalRounds;
      out.roundLabel = rounds.label || out.roundLabel;
    }
    if (kind === "roster") {
      for (const row of parseRoster(file.html, eventName, titles)) upsert(row);
    } else if (kind === "standings") {
      for (const row of parseStandings(file.html, eventName, titles)) upsert(row);
    } else if (kind === "pairings") {
      const parsed = parsePairings(file.html, eventName, titles);
      if (parsed.roundLabel && !out.roundLabel) out.roundLabel = parsed.roundLabel;
      if (parsed.currentRound) out.currentRound = parsed.currentRound;
      out.pairings = parsed.pairings;
      for (const match of parsed.pairings) {
        upsert(match.p1);
        if (match.p2) upsert(match.p2);
      }
    } else {
      const roster = parseRoster(file.html, eventName, titles);
      const standings = parseStandings(file.html, eventName, titles);
      const pairings = parsePairings(file.html, eventName, titles);
      for (const row of roster) upsert(row);
      for (const row of standings) upsert(row);
      if (pairings.pairings.length) {
        out.pairings = pairings.pairings;
        if (pairings.roundLabel) out.roundLabel = pairings.roundLabel;
        if (pairings.currentRound) out.currentRound = pairings.currentRound;
      }
    }
  }

  const seen = new Set<TomPlayer>();
  out.players = [...byId.values(), ...byName.values()]
    .filter((row) => {
      if (seen.has(row)) return false;
      seen.add(row);
      return !isJunkTomPlayerName(row.name, eventName, titles) || Boolean(row.playerId);
    })
    .sort((a, b) => (a.standing ?? 999) - (b.standing ?? 999) || a.name.localeCompare(b.name));
  if (!out.roundLabel && out.currentRound) {
    out.roundLabel = out.totalRounds ? `Round ${out.currentRound} of ${out.totalRounds}` : `Round ${out.currentRound}`;
  }
  return out;
}

export function sampleTomFiles(): { name: string; html: string }[] {
  return [
    { name: "sample-roster.html", html: SAMPLE_ROSTER },
    { name: "sample-standings.html", html: SAMPLE_STANDINGS },
    { name: "sample-pairings.html", html: SAMPLE_PAIRINGS },
  ];
}

const SAMPLE_TRAINERS: Record<string, string> = {
  "alex rivera": "RiveraVGC",
  "jordan hale": "HaleVGC",
  "sam ortiz": "OrtizVGC",
  "riley chen": "ChenVGC",
  "casey nguyen": "NguyenVGC",
  "morgan blake": "BlakeVGC",
  "quinn patel": "PatelVGC",
  "avery kim": "KimVGC",
};

export function withVgcSampleTrainers(reports: TomReports): TomReports {
  const add = (row: TomPlayer): TomPlayer => ({
    ...row,
    trainerName: row.trainerName || SAMPLE_TRAINERS[row.name.trim().toLowerCase()] || row.name.split(/\s+/)[0] || "",
  });
  return {
    ...reports,
    players: reports.players.map(add),
    pairings: reports.pairings.map((match) => ({
      ...match,
      p1: add(match.p1),
      p2: match.p2 ? add(match.p2) : null,
    })),
  };
}

const SAMPLE_PLAYER_IDS = new Set([
  "111111111111",
  "222222222222",
  "333333333333",
  "444444444444",
  "555555555555",
  "666666666666",
  "777777777777",
  "888888888888",
]);

const SAMPLE_PLAYER_NAMES = new Set([
  "alex rivera",
  "jordan hale",
  "sam ortiz",
  "riley chen",
  "casey nguyen",
  "morgan blake",
  "quinn patel",
  "avery kim",
]);

export const SAMPLE_EVENT_NAME = "ROK League Challenge";

export function isTomSamplePlayer(row: { name?: string; playerId?: string }): boolean {
  const id = String(row.playerId ?? "").replace(/\D/g, "");
  if (id && SAMPLE_PLAYER_IDS.has(id)) return true;
  return SAMPLE_PLAYER_NAMES.has(String(row.name ?? "").trim().toLowerCase());
}

export function hasTomSample(t: { name?: string; entrants?: { name?: string; playerId?: string }[] }): boolean {
  if ((t.name ?? "").trim() === SAMPLE_EVENT_NAME) return true;
  return (t.entrants ?? []).some(isTomSamplePlayer);
}

/** TOM pairings print `Name (W/L/T (pts) - MA)`. Keep the printed name only. */
export function cleanTomPlayerName(raw: string): string {
  let s = String(raw ?? "")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return "";
  const withParens = s.match(
    /^(.*?)\s*\(\s*\d+\s*[/\-]\s*\d+\s*[/\-]\s*\d+(?:\s*\(\s*\d+\s*\))?\s*[-–]\s*[A-Za-z]+\s*\)\s*$/,
  );
  if (withParens) return withParens[1]!.trim();
  const bare = s.match(
    /^(.*?)\s+\d+\s*[/\-]\s*\d+\s*[/\-]\s*\d+(?:\s*\(\s*\d+\s*\))?\s*[-–]\s*[A-Za-z]+\s*$/,
  );
  if (bare) return bare[1]!.trim();
  const idWrap = s.match(/^(.*?)\s*\(\s*\d{6,}\s*\)\s*$/);
  if (idWrap) return idWrap[1]!.trim();
  return s;
}

export function isJunkTomPlayerName(name: string, eventName = "", extraTitles?: Iterable<string>): boolean {
  const n = cleanTomPlayerName(name).trim();
  if (!n) return true;
  if (isHeaderName(n)) return true;
  const key = n.toLowerCase();
  if (eventName && key === eventName.trim().toLowerCase()) return true;
  if (extraTitles) {
    for (const title of extraTitles) {
      if (title && key === String(title).trim().toLowerCase()) return true;
    }
  }
  if (/^(pairings|standings|roster|players|player list|report|round\s+\d+(?:\s+of\s+\d+)?)\b/i.test(n)) return true;
  if (/\b(vg cup|league cup|league challenge|video game championships?|trading card)\b/i.test(n)) return true;
  if (
    /\b(worlds|regionals?|internationals?|championships?)\b/i.test(n) &&
    (/\b(at|cup|open|challenge)\b/i.test(n) || n.split(/\s+/).length >= 3)
  ) {
    return true;
  }
  if (/^\d+\s*[/\-]\s*\d+/.test(n)) return true;
  return false;
}

export function collapseTomEntrants<T extends { id: string; name: string; playerId?: string }>(
  rows: T[],
  eventName = "",
): { rows: T[]; idMap: Map<string, string> } {
  const kept: T[] = [];
  const idMap = new Map<string, string>();
  const byId = new Map<string, number>();
  const byName = new Map<string, number>();
  for (const row of rows) {
    const name = cleanTomPlayerName(row.name);
    if (isJunkTomPlayerName(name || row.name, eventName) && !row.playerId) continue;
    const nameKey = (name || row.name).trim().toLowerCase();
    const idx = (row.playerId ? byId.get(row.playerId) : undefined) ?? (nameKey ? byName.get(nameKey) : undefined);
    if (idx == null) {
      const next = { ...row, name: name || row.name };
      idMap.set(row.id, next.id);
      if (row.playerId) byId.set(row.playerId, kept.length);
      if (nameKey) byName.set(nameKey, kept.length);
      kept.push(next);
      continue;
    }
    const prev = kept[idx]!;
    idMap.set(row.id, prev.id);
    kept[idx] = {
      ...prev,
      name: preferPlayerName(prev.name, name || row.name),
      playerId: prev.playerId || row.playerId || "",
    };
  }
  return { rows: kept, idMap };
}

function preferPlayerName(a: string, b: string): string {
  const ca = cleanTomPlayerName(a);
  const cb = cleanTomPlayerName(b);
  const score = (s: string) => (/\d+\s*[/\-]\s*\d+/.test(s) ? 10 : 0) + s.length;
  if (!ca) return cb || a || b;
  if (!cb) return ca;
  return score(ca) <= score(cb) ? ca : cb;
}

function parseRoster(html: string, eventName = "", titles?: Set<string>): TomPlayer[] {
  const players: TomPlayer[] = [];
  for (const table of extractTables(html)) {
    const start = hasHeader(table.rows[0], ["name", "player", "id", "division"]) ? 1 : 0;
    const headers = start === 1 ? table.rows[0].map((c) => c.toLowerCase()) : [];
    const section = parseDivision(table.heading || table.caption);
    for (const row of table.rows.slice(start)) {
      if (row.length < 2) continue;
      if (row.some((c) => /^vs$/i.test(c.trim()))) continue;
      const rawName = cellBy(row, headers, ["name", "player", "first"]) || guessName(row);
      const parsed = splitNameId(rawName);
      const playerId = digits(cellBy(row, headers, ["id", "player id", "playerid"]) || parsed.playerId || guessId(row));
      const division = parsed.division || parseDivision(cellBy(row, headers, ["division", "age"]) || row[2] || "") || section;
      if (!parsed.name && !playerId) continue;
      if (isHeaderName(parsed.name) || isJunkTomPlayerName(parsed.name, eventName, titles)) continue;
      players.push({ name: parsed.name, playerId, division });
    }
  }
  return players;
}

function parseStandings(html: string, eventName = "", titles?: Set<string>): TomPlayer[] {
  const players: TomPlayer[] = [];
  const tables = extractTables(html);
  const hasDivisions = tables.some((table) => parseDivision(table.heading || table.caption));
  for (const table of tables) {
    const heading = table.heading || table.caption;
    if (hasDivisions && isCombinedTomSection(heading)) continue;
    const section = parseDivision(heading);
    const start = hasHeader(table.rows[0], ["standing", "name", "record", "points"]) ? 1 : 0;
    for (const row of table.rows.slice(start)) {
      if (row.length < 5) continue;
      const standing = Number(row[0].replace(/[^\d]/g, "")) || 0;
      const parsed = splitNameId(row[1] ?? "");
      if (!parsed.name || isHeaderName(parsed.name) || isJunkTomPlayerName(parsed.name, eventName, titles)) continue;
      const record = parseRecord(row.find((c, i) => i >= 3 && /\d/.test(c) && /[-/]/.test(c)) ?? row[4] ?? "");
      const points = Number((row[5] ?? "").replace(/[^\d.]/g, "")) || record.w * 3 + record.d;
      const opp = parsePct(row[6] ?? "");
      const oppOpp = parsePct(row[7] ?? "");
      const drop = Number((row[3] ?? "").replace(/[^\d]/g, "")) || 0;
      players.push({
        name: parsed.name,
        playerId: parsed.playerId,
        division: parsed.division || section,
        dropped: drop > 0,
        standing,
        recordW: record.w,
        recordL: record.l,
        recordD: record.d,
        points,
        oppWin: opp,
        oppOppWin: oppOpp,
      });
    }
  }
  return players;
}

function parsePairings(
  html: string,
  eventName = "",
  titles?: Set<string>,
): { pairings: TomPairing[]; currentRound: number; roundLabel: string } {
  const rounds = parseRoundHeader(html);
  const pairings: TomPairing[] = [];
  const seen = new Set<number>();
  for (const table of extractTables(html)) {
    const section = parseDivision(table.heading || table.caption);
    const start = hasHeader(table.rows[0], ["table", "player", "vs"]) ? 1 : 0;
    for (const row of table.rows.slice(start)) {
      if (row.length < 2) continue;
      const tableNo = Number((row[0] ?? "").replace(/[^\d]/g, ""));
      if (!tableNo || seen.has(tableNo)) continue;
      const p1raw = row[1] ?? "";
      const p2raw = row[3] ?? row[2] ?? "";
      if (isHeaderName(p1raw) || /^table$/i.test(p1raw)) continue;
      const p1 = splitNameId(p1raw);
      if (!p1.name || isJunkTomPlayerName(p1.name, eventName, titles)) continue;
      const p2 = splitNameId(p2raw);
      const bye = !p2.name || isBye(p2.name) || isJunkTomPlayerName(p2.name, eventName, titles);
      seen.add(tableNo);
      pairings.push({
        table: tableNo,
        p1: { name: p1.name, playerId: p1.playerId, division: p1.division || section },
        p2: bye ? null : { name: p2.name, playerId: p2.playerId, division: p2.division || section },
        bye,
      });
    }
  }
  pairings.sort((a, b) => a.table - b.table);
  return { pairings, currentRound: rounds.currentRound, roundLabel: rounds.label };
}

function extractTables(html: string): { caption: string; heading: string; rows: string[][] }[] {
  const tables: { caption: string; heading: string; rows: string[][] }[] = [];
  const tableRe = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let match: RegExpExecArray | null;
  while ((match = tableRe.exec(html))) {
    const body = match[1] ?? "";
    const caption = decode(body.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i)?.[1] ?? "");
    const before = html.slice(Math.max(0, match.index - 2500), match.index);
    const heads = [...before.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
    const heading = decode(heads.at(-1)?.[2] ?? "");
    const rows: string[][] = [];
    const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let tr: RegExpExecArray | null;
    while ((tr = trRe.exec(body))) {
      const cells: string[] = [];
      const tdRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let td: RegExpExecArray | null;
      while ((td = tdRe.exec(tr[1] ?? ""))) cells.push(decode(td[1] ?? ""));
      if (cells.some(Boolean)) rows.push(cells);
    }
    if (rows.length) tables.push({ caption, heading, rows });
  }
  return tables;
}

export function tomHeadingsFromHtml(html: string): { eventName: string; roundLabel: string } {
  return { eventName: headingTexts(html)[0] ?? "", roundLabel: parseRoundHeader(html).label };
}

export type TomGameKind = "tcg" | "vg" | "go" | "unknown";

/** TOM Step 1 Game Type: Trading Card Game, Video Game, or GO. */
export function detectTomGameKind(text: string): TomGameKind {
  const t = String(text ?? "").toLowerCase();
  const vg =
    /\bvideo\s*game\b/.test(t) ||
    /gametype\s*=\s*["']?video_game["']?/.test(t) ||
    /\bvg\s*(cup|challenge|championship|premier)\b/.test(t) ||
    /\bvgc\b/.test(t);
  const tcg =
    /\btrading\s*card\b/.test(t) ||
    /gametype\s*=\s*["']?trading_card_game["']?/.test(t) ||
    /\btcg\s*(league|cup|championship|prerelease|draft|premier|one[\s-]?day|two[\s-]?day)\b/.test(t) ||
    /\bptcg\b/.test(t);
  const go =
    /\bpok[eé]mon\s*go\b/.test(t) ||
    /\bgo\s*(cup|challenge)\b/.test(t) ||
    /gametype\s*=\s*["']?go["']?/.test(t);
  if (go && !vg && !tcg) return "go";
  if (vg && !tcg) return "vg";
  if (tcg && !vg) return "tcg";
  return "unknown";
}

/** Route a TOM HTML report onto PTCG vs VGC and Masters / Seniors / Juniors. TCG never lands on VGC. */
export function inferTomTitle(
  eventName: string,
  fallback:
    | "pokemon-vgc"
    | "pokemon-vgc-seniors"
    | "pokemon-vgc-juniors"
    | "pokemon-tcg"
    | "pokemon-tcg-seniors"
    | "pokemon-tcg-juniors",
  extra: { html?: string; players?: { division?: string }[] } = {},
): typeof fallback {
  const blob = `${eventName}\n${extra.html ?? ""}`;
  const kind = detectTomGameKind(blob);
  let division = parseDivision(eventName);
  if (!division && extra.players?.length) {
    const counts = { juniors: 0, seniors: 0, masters: 0 };
    for (const row of extra.players) {
      if (row.division === "juniors" || row.division === "seniors" || row.division === "masters") {
        counts[row.division] += 1;
      }
    }
    const ranked = (["juniors", "seniors", "masters"] as const).slice().sort((a, b) => counts[b] - counts[a]);
    if (counts[ranked[0]!] > 0) division = ranked[0]!;
  }
  if (!division) division = parseDivision(fallback) || "masters";
  const vgc = kind === "vg" ? true : kind === "tcg" ? false : fallback.includes("vgc");
  if (vgc) {
    if (division === "seniors") return "pokemon-vgc-seniors";
    if (division === "juniors") return "pokemon-vgc-juniors";
    return "pokemon-vgc";
  }
  if (division === "seniors") return "pokemon-tcg-seniors";
  if (division === "juniors") return "pokemon-tcg-juniors";
  return "pokemon-tcg";
}

export type TomAgeDivision = "juniors" | "seniors" | "masters";

/** Play! Pokémon 5.2.1 — minimum for an age-separated pod. */
export const TOM_MIN_AGE_POD = 6;

/**
 * Age-combined Swiss (handbook 5.2.1).
 * Juniors < 6 combine with Seniors; if still < 6, both join Masters.
 * Seniors < 6 (with Juniors already ≥ 6) join Masters.
 * If only Masters is < 6, Masters join Seniors.
 * Combined pods share Swiss pairings only; each division keeps its own standings.
 */
export function ageCombinedSwissGroups(counts: Record<TomAgeDivision, number>): TomAgeDivision[][] {
  const j = counts.juniors;
  const s = counts.seniors;
  const m = counts.masters;
  const groups: TomAgeDivision[][] = [];
  if (j) groups.push(["juniors"]);
  if (s) groups.push(["seniors"]);
  if (m) groups.push(["masters"]);

  const sizeOf = (group: TomAgeDivision[]) => group.reduce((n, d) => n + counts[d], 0);
  const find = (d: TomAgeDivision) => groups.findIndex((g) => g.includes(d));
  const merge = (a: TomAgeDivision, b: TomAgeDivision) => {
    const ia = find(a);
    const ib = find(b);
    if (ia < 0 || ib < 0 || ia === ib) return;
    const [lo, hi] = ia < ib ? [ia, ib] : [ib, ia];
    const combined = [...groups[lo]!, ...groups[hi]!];
    groups.splice(hi, 1);
    groups.splice(lo, 1, combined);
  };

  if (j > 0 && j < TOM_MIN_AGE_POD && s > 0) merge("juniors", "seniors");
  const juniorGroup = find("juniors") >= 0 ? groups[find("juniors")]! : [];
  if (j > 0 && sizeOf(juniorGroup) < TOM_MIN_AGE_POD && m > 0) merge("juniors", "masters");
  if (s > 0 && s < TOM_MIN_AGE_POD && m > 0 && !(j > 0 && j < TOM_MIN_AGE_POD)) merge("seniors", "masters");
  if (m > 0 && m < TOM_MIN_AGE_POD && s > 0) merge("masters", "seniors");
  return groups;
}

export function ageCombinedSwissHost(group: TomAgeDivision[]): TomAgeDivision {
  if (group.includes("masters")) return "masters";
  if (group.includes("seniors")) return "seniors";
  return "juniors";
}

export function titleForTomDivision(
  division: TomAgeDivision,
  fallback: Parameters<typeof inferTomTitle>[1],
  kind: TomGameKind,
): Parameters<typeof inferTomTitle>[1] {
  return inferTomTitle(division, fallback, { html: kind === "vg" ? "video game" : kind === "tcg" ? "trading card" : "" });
}

/** One TOM event can list Masters, Seniors, and Juniors in the same standings file. */
export function splitTomReportsByDivision(
  reports: TomReports,
): { division: TomAgeDivision; reports: TomReports; swissHost: TomAgeDivision }[] {
  const buckets: Record<TomAgeDivision | "other", TomPlayer[]> = {
    juniors: [],
    seniors: [],
    masters: [],
    other: [],
  };
  for (const row of reports.players) {
    if (row.division === "juniors" || row.division === "seniors" || row.division === "masters") {
      buckets[row.division].push(row);
    } else {
      buckets.other.push(row);
    }
  }
  const counts = {
    juniors: buckets.juniors.length,
    seniors: buckets.seniors.length,
    masters: buckets.masters.length,
  };
  const present = (["juniors", "seniors", "masters"] as const).filter((d) => counts[d] > 0);
  if (present.length <= 1) {
    const division = present[0] ?? "masters";
    return [
      {
        division,
        swissHost: division,
        reports: { ...reports, players: [...buckets[division], ...buckets.other] },
      },
    ];
  }
  const groups = ageCombinedSwissGroups(counts);
  const defaultHost = ageCombinedSwissHost(groups.find((g) => g.includes("masters")) ?? groups[0] ?? ["masters"]);
  buckets[defaultHost].push(...buckets.other);

  return present.map((division) => {
    const group = groups.find((g) => g.includes(division)) ?? [division];
    const swissHost = ageCombinedSwissHost(group);
    const names = new Set(buckets[division].map((p) => p.name.trim().toLowerCase()));
    const isHost = division === swissHost && group.length > 1;
    const players = isHost ? group.flatMap((d) => buckets[d]) : buckets[division];
    const pairings = isHost
      ? reports.pairings
      : reports.pairings.filter((match) => {
          const p1 = names.has(match.p1.name.trim().toLowerCase());
          const p2 = !match.p2 || names.has(match.p2.name.trim().toLowerCase());
          return p1 && p2;
        });
    return { division, swissHost, reports: { ...reports, players, pairings } };
  });
}

function isCombinedTomSection(raw: string): boolean {
  return /^(all|combined|overall|total)\b/i.test(raw.trim());
}

function headingTexts(html: string): string[] {
  const found: string[] = [];
  const push = (raw: string) => {
    let text = decode(raw);
    text = text.replace(/\s*[-–:|]\s*(pairings|standings|roster|report|player list).*$/i, "").trim();
    if (!text) return;
    if (/^(pairings|standings|roster|report|players|player list|round\s+\d+)/i.test(text)) return;
    if (!found.some((x) => x.toLowerCase() === text.toLowerCase())) found.push(text);
  };
  for (const m of html.matchAll(/<(?:h[1-3]|title)\b[^>]*>([\s\S]*?)<\/(?:h[1-3]|title)>/gi)) push(m[1] ?? "");
  for (const m of html.matchAll(/<font\b[^>]*size\s*=\s*["']?[4-7]["']?[^>]*>([\s\S]*?)<\/font>/gi)) push(m[1] ?? "");
  return found;
}

function parseRoundHeader(html: string): { currentRound: number; totalRounds: number; label: string } {
  const heads = [...html.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((m) => decode(m[1] ?? ""));
  for (const line of heads) {
    const both = line.match(/round\s+(\d+)\s+of\s+(\d+)/i);
    if (both) {
      return { currentRound: Number(both[1]), totalRounds: Number(both[2]), label: `Round ${both[1]} of ${both[2]}` };
    }
    const one = line.match(/round\s+(\d+)/i);
    if (one) return { currentRound: Number(one[1]), totalRounds: 0, label: `Round ${one[1]}` };
    if (/quarter|semi|final/i.test(line)) return { currentRound: 0, totalRounds: 0, label: line };
  }
  return { currentRound: 0, totalRounds: 0, label: "" };
}

function decode(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&/gi, "&")
    .replace(/</gi, "<")
    .replace(/>/gi, ">")
    .replace(/"/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function splitNameId(raw: string): { name: string; playerId: string; division: TomPlayer["division"] } {
  const clean = raw.replace(/\*+/g, "").trim();
  const name = cleanTomPlayerName(clean);
  const rest = name && clean.startsWith(name) ? clean.slice(name.length) : clean;
  const idInParens = digits(rest.match(/\(\s*(\d{6,})\s*\)/)?.[1] ?? "");
  const division = parseDivision(rest);
  return { name, playerId: idInParens, division };
}

function digits(raw: string): string {
  const m = raw.match(/\d{6,}/);
  return m ? m[0] : raw.replace(/\D/g, "").length >= 6 ? raw.replace(/\D/g, "") : "";
}

function parseDivision(raw: string): TomPlayer["division"] {
  const t = raw.toLowerCase();
  if (t.includes("junior") || /\bjr\b/.test(t)) return "juniors";
  if (t.includes("senior") || /\bsr\b/.test(t)) return "seniors";
  if (t.includes("master") || /\bma\b/.test(t) || /\bmd\b/.test(t)) return "masters";
  return "";
}

function parseRecord(raw: string): { w: number; l: number; d: number } {
  const nums = (raw.match(/\d+/g) ?? []).map(Number);
  return { w: nums[0] ?? 0, l: nums[1] ?? 0, d: nums[2] ?? 0 };
}

function parsePct(raw: string): number {
  const n = Number(raw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return n > 1 ? n / 100 : n;
}

function isBye(name: string): boolean {
  return /^(bye|—|-|none)$/i.test(name.trim());
}

function isHeaderName(name: string): boolean {
  return /^(player|name|first player|second player|player 1|player 2|table|vs|record|standing|standings|points|division|id|player id|pairings|roster|players|player list)$/i.test(
    name.trim(),
  );
}

function hasHeader(row: string[] | undefined, needles: string[]): boolean {
  if (!row) return false;
  const blob = row.join(" ").toLowerCase();
  return needles.some((n) => blob.includes(n));
}

function cellBy(row: string[], headers: string[], names: string[]): string {
  for (const name of names) {
    const exact = headers.findIndex((h) => h === name);
    if (exact >= 0 && row[exact]) return row[exact];
  }
  const ordered = [...names].sort((a, b) => b.length - a.length);
  for (const name of ordered) {
    const i = headers.findIndex((h) => h.includes(name));
    if (i >= 0 && row[i]) return row[i];
  }
  return "";
}

function guessName(row: string[]): string {
  return row.find((c) => /[a-z]/i.test(c) && !/^\d+$/.test(c) && !isHeaderName(c)) ?? "";
}

function guessId(row: string[]): string {
  return row.find((c) => /\d{6,}/.test(c)) ?? "";
}

function stripEmpty(row: TomPlayer): Partial<TomPlayer> {
  const next: Partial<TomPlayer> = {};
  for (const [key, value] of Object.entries(row) as [keyof TomPlayer, TomPlayer[keyof TomPlayer]][]) {
    if (value === "" || value == null) continue;
    (next as Record<string, unknown>)[key] = value;
  }
  return next;
}

const SAMPLE_ROSTER = `<html><body>
<h1>ROK League Challenge</h1>
<table class="players_table">
<tr><th>#</th><th>Name</th><th>Division</th><th>Player ID</th></tr>
<tr><td>1</td><td>Alex Rivera</td><td>Masters</td><td>111111111111</td></tr>
<tr><td>2</td><td>Jordan Hale</td><td>Masters</td><td>222222222222</td></tr>
<tr><td>3</td><td>Sam Ortiz</td><td>Seniors</td><td>333333333333</td></tr>
<tr><td>4</td><td>Riley Chen</td><td>Masters</td><td>444444444444</td></tr>
<tr><td>5</td><td>Casey Nguyen</td><td>Masters</td><td>555555555555</td></tr>
<tr><td>6</td><td>Morgan Blake</td><td>Juniors</td><td>666666666666</td></tr>
<tr><td>7</td><td>Quinn Patel</td><td>Masters</td><td>777777777777</td></tr>
<tr><td>8</td><td>Avery Kim</td><td>Seniors</td><td>888888888888</td></tr>
</table>
</body></html>`;

const SAMPLE_STANDINGS = `<html><body>
<h3>Round 3 of 5</h3>
<h2>Master Standings</h2>
<table class="report">
<tr><th>Standing</th><th>Name</th><th>Flight</th><th>Drop</th><th>Record</th><th>Points</th><th>Opp%</th><th>OppOpp%</th></tr>
<tr><td>1</td><td>Alex Rivera</td><td>1</td><td>0</td><td>3 / 0 / 0</td><td>9</td><td>55.56%</td><td>50.00%</td></tr>
<tr><td>2</td><td>Jordan Hale</td><td>1</td><td>0</td><td>2 / 1 / 0</td><td>6</td><td>66.67%</td><td>48.15%</td></tr>
<tr><td>3</td><td>Riley Chen</td><td>1</td><td>0</td><td>2 / 1 / 0</td><td>6</td><td>44.44%</td><td>51.85%</td></tr>
<tr><td>4</td><td>Casey Nguyen</td><td>1</td><td>0</td><td>1 / 2 / 0</td><td>3</td><td>55.56%</td><td>51.85%</td></tr>
<tr><td>5</td><td>Quinn Patel</td><td>1</td><td>0</td><td>1 / 2 / 0</td><td>3</td><td>44.44%</td><td>48.15%</td></tr>
<tr><td>6</td><td>Morgan Blake</td><td>1</td><td>0</td><td>0 / 3 / 0</td><td>0</td><td>66.67%</td><td>50.00%</td></tr>
</table>
</body></html>`;

const SAMPLE_PAIRINGS = `<html><body>
<h3>Round 4</h3>
<table class="report">
<tbody>
<tr><td>Table</td><td>Player 1</td><td></td><td>Player 2</td></tr>
<tr><td>1</td><td>Alex Rivera (111111111111)</td><td>vs</td><td>Jordan Hale (222222222222)</td></tr>
<tr><td>2</td><td>Riley Chen (444444444444)</td><td>vs</td><td>Sam Ortiz (333333333333)</td></tr>
<tr><td>3</td><td>Casey Nguyen (555555555555)</td><td>vs</td><td>Quinn Patel (777777777777)</td></tr>
<tr><td>4</td><td>Avery Kim (888888888888)</td><td>vs</td><td>Morgan Blake (666666666666)</td></tr>
</tbody>
</table>
</body></html>`;
