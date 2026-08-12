-- AI Agent Workflow Builder — initial schema
-- Safe to run against a fresh local Postgres OR an Nhost Cloud project that already
-- has the `auth` schema (auth.users) provisioned. On Nhost Cloud, `auth` is owned by
-- Nhost's own auth service role and our migration role has no privilege on it at all
-- (not even to check IF NOT EXISTS), so the schema/table creation below is wrapped in
-- DO blocks that swallow insufficient_privilege — a no-op there. Locally, where we own
-- everything, it creates the auth.users stand-in for real.

create extension if not exists pgcrypto;

do $$
begin
  create schema if not exists auth;
exception
  when insufficient_privilege then
    null; -- auth schema already exists, managed by Nhost Cloud
end $$;

do $$
begin
  create table if not exists auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    display_name text,
    created_at timestamptz not null default now()
  );
exception
  when insufficient_privilege then
    null; -- auth.users already exists, managed by Nhost Cloud
end $$;

-- ---------- enums ----------

create type public.org_role as enum ('owner', 'editor', 'viewer');

create type public.step_type as enum (
  'llm_call', 'http_request', 'db_write', 'notify', 'conditional_branch', 'approval_gate'
);

create type public.trigger_type as enum ('manual', 'webhook', 'scheduled', 'database_event');

create type public.run_status as enum (
  'pending', 'running', 'paused', 'succeeded', 'failed', 'cancelled'
);

create type public.step_status as enum (
  'pending', 'running', 'succeeded', 'failed', 'paused', 'skipped'
);

-- ---------- core tables ----------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quota_calls_used integer not null default 0,
  quota_calls_allowed integer not null default 1000,
  quota_period_start timestamptz not null default date_trunc('month', now()),
  created_at timestamptz not null default now()
);

create table public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  step_order integer not null,
  type public.step_type not null,
  name text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workflow_id, step_order)
);

create table public.workflow_triggers (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  type public.trigger_type not null,
  config jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  status public.run_status not null default 'pending',
  trigger_type public.trigger_type not null,
  triggered_by uuid references auth.users(id),
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create table public.step_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  workflow_step_id uuid not null references public.workflow_steps(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  status public.step_status not null default 'pending',
  input jsonb,
  output jsonb,
  error text,
  attempt integer not null default 0,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

-- db_write steps land here
create table public.workflow_outputs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  step_run_id uuid not null references public.step_runs(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- stand-in for "a row change in a watched external table" that the database_event
-- trigger type watches (see nhost/metadata event trigger on this table)
create table public.external_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  source text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- indexes ----------

create index workflow_steps_workflow_id_idx on public.workflow_steps (workflow_id, step_order);
create index workflow_triggers_workflow_id_idx on public.workflow_triggers (workflow_id);
create index workflow_runs_workflow_id_idx on public.workflow_runs (workflow_id);
create index workflow_runs_org_id_idx on public.workflow_runs (org_id);
create index step_runs_workflow_run_id_idx on public.step_runs (workflow_run_id);
create index step_runs_org_id_idx on public.step_runs (org_id);
create index org_members_user_id_idx on public.org_members (user_id);
create index external_events_workflow_id_idx on public.external_events (workflow_id);

-- ---------- updated_at trigger ----------

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger workflows_set_updated_at
  before update on public.workflows
  for each row execute function public.set_updated_at();

-- ---------- usage aggregation view (Hasura layer aggregation) ----------

create or replace view public.org_usage_stats as
select
  o.id as org_id,
  o.quota_calls_used,
  o.quota_calls_allowed,
  count(distinct wr.id) filter (
    where wr.created_at >= date_trunc('month', now())
  ) as runs_this_month,
  count(sr.id) filter (
    where sr.created_at >= date_trunc('month', now())
      and ws.type in ('llm_call', 'http_request')
      and sr.status = 'succeeded'
  ) as calls_used_this_month,
  avg(extract(epoch from (wr.finished_at - wr.started_at))) filter (
    where wr.finished_at is not null and wr.started_at is not null
  ) as avg_run_duration_seconds
from public.organizations o
left join public.workflow_runs wr on wr.org_id = o.id
left join public.step_runs sr on sr.workflow_run_id = wr.id
left join public.workflow_steps ws on ws.id = sr.workflow_step_id
group by o.id;
