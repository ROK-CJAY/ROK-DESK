#!/usr/bin/env node
/**
 * Deploy-time database migrator (node-postgres, `pg`).
 *
 * Runs during `npm run build` — on every Vercel deploy — applying pending files
 * in ../migrations to DATABASE_URL. Each file is applied in one transaction and
 * recorded in a `_migrations` table, so it runs once and is safe to re-run.
 *
 * No DATABASE_URL (local / preview builds) -> skip; the PGLite fallback applies
 * the same files at startup instead (see src/lib/db.ts).
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
const signupUrl = process.env.SIGNUP_DATABASE_URL?.trim();
const publicHost = process.env.ROK_PUBLIC_HOST === "1";

if (publicHost) {
  if (!signupUrl) {
    console.log("[migrate] public host — SIGNUP_DATABASE_URL not set, sign-up tables will be created on first use.");
    process.exit(0);
  }
  const pool = new pg.Pool({ connectionString: signupUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query(`
      create table if not exists remote_signup_events (
        code text primary key,
        game_id text not null,
        title text not null,
        format_name text not null,
        require_decklist boolean not null,
        best_of integer not null,
        bracket_type text not null,
        is_open boolean not null,
        venue_id text not null default '',
        created_at timestamptz default current_timestamp not null
      )
    `);
    await client.query(`alter table remote_signup_events add column if not exists venue_id text not null default ''`);
    await client.query(`alter table remote_signup_events add column if not exists closes_at timestamptz`);
    await client.query(`
      create table if not exists remote_signups (
        id text primary key,
        code text not null,
        payload text not null,
        created_at timestamptz default current_timestamp not null
      )
    `);
    await client.query(`
      create table if not exists remote_signup_venues (
        id text primary key,
        key_hash text not null unique,
        created_at timestamptz default current_timestamp not null
      )
    `);
    console.log("[migrate] public host — sign-up tables ready.");
  } finally {
    client.release();
    await pool.end();
  }
  process.exit(0);
}

if (!databaseUrl) {
  console.log(
    "[migrate] DATABASE_URL not set — skipping (the PGLite fallback migrates itself).",
  );
  process.exit(0);
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main() {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const applied = new Set(
      (await client.query("SELECT name FROM _migrations")).rows.map((r) => r.name),
    );

    let files;
    try {
      files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
    } catch {
      console.log("[migrate] no migrations/ directory — nothing to do.");
      return;
    }

    let count = 0;
    for (const name of files) {
      if (applied.has(name)) continue;
      const text = await readFile(join(migrationsDir, name), "utf8");
      try {
        await client.query("BEGIN");
        // pg's simple-query protocol runs a whole multi-statement file at once.
        await client.query(text);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (err) {
        console.error(`[migrate] error applying ${name}`);
        try {
          await client.query("ROLLBACK");
        } catch {
          // ROLLBACK fails when the connection died — keep the original error.
        }
        throw err;
      }
      console.log(`[migrate] applied ${name}`);
      count += 1;
    }
    console.log(count ? `[migrate] done — ${count} migration(s) applied.` : "[migrate] up to date.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err?.message || err);
  // pg errors carry the context needed to debug a bad SQL file.
  for (const key of ["code", "detail", "hint", "position", "where"]) {
    if (err?.[key] != null) console.error(`[migrate]   ${key}: ${err[key]}`);
  }
  process.exit(1);
});
