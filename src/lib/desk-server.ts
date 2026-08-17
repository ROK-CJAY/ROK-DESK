import { defaultDesk, parseDesk, type DeskState } from "@/lib/desk-types";
import { clearLegacyDesk, stripTestFromDesk } from "@/lib/test-fixtures";
import { getSql } from "@/lib/db";

const DESK_ID = "live";
let deskBootstrapped = false;

export async function loadDesk(): Promise<DeskState> {
  const sql = await getSql();
  const rows = await sql<{ payload: string }>`
    select payload from desk_state where id = ${DESK_ID}
  `;
  const existing = rows[0] ? parseDesk(rows[0].payload) : null;
  if (existing) {
    let cleaned = clearLegacyDesk(existing);
    if (!deskBootstrapped) {
      cleaned = stripTestFromDesk(cleaned);
      deskBootstrapped = true;
    }
    if (cleaned !== existing) await saveDesk(cleaned);
    return cleaned;
  }

  const seed = defaultDesk();
  deskBootstrapped = true;
  await sql`
    insert into desk_state (id, payload, updated_at)
    values (${DESK_ID}, ${JSON.stringify(seed)}, CURRENT_TIMESTAMP)
    on conflict (id) do nothing
  `;
  return seed;
}

export async function saveDesk(next: DeskState): Promise<DeskState> {
  const sql = await getSql();
  const payload = JSON.stringify(next);
  await sql`
    insert into desk_state (id, payload, updated_at)
    values (${DESK_ID}, ${payload}, CURRENT_TIMESTAMP)
    on conflict (id) do update
    set payload = excluded.payload,
        updated_at = CURRENT_TIMESTAMP
  `;
  return next;
}
