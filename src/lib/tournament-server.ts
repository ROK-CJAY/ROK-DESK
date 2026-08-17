import { defaultTournament, parseTournament, type TournamentState } from "@/lib/tournament-types";
import { clearLegacyTournament, stripTestFromTournament } from "@/lib/test-fixtures";
import { getSql } from "@/lib/db";

const TOURNAMENT_ID = "live";
let tournamentBootstrapped = false;

export async function loadTournament(): Promise<TournamentState> {
  const sql = await getSql();
  await sql.query(`
    create table if not exists tournament_state (
      id text primary key,
      payload text not null,
      updated_at timestamptz default CURRENT_TIMESTAMP not null
    )
  `);
  const rows = await sql<{ payload: string }>`
    select payload from tournament_state where id = ${TOURNAMENT_ID}
  `;
  const existing = rows[0] ? parseTournament(rows[0].payload) : null;
  if (existing) {
    let cleaned = clearLegacyTournament(existing);
    if (!tournamentBootstrapped) {
      cleaned = stripTestFromTournament(cleaned);
      tournamentBootstrapped = true;
    }
    if (cleaned !== existing) await saveTournament(cleaned);
    return cleaned;
  }

  const seed = defaultTournament();
  tournamentBootstrapped = true;
  await sql`
    insert into tournament_state (id, payload, updated_at)
    values (${TOURNAMENT_ID}, ${JSON.stringify(seed)}, CURRENT_TIMESTAMP)
    on conflict (id) do nothing
  `;
  return seed;
}

export async function saveTournament(next: TournamentState): Promise<TournamentState> {
  const sql = await getSql();
  const payload = JSON.stringify(next);
  await sql`
    insert into tournament_state (id, payload, updated_at)
    values (${TOURNAMENT_ID}, ${payload}, CURRENT_TIMESTAMP)
    on conflict (id) do update
    set payload = excluded.payload,
        updated_at = CURRENT_TIMESTAMP
  `;
  return next;
}
