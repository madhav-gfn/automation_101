drop view if exists public.org_usage_stats;

drop trigger if exists workflows_set_updated_at on public.workflows;
drop function if exists public.set_updated_at();

drop table if exists public.external_events;
drop table if exists public.workflow_outputs;
drop table if exists public.step_runs;
drop table if exists public.workflow_runs;
drop table if exists public.workflow_triggers;
drop table if exists public.workflow_steps;
drop table if exists public.workflows;
drop table if exists public.org_members;
drop table if exists public.organizations;

drop type if exists public.step_status;
drop type if exists public.run_status;
drop type if exists public.trigger_type;
drop type if exists public.step_type;
drop type if exists public.org_role;
