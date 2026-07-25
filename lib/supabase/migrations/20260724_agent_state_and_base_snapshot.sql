-- AGAD: shared agent state + base snapshot table
-- Stores agent state across serverless containers and the active base snapshot id.

create table if not exists public.agent_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null,
  sandbox_id text,
  sandbox_name text not null,
  url text,
  password text,
  snapshot_id text,
  error text,
  started_at timestamptz,
  expires_at timestamptz,
  promise_started_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.agent_state enable row level security;

drop policy if exists "agent_state_owner_all" on public.agent_state;
create policy "agent_state_owner_all"
  on public.agent_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "agent_state_service_role_all" on public.agent_state;
create policy "agent_state_service_role_all"
  on public.agent_state for all
  to service_role
  using (true)
  with check (true);

create table if not exists public.base_snapshot (
  id integer primary key default 1 check (id = 1),
  snapshot_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.base_snapshot enable row level security;

drop policy if exists "base_snapshot_public_read" on public.base_snapshot;
create policy "base_snapshot_public_read"
  on public.base_snapshot for select
  using (true);

drop policy if exists "base_snapshot_service_role_all" on public.base_snapshot;
create policy "base_snapshot_service_role_all"
  on public.base_snapshot for all
  to service_role
  using (true)
  with check (true);
