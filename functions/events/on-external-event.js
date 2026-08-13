import { withErrorHandling } from "../_lib/http.js";
import { adminGraphql } from "../_lib/hasura.js";
import { verifyWebhookSecret } from "../_lib/auth.js";
import { startWorkflowRun } from "../_lib/executor.js";

// external_events is the stand-in for "a row change in a watched external table"
// that the database_event trigger type reacts to (see tables.yaml). Each insert
// already carries the workflow_id it's for, so this just starts a run for every
// enabled database_event trigger on that workflow.
export default withErrorHandling(async (req, res) => {
  verifyWebhookSecret(req, "EVENT_TRIGGER_SECRET");
  const row = req.body?.event?.data?.new;
  if (!row) return res.status(200).json({ skipped: true });

  const { workflow_triggers: triggers } = await adminGraphql(
    `query ($workflowId: uuid!) {
      workflow_triggers(
        where: { workflow_id: { _eq: $workflowId }, type: { _eq: "database_event" }, is_enabled: { _eq: true } }
      ) { id }
    }`,
    { workflowId: row.workflow_id }
  );

  const results = [];
  for (const _trigger of triggers) {
    results.push(
      await startWorkflowRun({
        workflowId: row.workflow_id,
        orgId: row.org_id,
        triggerType: "database_event",
        triggerPayload: row.payload,
      })
    );
  }

  res.status(200).json({ started: results.length });
});
