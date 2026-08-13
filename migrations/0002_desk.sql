-- Single live production desk. Overlays poll this row; the control surface writes it.
create table if not exists desk_state (
  id text primary key,
  payload text not null,
  updated_at timestamptz default CURRENT_TIMESTAMP not null
);
