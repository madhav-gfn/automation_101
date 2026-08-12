"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import WorkflowNode from "./components/WorkflowNode";
import NodeConfigPanel from "./components/NodeConfigPanel";
import { useOrg } from "./lib/OrgProvider";
import { useAuth } from "./lib/AuthProvider";
import { gqlRequest } from "./lib/graphql";

const WORKFLOWS_QUERY = `
  query Workflows($orgId: uuid!) {
    workflows(where: { org_id: { _eq: $orgId } }, order_by: { created_at: desc }) {
      id
      name
      description
      is_active
      created_at
    }
  }
`;

const WORKFLOW_DETAIL_QUERY = `
  query WorkflowDetail($id: uuid!) {
    workflow_steps(where: { workflow_id: { _eq: $id } }, order_by: { step_order: asc }) {
      id
      step_order
      type
      name
      config
    }
    workflow_triggers(where: { workflow_id: { _eq: $id } }) {
      id
      type
      config
      is_enabled
    }
  }
`;

const STEP_META = {
  llm_call: { nodeType: "llm", icon: "smart_toy", label: "LLM Call" },
  http_request: { nodeType: "http", icon: "cloud_sync", label: "HTTP Request" },
  db_write: { nodeType: "http", icon: "database", label: "DB Write" },
  conditional_branch: { nodeType: "gate", icon: "rule", label: "Branch" },
  approval_gate: { nodeType: "gate", icon: "pause_circle", label: "Approval" },
  notify: { nodeType: "webhook", icon: "notifications", label: "Notify" },
};

function stepSummary(step) {
  const c = step.config ?? {};
  switch (step.type) {
    case "llm_call":
      return c.prompt ? `"${String(c.prompt).slice(0, 60)}"` : "(no prompt set)";
    case "http_request":
      return c.url ? `${c.method ?? "GET"} ${c.url}` : "(no url set)";
    case "db_write":
      return "writes to workflow_outputs";
    case "conditional_branch":
      return c.field ? `${c.field} ${c.operator ?? "eq"} ${JSON.stringify(c.value)}` : "(no condition set)";
    case "approval_gate":
      return "pauses for owner/editor approval";
    case "notify":
      return c.message ? `"${String(c.message).slice(0, 60)}"` : "(no message set)";
    default:
      return "";
  }
}

const TRIGGER_TYPES = [
  { value: "webhook", label: "Webhook" },
  { value: "scheduled", label: "Scheduled (cron)" },
  { value: "database_event", label: "Database Event" },
];

export default function BuilderPage() {
  const { currentOrgId, currentOrg, canEdit, isOwner, isLoading: orgLoading, memberships } = useOrg();
  const { user } = useAuth();

  const [workflows, setWorkflows] = useState([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(true);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
  const [steps, setSteps] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState(null);
  const [newTriggerType, setNewTriggerType] = useState("webhook");
  const [newTriggerCron, setNewTriggerCron] = useState("*/5 * * * *");
  const [runStatus, setRunStatus] = useState(null);
  const [banner, setBanner] = useState(null);

  const loadWorkflows = useCallback(async () => {
    if (!currentOrgId) return;
    setWorkflowsLoading(true);
    try {
      const data = await gqlRequest(WORKFLOWS_QUERY, { orgId: currentOrgId });
      setWorkflows(data.workflows);
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    } finally {
      setWorkflowsLoading(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    setSelectedWorkflowId(null);
    setSteps([]);
    setTriggers([]);
    if (currentOrgId) {
      loadWorkflows();
    } else {
      setWorkflows([]);
      setWorkflowsLoading(false);
    }
  }, [currentOrgId, loadWorkflows]);

  useEffect(() => {
    if (!selectedWorkflowId && workflows.length > 0) {
      setSelectedWorkflowId(workflows[0].id);
    }
    if (selectedWorkflowId && !workflows.some((w) => w.id === selectedWorkflowId)) {
      setSelectedWorkflowId(workflows[0]?.id ?? null);
    }
  }, [workflows, selectedWorkflowId]);

  const loadDetail = useCallback(async () => {
    if (!selectedWorkflowId) {
      setSteps([]);
      setTriggers([]);
      return;
    }
    setDetailLoading(true);
    setSelectedStepId(null);
    try {
      const data = await gqlRequest(WORKFLOW_DETAIL_QUERY, { id: selectedWorkflowId });
      setSteps(data.workflow_steps);
      setTriggers(data.workflow_triggers);
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    } finally {
      setDetailLoading(false);
    }
  }, [selectedWorkflowId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const selectedWorkflow = useMemo(
    () => workflows.find((w) => w.id === selectedWorkflowId) ?? null,
    [workflows, selectedWorkflowId]
  );
  const selectedStep = useMemo(
    () => steps.find((s) => s.id === selectedStepId) ?? null,
    [steps, selectedStepId]
  );

  async function createWorkflow() {
    const name = window.prompt("Workflow name?");
    if (!name) return;
    try {
      const data = await gqlRequest(
        `mutation ($orgId: uuid!, $name: String!) {
          insert_workflows_one(object: { org_id: $orgId, name: $name, is_active: true }) { id }
        }`,
        { orgId: currentOrgId, name }
      );
      await loadWorkflows();
      setSelectedWorkflowId(data.insert_workflows_one.id);
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  }

  async function renameWorkflow(name) {
    try {
      await gqlRequest(
        `mutation ($id: uuid!, $name: String!) {
          update_workflows_by_pk(pk_columns: { id: $id }, _set: { name: $name }) { id }
        }`,
        { id: selectedWorkflowId, name }
      );
      setWorkflows((ws) => ws.map((w) => (w.id === selectedWorkflowId ? { ...w, name } : w)));
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  }

  async function toggleActive() {
    const next = !selectedWorkflow.is_active;
    try {
      await gqlRequest(
        `mutation ($id: uuid!, $isActive: Boolean!) {
          update_workflows_by_pk(pk_columns: { id: $id }, _set: { is_active: $isActive }) { id }
        }`,
        { id: selectedWorkflowId, isActive: next }
      );
      setWorkflows((ws) => ws.map((w) => (w.id === selectedWorkflowId ? { ...w, is_active: next } : w)));
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  }

  async function deleteWorkflow() {
    if (!window.confirm(`Delete workflow "${selectedWorkflow.name}"? This deletes all its runs too.`)) return;
    try {
      await gqlRequest(`mutation ($id: uuid!) { delete_workflows_by_pk(id: $id) { id } }`, {
        id: selectedWorkflowId,
      });
      setSelectedWorkflowId(null);
      await loadWorkflows();
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  }

  const defaultConfigFor = (type) => {
    switch (type) {
      case "llm_call":
        return { prompt: "" };
      case "http_request":
        return { url: "", method: "GET" };
      case "db_write":
        return { data: {} };
      case "conditional_branch":
        return { field: "", operator: "eq", value: "" };
      case "notify":
        return { message: "" };
      default:
        return {};
    }
  };

  async function addStep() {
    const nextOrder = steps.reduce((max, s) => Math.max(max, s.step_order), 0) + 1;
    try {
      const data = await gqlRequest(
        `mutation ($object: workflow_steps_insert_input!) {
          insert_workflow_steps_one(object: $object) { id step_order type name config }
        }`,
        {
          object: {
            workflow_id: selectedWorkflowId,
            step_order: nextOrder,
            type: "llm_call",
            name: `Step ${nextOrder}`,
            config: defaultConfigFor("llm_call"),
          },
        }
      );
      setSteps((s) => [...s, data.insert_workflow_steps_one]);
      setSelectedStepId(data.insert_workflow_steps_one.id);
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  }

  async function saveStep(updated) {
    await gqlRequest(
      `mutation ($id: uuid!, $set: workflow_steps_set_input!) {
        update_workflow_steps_by_pk(pk_columns: { id: $id }, _set: $set) { id }
      }`,
      { id: selectedStep.id, set: updated }
    );
    setSteps((s) => s.map((st) => (st.id === selectedStep.id ? { ...st, ...updated } : st)));
  }

  async function deleteStep() {
    if (!window.confirm(`Delete step "${selectedStep.name}"?`)) return;
    try {
      await gqlRequest(`mutation ($id: uuid!) { delete_workflow_steps_by_pk(id: $id) { id } }`, {
        id: selectedStep.id,
      });
      setSteps((s) => s.filter((st) => st.id !== selectedStep.id));
      setSelectedStepId(null);
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  }

  async function moveStep(step, direction) {
    const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
    const idx = sorted.findIndex((s) => s.id === step.id);
    const otherIdx = idx + direction;
    if (otherIdx < 0 || otherIdx >= sorted.length) return;
    const other = sorted[otherIdx];
    const tmp = -1000000 - Math.abs(step.step_order);
    try {
      await gqlRequest(
        `mutation ($aId: uuid!, $bId: uuid!, $tmp: Int!, $orderA: Int!, $orderB: Int!) {
          a: update_workflow_steps_by_pk(pk_columns: { id: $aId }, _set: { step_order: $tmp }) { id }
          b: update_workflow_steps_by_pk(pk_columns: { id: $bId }, _set: { step_order: $orderA }) { id }
          c: update_workflow_steps_by_pk(pk_columns: { id: $aId }, _set: { step_order: $orderB }) { id }
        }`,
        { aId: step.id, bId: other.id, tmp, orderA: step.step_order, orderB: other.step_order }
      );
      setSteps((s) =>
        s.map((st) => {
          if (st.id === step.id) return { ...st, step_order: other.step_order };
          if (st.id === other.id) return { ...st, step_order: step.step_order };
          return st;
        })
      );
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  }

  async function addTrigger() {
    let config = {};
    if (newTriggerType === "webhook") {
      config = { token: crypto.randomUUID() };
    } else if (newTriggerType === "scheduled") {
      config = { cron: newTriggerCron };
    }
    try {
      const data = await gqlRequest(
        `mutation ($object: workflow_triggers_insert_input!) {
          insert_workflow_triggers_one(object: $object) { id type config is_enabled }
        }`,
        { object: { workflow_id: selectedWorkflowId, type: newTriggerType, config, is_enabled: true } }
      );
      setTriggers((t) => [...t, data.insert_workflow_triggers_one]);
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  }

  async function toggleTrigger(trigger) {
    try {
      await gqlRequest(
        `mutation ($id: uuid!, $isEnabled: Boolean!) {
          update_workflow_triggers_by_pk(pk_columns: { id: $id }, _set: { is_enabled: $isEnabled }) { id }
        }`,
        { id: trigger.id, isEnabled: !trigger.is_enabled }
      );
      setTriggers((t) => t.map((tr) => (tr.id === trigger.id ? { ...tr, is_enabled: !tr.is_enabled } : tr)));
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  }

  async function deleteTrigger(trigger) {
    try {
      await gqlRequest(`mutation ($id: uuid!) { delete_workflow_triggers_by_pk(id: $id) { id } }`, {
        id: trigger.id,
      });
      setTriggers((t) => t.filter((tr) => tr.id !== trigger.id));
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  }

  async function runWorkflow() {
    setRunStatus("starting");
    setBanner(null);
    try {
      const data = await gqlRequest(
        `mutation ($id: uuid!) { triggerWorkflowRun(workflow_id: $id) { workflow_run_id status } }`,
        { id: selectedWorkflowId }
      );
      setRunStatus(null);
      setBanner({
        type: "success",
        text: `Run started (${data.triggerWorkflowRun.status}). Check the Runs tab for live progress.`,
      });
    } catch (err) {
      setRunStatus(null);
      setBanner({ type: "error", text: err.message });
    }
  }

  const sortedSteps = useMemo(() => [...steps].sort((a, b) => a.step_order - b.step_order), [steps]);

  const canRun = canEdit && selectedWorkflow?.is_active && selectedWorkflowId;

  return (
    <div className="app-layout">
      <Sidebar />
      <TopBar
        title="Workflow Builder"
        right={
          selectedWorkflowId && (
            <button className="btn btn-primary" onClick={runWorkflow} disabled={!canRun || runStatus === "starting"}>
              {runStatus === "starting" ? "Starting…" : "Run"}
            </button>
          )
        }
      />

      <main
        className="main-content-with-topbar canvas-bg"
        style={{ overflow: "auto", display: "flex" }}
      >
        <div className="flex-1" style={{ padding: 32, overflow: "auto" }}>
          {orgLoading || workflowsLoading ? (
            <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
              Loading…
            </p>
          ) : memberships.length === 0 ? (
            <EmptyOrgState userId={user?.id} />
          ) : (
            <>
              {banner && (
                <div
                  className="text-body-md"
                  style={{
                    marginBottom: 16,
                    padding: "10px 14px",
                    borderRadius: "var(--radius)",
                    border: `1px solid ${banner.type === "error" ? "var(--color-error)" : "var(--color-secondary)"}`,
                    color: banner.type === "error" ? "var(--color-error)" : "var(--color-secondary)",
                  }}
                >
                  {banner.text}
                  <button
                    style={{ float: "right", color: "inherit" }}
                    onClick={() => setBanner(null)}
                  >
                    <span className="material-symbols-outlined icon-sm">close</span>
                  </button>
                </div>
              )}

              {/* Workflow selector row */}
              <div className="flex items-center gap-3" style={{ marginBottom: 24, flexWrap: "wrap" }}>
                <select
                  className="select-field"
                  style={{ maxWidth: 260 }}
                  value={selectedWorkflowId ?? ""}
                  onChange={(e) => setSelectedWorkflowId(e.target.value || null)}
                >
                  {workflows.length === 0 && <option value="">No workflows yet</option>}
                  {workflows.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.is_active ? "" : "(inactive)"}
                    </option>
                  ))}
                </select>
                {canEdit && (
                  <button className="btn btn-ghost" onClick={createWorkflow}>
                    <span className="material-symbols-outlined icon-sm">add</span>
                    New Workflow
                  </button>
                )}
                {selectedWorkflow && canEdit && (
                  <>
                    <button className="btn btn-ghost" onClick={toggleActive}>
                      {selectedWorkflow.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <input
                      type="text"
                      className="input-field"
                      style={{ maxWidth: 220 }}
                      defaultValue={selectedWorkflow.name}
                      key={selectedWorkflow.id}
                      onBlur={(e) => {
                        if (e.target.value && e.target.value !== selectedWorkflow.name) {
                          renameWorkflow(e.target.value);
                        }
                      }}
                    />
                  </>
                )}
                {selectedWorkflow && isOwner && (
                  <button className="action-btn action-btn-danger" title="Delete workflow" onClick={deleteWorkflow}>
                    <span className="material-symbols-outlined icon-sm">delete</span>
                  </button>
                )}
              </div>

              {!selectedWorkflowId ? (
                <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                  {canEdit
                    ? "Create a workflow to get started."
                    : "No workflows in this organization yet."}
                </p>
              ) : detailLoading ? (
                <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                  Loading workflow…
                </p>
              ) : (
                <>
                  {/* Step flow */}
                  <div className="flex items-center gap-3" style={{ flexWrap: "wrap", marginBottom: 32 }}>
                    {sortedSteps.map((step, i) => {
                      const meta = STEP_META[step.type] ?? STEP_META.llm_call;
                      return (
                        <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <WorkflowNode
                            type={meta.nodeType}
                            title={step.name}
                            typeLabel={meta.label}
                            icon={meta.icon}
                            flow
                            selected={selectedStepId === step.id}
                            onClick={() => setSelectedStepId(step.id)}
                          >
                            <div
                              className="text-label-mono"
                              style={{
                                fontSize: 11,
                                color: "var(--color-on-surface-variant)",
                                marginTop: 6,
                                wordBreak: "break-word",
                              }}
                            >
                              {stepSummary(step)}
                            </div>
                            {canEdit && (
                              <div className="flex gap-2" style={{ marginTop: 8 }}>
                                <button
                                  className="action-btn"
                                  title="Move earlier"
                                  disabled={i === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveStep(step, -1);
                                  }}
                                >
                                  <span className="material-symbols-outlined icon-sm">arrow_upward</span>
                                </button>
                                <button
                                  className="action-btn"
                                  title="Move later"
                                  disabled={i === sortedSteps.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveStep(step, 1);
                                  }}
                                >
                                  <span className="material-symbols-outlined icon-sm">arrow_downward</span>
                                </button>
                              </div>
                            )}
                          </WorkflowNode>
                          {i < sortedSteps.length - 1 && (
                            <span
                              className="material-symbols-outlined"
                              style={{ color: "var(--color-outline-variant)" }}
                            >
                              arrow_forward
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {canEdit && (
                      <button
                        className="btn btn-ghost"
                        style={{ height: 60, borderStyle: "dashed" }}
                        onClick={addStep}
                      >
                        <span className="material-symbols-outlined icon-sm">add</span>
                        Add Step
                      </button>
                    )}
                  </div>

                  {/* Triggers */}
                  <section className="bento-card">
                    <h3
                      className="text-headline-sm flex items-center gap-2"
                      style={{ marginBottom: 16 }}
                    >
                      <span className="material-symbols-outlined">bolt</span>
                      Triggers
                    </h3>
                    {triggers.length === 0 && (
                      <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                        No automated triggers. The Run button above always works for owners/editors.
                      </p>
                    )}
                    <div className="flex flex-col gap-3">
                      {triggers.map((t) => (
                        <TriggerRow
                          key={t.id}
                          trigger={t}
                          workflowId={selectedWorkflowId}
                          canEdit={canEdit}
                          onToggle={() => toggleTrigger(t)}
                          onDelete={() => deleteTrigger(t)}
                        />
                      ))}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-2" style={{ marginTop: 16 }}>
                        <select
                          className="select-field"
                          style={{ maxWidth: 200 }}
                          value={newTriggerType}
                          onChange={(e) => setNewTriggerType(e.target.value)}
                        >
                          {TRIGGER_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        {newTriggerType === "scheduled" && (
                          <input
                            type="text"
                            className="input-field"
                            style={{ maxWidth: 160 }}
                            value={newTriggerCron}
                            onChange={(e) => setNewTriggerCron(e.target.value)}
                            placeholder="*/5 * * * *"
                          />
                        )}
                        <button className="btn btn-ghost" onClick={addTrigger}>
                          <span className="material-symbols-outlined icon-sm">add</span>
                          Add Trigger
                        </button>
                      </div>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </div>

        {selectedStep && (
          <NodeConfigPanel
            step={selectedStep}
            readOnly={!canEdit}
            onSave={saveStep}
            onDelete={deleteStep}
            onClose={() => setSelectedStepId(null)}
          />
        )}
      </main>
    </div>
  );
}

function EmptyOrgState({ userId }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ maxWidth: 520 }}>
      <h2 className="text-headline-lg" style={{ marginBottom: 8 }}>
        You&apos;re not in an organization yet
      </h2>
      <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)", marginBottom: 16 }}>
        Ask an org owner to add you from their Settings page using your User ID below.
      </p>
      <div className="flex items-center gap-2">
        <code
          className="text-label-mono"
          style={{
            padding: "8px 12px",
            background: "var(--color-surface-container-high)",
            borderRadius: "var(--radius)",
          }}
        >
          {userId}
        </code>
        <button
          className="btn btn-ghost"
          onClick={() => {
            navigator.clipboard.writeText(userId);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function TriggerRow({ trigger, workflowId, canEdit, onToggle, onDelete }) {
  const [showSnippet, setShowSnippet] = useState(false);
  const graphqlUrl = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN
    ? `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`
    : "<graphql-endpoint>";

  return (
    <div
      style={{
        border: "1px solid var(--color-outline-variant)",
        borderRadius: "var(--radius)",
        padding: 12,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`badge ${trigger.is_enabled ? "badge-active" : "badge-inactive"}`}
            style={{ fontSize: 10, textTransform: "uppercase" }}
          >
            {trigger.type}
          </span>
          <span className="text-body-md">{trigger.is_enabled ? "Enabled" : "Disabled"}</span>
        </div>
        <div className="flex gap-2">
          {trigger.type === "webhook" && (
            <button className="action-btn" title="Show usage" onClick={() => setShowSnippet((s) => !s)}>
              <span className="material-symbols-outlined icon-sm">code</span>
            </button>
          )}
          {canEdit && (
            <>
              <button className="action-btn" title="Toggle" onClick={onToggle}>
                <span className="material-symbols-outlined icon-sm">
                  {trigger.is_enabled ? "toggle_on" : "toggle_off"}
                </span>
              </button>
              <button className="action-btn action-btn-danger" title="Delete" onClick={onDelete}>
                <span className="material-symbols-outlined icon-sm">delete</span>
              </button>
            </>
          )}
        </div>
      </div>
      {trigger.type === "scheduled" && (
        <div className="text-label-mono" style={{ marginTop: 6, fontSize: 11, color: "var(--color-on-surface-variant)" }}>
          cron: {trigger.config?.cron} (UTC)
        </div>
      )}
      {showSnippet && trigger.type === "webhook" && (
        <pre
          className="text-label-mono"
          style={{
            marginTop: 8,
            fontSize: 10,
            whiteSpace: "pre-wrap",
            background: "var(--color-surface-container-high)",
            padding: 10,
            borderRadius: "var(--radius)",
          }}
        >
{`curl -X POST ${graphqlUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"query":"mutation($w:uuid!,$t:String!){webhookTriggerRun(workflow_id:$w,token:$t){workflow_run_id status}}","variables":{"w":"${workflowId}","t":"${trigger.config?.token}"}}'`}
        </pre>
      )}
    </div>
  );
}
