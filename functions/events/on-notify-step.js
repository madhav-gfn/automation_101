import { withErrorHandling } from "../_lib/http.js";
import { adminGraphql } from "../_lib/hasura.js";
import { verifyWebhookSecret } from "../_lib/auth.js";

// This event trigger fires on EVERY insert into step_runs (see tables.yaml —
// event_triggers.insert.columns: "*" has no type filter, since "type" lives on
// workflow_steps, not step_runs). So this handler must check the step's type
// itself and no-op for anything that isn't a notify step.
async function sendNotifyStub(message) {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) {
    console.log("[notify] no NOTIFY_WEBHOOK_URL set, logging only:", message);
    return;
  }
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: message }),
  });
}

export default withErrorHandling(async (req, res) => {
  verifyWebhookSecret(req, "EVENT_TRIGGER_SECRET");
  const row = req.body?.event?.data?.new;
  if (!row) return res.status(200).json({ skipped: true });

  const { workflow_steps_by_pk: step } = await adminGraphql(
    `query ($id: uuid!) { workflow_steps_by_pk(id: $id) { type config } }`,
    { id: row.workflow_step_id }
  );

  if (!step || step.type !== "notify") {
    return res.status(200).json({ skipped: true });
  }

  try {
    const message = step.config?.message ?? `Workflow step run ${row.id} reached a notify step.`;
    await sendNotifyStub(message);
    await adminGraphql(
      `mutation ($id: uuid!, $finishedAt: timestamptz!) {
        update_step_runs_by_pk(
          pk_columns: { id: $id }
          _set: { status: "succeeded", output: { sent: true }, finished_at: $finishedAt }
        ) { id }
      }`,
      { id: row.id, finishedAt: new Date().toISOString() }
    );
  } catch (err) {
    await adminGraphql(
      `mutation ($id: uuid!, $error: String!, $finishedAt: timestamptz!) {
        update_step_runs_by_pk(
          pk_columns: { id: $id }
          _set: { status: "failed", error: $error, finished_at: $finishedAt }
        ) { id }
      }`,
      { id: row.id, error: String(err.message ?? err), finishedAt: new Date().toISOString() }
    );
  }

  res.status(200).json({ handled: true });
});
