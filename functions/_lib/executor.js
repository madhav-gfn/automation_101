// The step-execution engine shared by triggerWorkflowRun, webhookTriggerRun, the
// scheduled cron dispatcher, and the database_event handler — every path that
// starts a run funnels through startWorkflowRun(), and approveStep resumes a
// paused run through resumeWorkflowRun(). All writes use the admin client, since
// workflow_runs/step_runs have no client-facing write permissions (see
// nhost/metadata/databases/default/tables/tables.yaml).
import { adminGraphql } from "./hasura.js";
import { callGroq } from "./groq.js";
import { HttpError } from "./http.js";

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [500, 1500, 4000];
// Only these step types count against an org's monthly quota (mirrors the
// calls_used_this_month definition in the org_usage_stats view).
const METERED_STEP_TYPES = new Set(["llm_call", "http_request"]);

function getPath(obj, dotted) {
  return dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// Step config supports "{{trigger.payload.x}}" / "{{steps.1.text}}" templating so
// later steps can reference the trigger payload or earlier steps' outputs.
function interpolate(value, context) {
  if (typeof value === "string") {
    return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
      const v = getPath(context, path);
      if (v === undefined) return "";
      return typeof v === "string" ? v : JSON.stringify(v);
    });
  }
  if (Array.isArray(value)) return value.map((v) => interpolate(v, context));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, interpolate(v, context)]));
  }
  return value;
}

function compare(actual, operator, expected) {
  switch (operator) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "gt":
      return actual > expected;
    case "lt":
      return actual < expected;
    case "contains":
      return typeof actual === "string" && actual.includes(expected);
    default:
      throw new Error(`unknown conditional_branch operator: ${operator}`);
  }
}

async function withRetry(fn) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return { output: await fn(), attempt };
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
      }
    }
  }
  throw lastErr;
}

async function runStep(step, context) {
  const config = interpolate(step.config ?? {}, context);
  switch (step.type) {
    case "llm_call": {
      const text = await callGroq({ prompt: config.prompt, system: config.system });
      return { output: { text } };
    }
    case "http_request": {
      const res = await fetch(config.url, {
        method: config.method ?? "GET",
        headers: config.headers,
        body: config.body !== undefined ? JSON.stringify(config.body) : undefined,
      });
      const raw = await res.text();
      let parsedBody;
      try {
        parsedBody = JSON.parse(raw);
      } catch {
        parsedBody = raw;
      }
      if (!res.ok) throw new Error(`http_request step got ${res.status}: ${raw.slice(0, 500)}`);
      return { output: { status: res.status, body: parsedBody } };
    }
    case "db_write": {
      const data = config.data ?? {};
      return { output: { data }, writeToOutputs: data };
    }
    case "conditional_branch": {
      const passed = compare(getPath(context, config.field), config.operator, config.value);
      return { output: { passed }, haltRun: !passed };
    }
    case "approval_gate": {
      return { pause: true, output: null };
    }
    case "notify": {
      // Deliberately not sent here — see on_step_run_insert_notify event trigger
      // and functions/events/on-notify-step.mjs, which does the actual send
      // asynchronously after this row lands, then flips it to succeeded/failed.
      return { output: null, deferred: true };
    }
    default:
      throw new Error(`unknown step type: ${step.type}`);
  }
}

async function checkQuota(orgId) {
  const { organizations_by_pk: org } = await adminGraphql(
    `query ($id: uuid!) { organizations_by_pk(id: $id) { quota_calls_used quota_calls_allowed } }`,
    { id: orgId }
  );
  if (!org) throw new HttpError(404, "organization not found");
  if (org.quota_calls_used >= org.quota_calls_allowed) {
    throw new HttpError(429, "organization quota exhausted");
  }
}

async function meterUsage(orgId) {
  await adminGraphql(
    `mutation ($id: uuid!) {
      update_organizations_by_pk(pk_columns: { id: $id }, _inc: { quota_calls_used: 1 }) { id }
    }`,
    { id: orgId }
  );
}

async function insertStepRun({ workflowRunId, workflowStepId, orgId }) {
  const { insert_step_runs_one } = await adminGraphql(
    `mutation ($object: step_runs_insert_input!) {
      insert_step_runs_one(object: $object) { id }
    }`,
    {
      object: {
        workflow_run_id: workflowRunId,
        workflow_step_id: workflowStepId,
        org_id: orgId,
        status: "running",
        attempt: 0,
        started_at: new Date().toISOString(),
      },
    }
  );
  return insert_step_runs_one.id;
}

async function finishStepRun(stepRunId, patch) {
  await adminGraphql(
    `mutation ($id: uuid!, $patch: step_runs_set_input!) {
      update_step_runs_by_pk(pk_columns: { id: $id }, _set: $patch) { id }
    }`,
    { id: stepRunId, patch: { finished_at: new Date().toISOString(), ...patch } }
  );
}

async function finishWorkflowRun(runId, patch) {
  await adminGraphql(
    `mutation ($id: uuid!, $patch: workflow_runs_set_input!) {
      update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: $patch) { id }
    }`,
    { id: runId, patch: { finished_at: new Date().toISOString(), ...patch } }
  );
}

async function fetchOrderedSteps(workflowId) {
  const { workflow_steps } = await adminGraphql(
    `query ($workflowId: uuid!) {
      workflow_steps(where: { workflow_id: { _eq: $workflowId } }, order_by: { step_order: asc }) {
        id step_order type name config
      }
    }`,
    { workflowId }
  );
  return workflow_steps;
}

async function executeFrom({ run, orgId, steps, startIndex, context }) {
  for (let i = startIndex; i < steps.length; i++) {
    const step = steps[i];
    const stepRunId = await insertStepRun({ workflowRunId: run.id, workflowStepId: step.id, orgId });

    let outcome;
    try {
      outcome = await withRetry(() => runStep(step, context));
    } catch (err) {
      const message = String(err.message ?? err);
      await finishStepRun(stepRunId, { status: "failed", error: message, attempt: MAX_ATTEMPTS });
      await finishWorkflowRun(run.id, { status: "failed", error: message });
      return { status: "failed" };
    }

    const { output: result, attempt } = outcome;

    if (result.pause) {
      await finishStepRun(stepRunId, { status: "paused", attempt });
      await adminGraphql(
        `mutation ($id: uuid!) { update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "paused" }) { id } }`,
        { id: run.id }
      );
      return { status: "paused" };
    }

    if (METERED_STEP_TYPES.has(step.type)) {
      await meterUsage(orgId);
    }

    if (result.deferred) {
      await adminGraphql(
        `mutation ($id: uuid!, $attempt: Int!) {
          update_step_runs_by_pk(pk_columns: { id: $id }, _set: { status: "pending", attempt: $attempt }) { id }
        }`,
        { id: stepRunId, attempt }
      );
    } else {
      await finishStepRun(stepRunId, { status: "succeeded", output: result.output ?? null, attempt });
    }

    context.steps[step.step_order] = result.output ?? null;

    if (result.writeToOutputs) {
      await adminGraphql(
        `mutation ($object: workflow_outputs_insert_input!) {
          insert_workflow_outputs_one(object: $object) { id }
        }`,
        { object: { org_id: orgId, workflow_run_id: run.id, step_run_id: stepRunId, data: result.writeToOutputs } }
      );
    }

    if (result.haltRun) {
      await finishWorkflowRun(run.id, { status: "succeeded" });
      return { status: "succeeded" };
    }
  }

  await finishWorkflowRun(run.id, { status: "succeeded" });
  return { status: "succeeded" };
}

export async function startWorkflowRun({ workflowId, orgId, triggerType, triggeredBy = null, triggerPayload = null }) {
  await checkQuota(orgId);

  const steps = await fetchOrderedSteps(workflowId);

  const { insert_workflow_runs_one: run } = await adminGraphql(
    `mutation ($object: workflow_runs_insert_input!) {
      insert_workflow_runs_one(object: $object) { id }
    }`,
    {
      object: {
        workflow_id: workflowId,
        org_id: orgId,
        status: "running",
        trigger_type: triggerType,
        triggered_by: triggeredBy,
        started_at: new Date().toISOString(),
      },
    }
  );

  const context = { trigger: { type: triggerType, payload: triggerPayload }, steps: {} };
  const { status } = await executeFrom({ run, orgId, steps, startIndex: 0, context });
  return { workflowRunId: run.id, status };
}

export async function resumeWorkflowRun({ stepRunId, approved }) {
  const { step_runs_by_pk: pausedStep } = await adminGraphql(
    `query ($id: uuid!) {
      step_runs_by_pk(id: $id) {
        id status org_id workflow_run_id
        workflow_step { step_order type }
        workflow_run { id workflow_id trigger_type }
      }
    }`,
    { id: stepRunId }
  );

  if (!pausedStep) throw new HttpError(404, "step run not found");
  if (pausedStep.status !== "paused") {
    throw new HttpError(409, `step run is not paused (status: ${pausedStep.status})`);
  }
  if (pausedStep.workflow_step.type !== "approval_gate") {
    throw new HttpError(400, "step run is not an approval_gate step");
  }

  const orgId = pausedStep.org_id;
  const runId = pausedStep.workflow_run_id;

  if (!approved) {
    await finishStepRun(stepRunId, { status: "failed", error: "rejected by approver" });
    await finishWorkflowRun(runId, { status: "failed", error: "rejected at approval_gate" });
    return { workflowRunId: runId, status: "failed" };
  }

  await finishStepRun(stepRunId, { status: "succeeded", output: { approved: true } });

  const steps = await fetchOrderedSteps(pausedStep.workflow_run.workflow_id);

  const { step_runs: priorRuns } = await adminGraphql(
    `query ($runId: uuid!) {
      step_runs(where: { workflow_run_id: { _eq: $runId }, status: { _eq: "succeeded" } }) {
        output
        workflow_step { step_order }
      }
    }`,
    { runId }
  );

  const context = { trigger: { type: pausedStep.workflow_run.trigger_type, payload: null }, steps: {} };
  for (const pr of priorRuns) {
    context.steps[pr.workflow_step.step_order] = pr.output;
  }

  await adminGraphql(
    `mutation ($id: uuid!) { update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "running" }) { id } }`,
    { id: runId }
  );

  const resumeIndex = steps.findIndex((s) => s.step_order === pausedStep.workflow_step.step_order) + 1;
  const { status } = await executeFrom({ run: { id: runId }, orgId, steps, startIndex: resumeIndex, context });
  return { workflowRunId: runId, status };
}
