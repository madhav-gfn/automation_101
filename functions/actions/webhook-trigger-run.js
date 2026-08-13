import { timingSafeEqual } from "node:crypto";
import { withErrorHandling, HttpError } from "../_lib/http.js";
import { adminGraphql } from "../_lib/hasura.js";
import { verifyWebhookSecret } from "../_lib/auth.js";
import { startWorkflowRun } from "../_lib/executor.js";

// role: public — no user JWT at all. Auth is a per-workflow secret token stored in
// workflow_triggers.config, checked here (see nhost/metadata/actions.yaml).
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ""));
  const bufB = Buffer.from(String(b ?? ""));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export default withErrorHandling(async (req, res) => {
  verifyWebhookSecret(req, "ACTIONS_WEBHOOK_SECRET");
  const { workflow_id: workflowId, token } = req.body.input;

  const { workflows_by_pk: workflow } = await adminGraphql(
    `query ($id: uuid!) { workflows_by_pk(id: $id) { id org_id is_active } }`,
    { id: workflowId }
  );
  if (!workflow || !workflow.is_active) throw new HttpError(404, "workflow not found or inactive");

  const { workflow_triggers: triggers } = await adminGraphql(
    `query ($workflowId: uuid!) {
      workflow_triggers(
        where: { workflow_id: { _eq: $workflowId }, type: { _eq: "webhook" }, is_enabled: { _eq: true } }
      ) { config }
    }`,
    { workflowId }
  );

  const match = triggers.find((t) => safeEqual(t.config?.token, token));
  if (!match) throw new HttpError(401, "invalid webhook token");

  const { workflowRunId, status } = await startWorkflowRun({
    workflowId,
    orgId: workflow.org_id,
    triggerType: "webhook",
  });

  res.status(200).json({ workflow_run_id: workflowRunId, status });
});
