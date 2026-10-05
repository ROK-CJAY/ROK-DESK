-- Public sign-up list. The lounge desk opens a code and later pulls these rows.
-- Players only ever see /join/CODE. The desk secret never lives in this table.
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
);

create table if not exists remote_signups (
  id text primary key,
  code text not null,
  payload text not null,
  created_at timestamptz default current_timestamp not null
);

create index if not exists remote_signups_code_idx on remote_signups (code);
