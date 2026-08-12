import { withErrorHandling } from "../_lib/http.mjs";
import { adminGraphql } from "../_lib/hasura.mjs";
import { verifyWebhookSecret } from "../_lib/auth.mjs";
import { startWorkflowRun } from "../_lib/executor.mjs";

// Fired every minute by the scheduled_workflow_dispatcher Hasura cron trigger (see
// nhost/metadata/cron_triggers.yaml). Minimal 5-field cron matcher — supports "*",
// "*/n", comma lists, and exact values, evaluated in UTC (Hasura's cron scheduler
// itself runs in UTC, so this stays consistent with when it actually fires).
function fieldMatches(field, value, min) {
  if (field === "*") return true;
  return field.split(",").some((part) => {
    if (part.includes("/")) {
      const [range, stepStr] = part.split("/");
      const step = Number(stepStr);
      const start = range === "*" ? min : Number(range);
      return value >= start && (value - start) % step === 0;
    }
    return Number(part) === value;
  });
}

function isDue(cronExpr, now) {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  return (
    fieldMatches(minute, now.getUTCMinutes(), 0) &&
    fieldMatches(hour, now.getUTCHours(), 0) &&
    fieldMatches(dayOfMonth, now.getUTCDate(), 1) &&
    fieldMatches(month, now.getUTCMonth() + 1, 1) &&
    fieldMatches(dayOfWeek, now.getUTCDay(), 0)
  );
}

export default withErrorHandling(async (req, res) => {
  verifyWebhookSecret(req, "ACTIONS_WEBHOOK_SECRET");

  const { workflow_triggers: triggers } = await adminGraphql(
    `query {
      workflow_triggers(where: { type: { _eq: "scheduled" }, is_enabled: { _eq: true } }) {
        id
        config
        workflow { id org_id is_active }
      }
    }`
  );

  const now = new Date();
  const due = triggers.filter((t) => t.workflow?.is_active && t.config?.cron && isDue(t.config.cron, now));

  const results = [];
  for (const trigger of due) {
    try {
      const result = await startWorkflowRun({
        workflowId: trigger.workflow.id,
        orgId: trigger.workflow.org_id,
        triggerType: "scheduled",
      });
      results.push({ workflow_id: trigger.workflow.id, ...result });
    } catch (err) {
      results.push({ workflow_id: trigger.workflow.id, error: String(err.message ?? err) });
    }
  }

  res.status(200).json({ dispatched: results.length, results });
});
