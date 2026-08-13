"use client";

import { use, useState } from "react";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import WorkflowNode from "../../components/WorkflowNode";
import { useOrg } from "../../lib/OrgProvider";
import { useSubscription } from "../../lib/subscriptions";
import { gqlRequest } from "../../lib/graphql";

const RUN_DETAIL_SUBSCRIPTION = `
  subscription RunDetail($id: uuid!) {
    workflow_runs_by_pk(id: $id) {
      id
      workflow_id
      status
      trigger_type
      started_at
      finished_at
      error
      created_at
      workflow {
        name
      }
      step_runs(order_by: { workflow_step: { step_order: asc } }) {
        id
        status
        input
        output
        error
        attempt
        started_at
        finished_at
        approved_at
        workflow_step {
          id
          step_order
          type
          name
        }
        approver {
          displayName
          email
        }
      }
    }
  }
`;

const STEP_META = {
  llm_call: { nodeType: "llm", icon: "smart_toy" },
  http_request: { nodeType: "http", icon: "cloud_sync" },
  db_write: { nodeType: "http", icon: "database" },
  conditional_branch: { nodeType: "gate", icon: "rule" },
  approval_gate: { nodeType: "gate", icon: "pause_circle" },
  notify: { nodeType: "webhook", icon: "notifications" },
};

const STATUS_ICON = {
  pending: "schedule",
  running: "sync",
  succeeded: "check_circle",
  failed: "error",
  paused: "pause_circle",
  skipped: "block",
};

function RunStatusPill({ status }) {
  if (status === "running" || status === "pending") {
    return (
      <div className="badge-running-pill">
        <div className="pulse-dot" />
        <span>{status.toUpperCase()}</span>
      </div>
    );
  }
  const colors = {
    succeeded: "var(--color-secondary)",
    failed: "var(--color-error)",
    paused: "var(--color-amber)",
    cancelled: "var(--color-outline)",
  };
  return (
    <div className="badge-running-pill" style={{ color: colors[status] ?? "var(--color-outline)" }}>
      <span>{status.toUpperCase()}</span>
    </div>
  );
}

export default function RunDetailPage({ params }) {
  const { id } = use(params);
  const { canEdit } = useOrg();
  const [selectedStepRunId, setSelectedStepRunId] = useState(null);
  const [approving, setApproving] = useState(null);
  const [actionError, setActionError] = useState(null);

  const { data, error } = useSubscription(RUN_DETAIL_SUBSCRIPTION, { id });
  const run = data?.workflow_runs_by_pk;
  const stepRuns = run?.step_runs ?? [];
  const selectedStepRun = stepRuns.find((sr) => sr.id === selectedStepRunId) ?? stepRuns.find((sr) => sr.status === "running") ?? stepRuns[stepRuns.length - 1];

  const pausedStep = stepRuns.find((sr) => sr.status === "paused");

  async function decide(stepRunId, decision) {
    setApproving(stepRunId);
    setActionError(null);
    try {
      await gqlRequest(
        `mutation ($stepRunId: uuid!, $decision: String!) {
          approveStep(step_run_id: $stepRunId, decision: $decision) { step_run_id status }
        }`,
        { stepRunId, decision }
      );
    } catch (err) {
      setActionError(err.message);
    } finally {
      setApproving(null);
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <TopBar
        title={run?.workflow?.name ?? "Run"}
        breadcrumb={<span className="topbar-nav-link active">#{id.slice(0, 8)}</span>}
        statusBadge={run && <RunStatusPill status={run.status} />}
      />

      <main
        className="main-content-with-topbar dot-grid"
        style={{
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--color-surface-dim)",
          padding: 24,
        }}
      >
        {error && (
          <p className="text-body-md" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        )}

        {!run ? (
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            Loading…
          </p>
        ) : (
          <>
            {run.error && (
              <div
                className="text-body-md"
                style={{
                  marginBottom: 16,
                  padding: "10px 14px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--color-error)",
                  color: "var(--color-error)",
                }}
              >
                Run error: {run.error}
              </div>
            )}

            {pausedStep && (
              <div className="drawer-approval-banner" style={{ marginBottom: 16, borderRadius: "var(--radius)" }}>
                <div className="flex items-center gap-2" style={{ color: "var(--color-error)" }}>
                  <span className="material-symbols-outlined icon-sm">warning</span>
                  <span className="text-body-md" style={{ fontSize: 14, fontWeight: 600 }}>
                    Approval Required: &quot;{pausedStep.workflow_step.name}&quot; is waiting for a decision.
                  </span>
                </div>
                {canEdit ? (
                  <div className="flex gap-2">
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 11, padding: "4px 12px" }}
                      disabled={approving === pausedStep.id}
                      onClick={() => decide(pausedStep.id, "reject")}
                    >
                      Reject
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ fontSize: 11, padding: "4px 12px" }}
                      disabled={approving === pausedStep.id}
                      onClick={() => decide(pausedStep.id, "approve")}
                    >
                      {approving === pausedStep.id ? "Working…" : "Approve"}
                    </button>
                  </div>
                ) : (
                  <span className="text-body-md" style={{ fontSize: 12, color: "var(--color-on-surface-variant)" }}>
                    Only owners/editors can decide.
                  </span>
                )}
              </div>
            )}

            {actionError && (
              <div className="text-body-md" style={{ color: "var(--color-error)", marginBottom: 16 }}>
                {actionError}
              </div>
            )}

            <div style={{ display: "flex", gap: 24, flex: 1, minHeight: 0 }}>
              {/* Step list */}
              <div className="flex flex-col gap-4" style={{ flex: 1, overflow: "auto" }}>
                {stepRuns.map((sr) => {
                  const meta = STEP_META[sr.workflow_step.type] ?? STEP_META.llm_call;
                  return (
                    <WorkflowNode
                      key={sr.id}
                      type={meta.nodeType}
                      title={sr.workflow_step.name}
                      typeLabel={sr.workflow_step.type}
                      icon={meta.icon}
                      flow
                      active={sr.status === "running"}
                      dimmed={sr.status === "succeeded" || sr.status === "pending"}
                      selected={selectedStepRun?.id === sr.id}
                      statusIcon={STATUS_ICON[sr.status]}
                      onClick={() => setSelectedStepRunId(sr.id)}
                    >
                      <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
                        <span
                          className="text-label-mono"
                          style={{ fontSize: 10, color: "var(--color-on-surface-variant)" }}
                        >
                          attempt {sr.attempt}
                          {sr.finished_at && sr.started_at
                            ? ` · ${Math.max(0, Math.round((new Date(sr.finished_at) - new Date(sr.started_at)) / 1000))}s`
                            : ""}
                        </span>
                      </div>
                      {sr.status === "paused" && sr.approver && (
                        <div className="text-label-mono" style={{ fontSize: 10, marginTop: 4 }}>
                          Waiting since {new Date(sr.started_at).toLocaleTimeString()}
                        </div>
                      )}
                      {sr.approved_at && (
                        <div className="text-label-mono" style={{ fontSize: 10, marginTop: 4, color: "var(--color-secondary)" }}>
                          Approved by {sr.approver?.displayName || sr.approver?.email} at{" "}
                          {new Date(sr.approved_at).toLocaleTimeString()}
                        </div>
                      )}
                    </WorkflowNode>
                  );
                })}
              </div>

              {/* IO inspector */}
              <div className="drawer-io-inspector" style={{ flex: 1, maxWidth: 480, overflow: "auto" }}>
                {selectedStepRun ? (
                  <>
                    <div className="io-tabs">
                      <span className="io-tab io-tab-input">{selectedStepRun.workflow_step.name}</span>
                    </div>
                    <div style={{ padding: 12 }}>
                      <div className="text-label-mono" style={{ fontSize: 10, color: "var(--color-on-surface-variant)", marginBottom: 4 }}>
                        INPUT
                      </div>
                      <pre className="json-output" style={{ whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(selectedStepRun.input ?? null, null, 2)}
                      </pre>
                      <div className="text-label-mono" style={{ fontSize: 10, color: "var(--color-on-surface-variant)", margin: "12px 0 4px" }}>
                        OUTPUT
                      </div>
                      <pre className="json-output" style={{ whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(selectedStepRun.output ?? null, null, 2)}
                      </pre>
                      {selectedStepRun.error && (
                        <>
                          <div className="text-label-mono" style={{ fontSize: 10, color: "var(--color-error)", margin: "12px 0 4px" }}>
                            ERROR
                          </div>
                          <pre className="json-output" style={{ whiteSpace: "pre-wrap", color: "var(--color-error)" }}>
                            {selectedStepRun.error}
                          </pre>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-body-md" style={{ padding: 12, color: "var(--color-on-surface-variant)" }}>
                    Select a step to inspect its input/output.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
