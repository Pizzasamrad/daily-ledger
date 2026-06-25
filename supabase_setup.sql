-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)

create table if not exists ledger_kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table ledger_kv enable row level security;

-- Since this is a single-user personal app with no login screen,
-- we allow the anon key full access to this table only.
-- (Do not reuse this policy on a table with multiple users' data.)
create policy "Allow anon full access"
  on ledger_kv
  for all
  using (true)
  with check (true);
