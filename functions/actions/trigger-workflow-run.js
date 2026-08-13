import { withErrorHandling, HttpError } from "../_lib/http.mjs";
import { adminGraphql } from "../_lib/hasura.mjs";
import { verifyWebhookSecret, sessionUserId } from "../_lib/auth.mjs";
import { startWorkflowRun } from "../_lib/executor.mjs";

// Hasura Actions bypass table permissions entirely, so this handler redoes the
// Layer-1 org+role check itself (see nhost/metadata/actions.yaml comment header).
export default withErrorHandling(async (req, res) => {
  verifyWebhookSecret(req, "ACTIONS_WEBHOOK_SECRET");
  const userId = sessionUserId(req);
  const { workflow_id: workflowId } = req.body.input;

  const { workflows_by_pk: workflow } = await adminGraphql(
    `query ($id: uuid!) { workflows_by_pk(id: $id) { id org_id is_active } }`,
    { id: workflowId }
  );
  if (!workflow) throw new HttpError(404, "workflow not found");
  if (!workflow.is_active) throw new HttpError(400, "workflow is not active");

  const { org_members: members } = await adminGraphql(
    `query ($orgId: uuid!, $userId: uuid!) {
      org_members(where: { org_id: { _eq: $orgId }, user_id: { _eq: $userId } }) { role }
    }`,
    { orgId: workflow.org_id, userId }
  );
  const role = members[0]?.role;
  if (!role || !["owner", "editor"].includes(role)) {
    throw new HttpError(403, "must be an owner or editor of this workflow's organization to trigger it");
  }

  const { workflowRunId, status } = await startWorkflowRun({
    workflowId,
    orgId: workflow.org_id,
    triggerType: "manual",
    triggeredBy: userId,
  });

  res.status(200).json({ workflow_run_id: workflowRunId, status });
});
