-- Tournament organizer state. Production and overlays poll this row.
create table if not exists tournament_state (
  id text primary key,
  payload text not null,
  updated_at timestamptz default CURRENT_TIMESTAMP not null
);
