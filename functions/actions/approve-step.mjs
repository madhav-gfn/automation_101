import { withErrorHandling, HttpError } from "../_lib/http.mjs";
import { adminGraphql } from "../_lib/hasura.mjs";
import { verifyWebhookSecret, sessionUserId } from "../_lib/auth.mjs";
import { resumeWorkflowRun } from "../_lib/executor.mjs";

// The Layer-2 rule that can't live in a database permission: approving an
// approval_gate step is a decision made mid-execution, not a row read/write, so
// step_runs deliberately has no client insert/update permission at all (see
// nhost/metadata tables.yaml) — this handler is the only path that can resume a run.
export default withErrorHandling(async (req, res) => {
  verifyWebhookSecret(req, "ACTIONS_WEBHOOK_SECRET");
  const userId = sessionUserId(req);
  const { step_run_id: stepRunId, decision } = req.body.input;

  if (!["approve", "reject"].includes(decision)) {
    throw new HttpError(400, "decision must be 'approve' or 'reject'");
  }

  const { step_runs_by_pk: stepRun } = await adminGraphql(
    `query ($id: uuid!) { step_runs_by_pk(id: $id) { org_id } }`,
    { id: stepRunId }
  );
  if (!stepRun) throw new HttpError(404, "step run not found");

  const { org_members: members } = await adminGraphql(
    `query ($orgId: uuid!, $userId: uuid!) {
      org_members(where: { org_id: { _eq: $orgId }, user_id: { _eq: $userId } }) { role }
    }`,
    { orgId: stepRun.org_id, userId }
  );
  const role = members[0]?.role;
  if (!role || !["owner", "editor"].includes(role)) {
    throw new HttpError(403, "must be an owner or editor of this step's organization to approve it");
  }

  const { status } = await resumeWorkflowRun({ stepRunId, approved: decision === "approve" });
  res.status(200).json({ step_run_id: stepRunId, status });
});
