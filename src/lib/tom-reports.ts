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
  const byId = new Map<string, TomPlayer>();
  const byName = new Map<string, TomPlayer>();
  const upsert = (row: TomPlayer) => {
    if (!row.name && !row.playerId) return;
    const nameKey = row.name.trim().toLowerCase();
    const prev = (row.playerId ? byId.get(row.playerId) : undefined) ?? (nameKey ? byName.get(nameKey) : undefined);
    const merged: TomPlayer = prev ? { ...prev, ...stripEmpty(row), name: row.name || prev.name, playerId: row.playerId || prev.playerId } : row;
    if (merged.playerId) byId.set(merged.playerId, merged);
    if (nameKey) byName.set(nameKey, merged);
    if (prev?.playerId && prev.playerId !== merged.playerId) byId.set(prev.playerId, merged);
    if (prev?.name) byName.set(prev.name.trim().toLowerCase(), merged);
  };

  for (const file of files) {
    const kind = detectTomKind(file.name, file.html);
    const title = headingText(file.html);
    if (title && !out.eventName) out.eventName = title;
    const rounds = parseRoundHeader(file.html);
    if (rounds.currentRound) {
      out.currentRound = rounds.currentRound;
      out.totalRounds = rounds.totalRounds || out.totalRounds;
      out.roundLabel = rounds.label || out.roundLabel;
    }
    if (kind === "roster") {
      for (const row of parseRoster(file.html)) upsert(row);
    } else if (kind === "standings") {
      for (const row of parseStandings(file.html)) upsert(row);
    } else if (kind === "pairings") {
      const parsed = parsePairings(file.html);
      if (parsed.roundLabel && !out.roundLabel) out.roundLabel = parsed.roundLabel;
      if (parsed.currentRound) out.currentRound = parsed.currentRound;
      out.pairings = parsed.pairings;
      for (const match of parsed.pairings) {
        upsert(match.p1);
        if (match.p2) upsert(match.p2);
      }
    } else {
      const roster = parseRoster(file.html);
      const standings = parseStandings(file.html);
      const pairings = parsePairings(file.html);
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
      return true;
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

function parseRoster(html: string): TomPlayer[] {
  const players: TomPlayer[] = [];
  for (const table of extractTables(html)) {
    const start = hasHeader(table.rows[0], ["name", "player", "id", "division"]) ? 1 : 0;
    const headers = start === 1 ? table.rows[0].map((c) => c.toLowerCase()) : [];
    for (const row of table.rows.slice(start)) {
      if (row.length < 2) continue;
      const name = cellBy(row, headers, ["name", "player", "first"]) || guessName(row);
      const playerId = digits(cellBy(row, headers, ["id", "player id", "playerid"]) || guessId(row));
      const division = parseDivision(cellBy(row, headers, ["division", "age"]) || row[2] || "");
      if (!name && !playerId) continue;
      if (isHeaderName(name)) continue;
      players.push({ name: nameFrom(name), playerId, division });
    }
  }
  return players;
}

function parseStandings(html: string): TomPlayer[] {
  const players: TomPlayer[] = [];
  for (const table of extractTables(html)) {
    const start = hasHeader(table.rows[0], ["standing", "name", "record", "points"]) ? 1 : 0;
    for (const row of table.rows.slice(start)) {
      if (row.length < 5) continue;
      const standing = Number(row[0].replace(/[^\d]/g, "")) || 0;
      const parsed = splitNameId(row[1] ?? "");
      if (!parsed.name || isHeaderName(parsed.name)) continue;
      const record = parseRecord(row.find((c, i) => i >= 3 && /\d/.test(c) && /[-/]/.test(c)) ?? row[4] ?? "");
      const points = Number((row[5] ?? "").replace(/[^\d.]/g, "")) || record.w * 3 + record.d;
      const opp = parsePct(row[6] ?? "");
      const oppOpp = parsePct(row[7] ?? "");
      const drop = Number((row[3] ?? "").replace(/[^\d]/g, "")) || 0;
      players.push({
        name: parsed.name,
        playerId: parsed.playerId,
        division: parseDivision(table.caption),
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

function parsePairings(html: string): { pairings: TomPairing[]; currentRound: number; roundLabel: string } {
  const rounds = parseRoundHeader(html);
  const pairings: TomPairing[] = [];
  const seen = new Set<number>();
  for (const table of extractTables(html)) {
    const start = hasHeader(table.rows[0], ["table", "player", "vs"]) ? 1 : 0;
    for (const row of table.rows.slice(start)) {
      if (row.length < 2) continue;
      const tableNo = Number((row[0] ?? "").replace(/[^\d]/g, ""));
      if (!tableNo || seen.has(tableNo)) continue;
      const p1raw = row[1] ?? "";
      const p2raw = row[3] ?? row[2] ?? "";
      if (isHeaderName(p1raw) || /^table$/i.test(p1raw)) continue;
      const p1 = splitNameId(p1raw);
      if (!p1.name) continue;
      const p2 = splitNameId(p2raw);
      const bye = !p2.name || isBye(p2.name);
      seen.add(tableNo);
      pairings.push({
        table: tableNo,
        p1: { name: p1.name, playerId: p1.playerId, division: "" },
        p2: bye ? null : { name: p2.name, playerId: p2.playerId, division: "" },
        bye,
      });
    }
  }
  pairings.sort((a, b) => a.table - b.table);
  return { pairings, currentRound: rounds.currentRound, roundLabel: rounds.label };
}

function extractTables(html: string): { caption: string; rows: string[][] }[] {
  const tables: { caption: string; rows: string[][] }[] = [];
  const tableRe = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let match: RegExpExecArray | null;
  while ((match = tableRe.exec(html))) {
    const body = match[1] ?? "";
    const caption = decode(body.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i)?.[1] ?? "");
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
    if (rows.length) tables.push({ caption, rows });
  }
  return tables;
}

function headingText(html: string): string {
  const h = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ?? html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const text = decode(h?.[1] ?? "");
  if (!text || /pairings|standings|roster|report/i.test(text)) return "";
  return text;
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

function splitNameId(raw: string): { name: string; playerId: string } {
  const clean = raw.replace(/\*+/g, "").trim();
  const wrapped = clean.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (wrapped) {
    return { name: wrapped[1].trim(), playerId: digits(wrapped[2]) };
  }
  return { name: nameFrom(clean), playerId: digits(clean) === clean.replace(/\s/g, "") ? digits(clean) : "" };
}

function nameFrom(raw: string): string {
  return raw.replace(/\*+/g, "").replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function digits(raw: string): string {
  const m = raw.match(/\d{6,}/);
  return m ? m[0] : raw.replace(/\D/g, "").length >= 6 ? raw.replace(/\D/g, "") : "";
}

function parseDivision(raw: string): TomPlayer["division"] {
  const t = raw.toLowerCase();
  if (t.includes("junior") || t === "jr") return "juniors";
  if (t.includes("senior") || t === "sr") return "seniors";
  if (t.includes("master") || t === "ma" || t === "md") return "masters";
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
  return /^(player|name|first player|second player|player 1|player 2|table|vs|record)$/i.test(name.trim());
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
