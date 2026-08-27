import { getSql } from "@/lib/db";
import {
  DESK_PROFILE,
  DESK_PROFILE_ID,
  emptyProfileSnapshot,
  parseBrowserBundle,
  type BrowserBundle,
} from "@/lib/browser-memory";

const BROWSER_ID = "live";

export function emptyBundle(): BrowserBundle {
  return {
    profiles: [DESK_PROFILE],
    activeId: DESK_PROFILE_ID,
    byId: { [DESK_PROFILE_ID]: emptyProfileSnapshot() },
    updatedAt: 0,
  };
}

export async function loadBrowser(): Promise<BrowserBundle> {
  const sql = await getSql();
  await sql.query(`
    create table if not exists browser_state (
      id text primary key,
      payload text not null,
      updated_at timestamptz default CURRENT_TIMESTAMP not null
    )
  `);
  const rows = await sql<{ payload: string }>`
    select payload from browser_state where id = ${BROWSER_ID}
  `;
  if (rows[0]) {
    try {
      const parsed = parseBrowserBundle(JSON.parse(rows[0].payload));
      if (parsed) return parsed;
    } catch {
      /* fall through */
    }
  }
  const seed = emptyBundle();
  await sql`
    insert into browser_state (id, payload, updated_at)
    values (${BROWSER_ID}, ${JSON.stringify(seed)}, CURRENT_TIMESTAMP)
    on conflict (id) do nothing
  `;
  return seed;
}

export async function saveBrowser(next: BrowserBundle): Promise<BrowserBundle> {
  const sql = await getSql();
  const payload: BrowserBundle = { ...next, updatedAt: Date.now() };
  await sql`
    insert into browser_state (id, payload, updated_at)
    values (${BROWSER_ID}, ${JSON.stringify(payload)}, CURRENT_TIMESTAMP)
    on conflict (id) do update
    set payload = excluded.payload,
        updated_at = CURRENT_TIMESTAMP
  `;
  return payload;
}
