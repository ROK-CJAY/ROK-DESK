import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { dbSource, getSql } from "@/lib/db";
import { gameIdFromSlug, isGameId, isVgcTitle, playAgeDivisionOf, slugOf, type GameId } from "@/lib/games";
import { mergeDecklist } from "@/lib/decklist";
import { countFilledMons, mergeTeam } from "@/lib/pokemon-vgc";
import { sanitizeInk } from "@/lib/lorcana";
import { normalizeSignupCode } from "@/lib/remote-signup-code";

export { PUBLIC_SIGNUP_ORIGIN, makeSignupCode, normalizeSignupCode } from "@/lib/remote-signup-code";

export function publicSignupHost(): boolean {
  return process.env.ROK_PUBLIC_HOST === "1";
}

function pullSecret(): string {
  return process.env.SIGNUP_PULL_SECRET?.trim() ?? "";
}

export function signupPullAuthorized(header: string | null): boolean {
  const expected = pullSecret();
  const got = header?.trim() ?? "";
  if (!expected || !got) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const bodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  tag: z.string().trim().max(40).optional().default(""),
  pronouns: z.string().trim().max(40).optional().default(""),
  country: z.string().trim().max(8).optional().default("US"),
  deck: z.string().trim().max(120).optional().default(""),
  extra: z.string().trim().max(120).optional().default(""),
  playerId: z.string().trim().max(40).optional().default(""),
  trainerName: z.string().trim().max(80).optional().default(""),
  switchProfile: z.string().trim().max(80).optional().default(""),
  ageDivision: z
    .string()
    .optional()
    .transform((v) => (v === "juniors" || v === "seniors" || v === "masters" ? v : "")),
  birthDate: z.string().trim().max(20).optional().default(""),
  team: z.unknown().optional(),
  ink1: z.string().trim().max(20).optional().default(""),
  ink2: z.string().trim().max(20).optional().default(""),
  note: z.string().trim().max(160).optional().default(""),
  photoUrl: z.string().trim().max(400).optional().default(""),
  decklist: z.unknown().optional(),
});

export type RemoteSignupBody = z.infer<typeof bodySchema>;

export type RemoteEvent = {
  code: string;
  gameId: GameId;
  name: string;
  formatName: string;
  requireDecklist: boolean;
  bestOf: 1 | 3 | 5 | 7;
  bracketType: "single" | "double" | "swiss";
  open: boolean;
  count: number;
};

type EventRow = {
  code: string;
  game_id: string;
  title: string;
  format_name: string;
  require_decklist: boolean;
  best_of: number;
  bracket_type: string;
  is_open: boolean;
};

let tablesReady: Promise<void> | null = null;

function ensureTables(): Promise<void> {
  tablesReady ??= (async () => {
    const sql = await getSql();
    await sql.query(`
      create table if not exists remote_signup_events (
        code text primary key,
        game_id text not null,
        title text not null,
        format_name text not null,
        require_decklist boolean not null,
        best_of integer not null,
        bracket_type text not null,
        is_open boolean not null,
        created_at timestamptz default current_timestamp not null
      )
    `);
    await sql.query(`
      create table if not exists remote_signups (
        id text primary key,
        code text not null,
        payload text not null,
        created_at timestamptz default current_timestamp not null
      )
    `);
  })().catch((error) => {
    tablesReady = null;
    throw error;
  });
  return tablesReady;
}

function durableDb(): string | null {
  if (publicSignupHost() && dbSource !== "neon") {
    return "This public host has no database. Set DATABASE_URL on Vercel.";
  }
  return null;
}

function asBestOf(value: number): 1 | 3 | 5 | 7 {
  return value === 1 || value === 5 || value === 7 ? value : 3;
}

function asBracket(value: string): "single" | "double" | "swiss" {
  return value === "double" || value === "swiss" ? value : "single";
}

async function eventRow(code: string): Promise<EventRow | null> {
  const sql = await getSql();
  const rows = await sql<EventRow>`select code, game_id, title, format_name, require_decklist, best_of, bracket_type, is_open from remote_signup_events where code = ${code}`;
  return rows[0] ?? null;
}

async function toEvent(row: EventRow): Promise<RemoteEvent | null> {
  if (!isGameId(row.game_id)) return null;
  const sql = await getSql();
  const counts = await sql<{ n: number }>`select count(*)::int as n from remote_signups where code = ${row.code}`;
  return {
    code: row.code,
    gameId: row.game_id,
    name: row.title,
    formatName: row.format_name,
    requireDecklist: Boolean(row.require_decklist),
    bestOf: asBestOf(Number(row.best_of)),
    bracketType: asBracket(row.bracket_type),
    open: Boolean(row.is_open),
    count: Number(counts[0]?.n ?? 0),
  };
}

export async function openRemoteEvent(input: {
  code: string;
  gameId: string;
  title: string;
  formatName: string;
  requireDecklist: boolean;
  bestOf: number;
  bracketType: string;
}): Promise<RemoteEvent | { error: string }> {
  const blocked = durableDb();
  if (blocked) return { error: blocked };
  if (!pullSecret()) return { error: "Set SIGNUP_PULL_SECRET on the public host." };
  const code = normalizeSignupCode(input.code);
  if (code.length < 4) return { error: "Code must be at least 4 characters." };
  const gameId = isGameId(input.gameId) ? input.gameId : gameIdFromSlug(input.gameId);
  if (!gameId) return { error: "Unknown game." };
  const title = input.title.trim().slice(0, 80) || "ROK event";
  const formatName = input.formatName.trim().slice(0, 80) || "Swiss";
  await ensureTables();
  const sql = await getSql();
  await sql`
    insert into remote_signup_events (code, game_id, title, format_name, require_decklist, best_of, bracket_type, is_open)
    values (${code}, ${gameId}, ${title}, ${formatName}, ${input.requireDecklist}, ${asBestOf(input.bestOf)}, ${asBracket(input.bracketType)}, ${true})
    on conflict (code) do update set
      game_id = excluded.game_id,
      title = excluded.title,
      format_name = excluded.format_name,
      require_decklist = excluded.require_decklist,
      best_of = excluded.best_of,
      bracket_type = excluded.bracket_type,
      is_open = true
  `;
  const row = await eventRow(code);
  if (!row) return { error: "Could not open that code." };
  const event = await toEvent(row);
  return event ?? { error: "Could not open that code." };
}

export async function closeRemoteEvent(codeRaw: string): Promise<{ ok: true } | { error: string }> {
  const blocked = durableDb();
  if (blocked) return { error: blocked };
  const code = normalizeSignupCode(codeRaw);
  await ensureTables();
  const sql = await getSql();
  await sql`update remote_signup_events set is_open = ${false} where code = ${code}`;
  return { ok: true };
}

export async function readRemoteEvent(codeRaw: string): Promise<RemoteEvent | null> {
  const code = normalizeSignupCode(codeRaw);
  if (code.length < 4) return null;
  if (durableDb()) return null;
  await ensureTables();
  const row = await eventRow(code);
  if (!row) return null;
  return toEvent(row);
}

export async function submitRemoteSignup(
  codeRaw: string,
  body: unknown,
): Promise<{ ok: true; id: string; seed: number; name: string; count: number } | { error: string; status: number }> {
  const blocked = durableDb();
  if (blocked) return { error: blocked, status: 503 };
  const code = normalizeSignupCode(codeRaw);
  await ensureTables();
  const row = await eventRow(code);
  if (!row || !isGameId(row.game_id)) return { error: "That sign-up code is not open.", status: 404 };
  if (!row.is_open) return { error: "Registration is closed.", status: 409 };
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return { error: "Name is required", status: 400 };
  const gameId = row.game_id;
  const decklist = mergeDecklist(parsed.data.decklist);
  if (row.require_decklist && decklist.length === 0) {
    return { error: "Decklist is required for this event", status: 400 };
  }
  const team = mergeTeam(parsed.data.team);
  if (isVgcTitle(gameId) && countFilledMons(team) < 4) {
    return { error: "Enter at least 4 Pokémon to complete sign-up.", status: 400 };
  }
  const sql = await getSql();
  const counts = await sql<{ n: number }>`select count(*)::int as n from remote_signups where code = ${code}`;
  const count = Number(counts[0]?.n ?? 0);
  if (count >= 256) return { error: "This event is full.", status: 409 };
  const id = `r-${crypto.randomUUID()}`;
  const payload = {
    ...parsed.data,
    team,
    decklist,
    ink1: sanitizeInk(parsed.data.ink1),
    ink2: sanitizeInk(parsed.data.ink2),
    ageDivision: playAgeDivisionOf(gameId) ?? parsed.data.ageDivision,
    game: slugOf(gameId),
  };
  await sql`
    insert into remote_signups (id, code, payload)
    values (${id}, ${code}, ${JSON.stringify(payload)})
  `;
  return { ok: true, id, seed: count + 1, name: parsed.data.name, count: count + 1 };
}

export async function listRemoteSignups(
  codeRaw: string,
): Promise<{ event: RemoteEvent; entrants: Array<RemoteSignupBody & { id: string }> } | { error: string }> {
  const blocked = durableDb();
  if (blocked) return { error: blocked };
  const code = normalizeSignupCode(codeRaw);
  await ensureTables();
  const row = await eventRow(code);
  if (!row) return { error: "No sign-up with that code." };
  const event = await toEvent(row);
  if (!event) return { error: "No sign-up with that code." };
  const sql = await getSql();
  const rows = await sql<{ id: string; payload: string }>`
    select id, payload from remote_signups where code = ${code} order by created_at asc
  `;
  const entrants = rows.flatMap((item) => {
    try {
      const payload = JSON.parse(item.payload) as RemoteSignupBody;
      if (!payload?.name) return [];
      return [{ ...payload, id: item.id }];
    } catch {
      return [];
    }
  });
  return { event, entrants };
}
