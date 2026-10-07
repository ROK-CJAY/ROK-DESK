-- Each store's desk has its own key. A code belongs to the venue that opened it.
-- Empty venue_id is the original host secret (ROK), not a shared key other stores can use.
alter table remote_signup_events add column if not exists venue_id text not null default '';

create table if not exists remote_signup_venues (
  id text primary key,
  key_hash text not null unique,
  created_at timestamptz default current_timestamp not null
);
