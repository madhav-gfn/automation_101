-- One row per workflow: its most recent run, for the
-- "org's workflows with steps/triggers/most recent run status" query.
create or replace view public.workflow_latest_run as
select distinct on (wr.workflow_id)
  wr.workflow_id,
  wr.id as run_id,
  wr.status,
  wr.trigger_type,
  wr.started_at,
  wr.finished_at,
  wr.created_at
from public.workflow_runs wr
order by wr.workflow_id, wr.created_at desc;
