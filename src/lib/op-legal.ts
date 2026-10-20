/** One Piece Standard Regulation, April 2026–March 2027. */

const STANDARD_BLOCKS = new Set([2, 3, 4, 5]);

/** Banned cards. Parallels share the base number. */
const BANNED = new Set(["OP06-047", "OP03-040", "OP06-086", "ST10-001", "OP06-116", "OP14-020"]);

/**
 * Super Parallel numbers that stay legal, and cards treated as Block 4.
 * Official list, August 21, 2026.
 */
const ALWAYS_LEGAL = new Set([
  "EB01-006",
  "EB02-061",
  "EB03-061",
  "EB04-044",
  "EB04-061",
  "OP01-016",
  "OP01-120",
  "OP02-013",
  "OP03-122",
  "OP04-083",
  "OP05-069",
  "OP05-074",
  "OP05-119",
  "OP06-118",
  "OP06-119",
  "OP07-051",
  "OP08-118",
  "OP09-004",
  "OP09-051",
  "OP09-093",
  "OP09-118",
  "OP09-119",
  "OP10-119",
  "OP11-118",
  "OP12-118",
  "OP13-118",
  "OP13-119",
  "OP13-120",
  "OP14-119",
  "OP15-118",
  "OP16-063",
  "OP16-065",
  "OP16-073",
  "OP17-005",
  "OP17-022",
  "OP17-062",
  "OP17-112",
  "OP17-118",
  "OP01-039",
  "OP01-055",
  "OP02-005",
  "OP02-068",
  "OP03-008",
  "OP03-044",
  "OP03-048",
  "OP03-072",
  "OP03-097",
  "OP04-016",
  "OP04-077",
  "OP04-096",
  "ST01-011",
  "ST02-007",
  "ST06-008",
]);

export function opBaseId(id: string): string {
  return id.replace(/_(?:p|r)\d+$/i, "").toUpperCase();
}

export function opBlock(id: string, stored?: number | null): number | null {
  if (typeof stored === "number" && Number.isFinite(stored) && stored > 0) return stored;
  const base = opBaseId(id);
  const op = base.match(/^OP(\d+)/);
  if (op) return Math.ceil(Number(op[1]) / 4);
  const st = base.match(/^ST(\d+)/);
  if (st) return Math.ceil(Number(st[1]) / 10);
  return null;
}

export function opIsStandard(id: string, block?: number | null): boolean {
  const base = opBaseId(id);
  if (BANNED.has(base)) return false;
  if (ALWAYS_LEGAL.has(base)) return true;
  const resolved = opBlock(id, block);
  if (resolved == null) return true;
  return STANDARD_BLOCKS.has(resolved);
}
