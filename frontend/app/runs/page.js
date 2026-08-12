"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useOrg } from "../lib/OrgProvider";
import { useSubscription } from "../lib/subscriptions";

const RUNS_SUBSCRIPTION = `
  subscription Runs($orgId: uuid!) {
    workflow_runs(where: { org_id: { _eq: $orgId } }, order_by: { created_at: desc }, limit: 100) {
      id
      workflow_id
      status
      trigger_type
      started_at
      finished_at
      created_at
      workflow {
        name
      }
    }
  }
`;

function StatusBadge({ status }) {
  const map = {
    running: { cls: "badge-running", icon: null, label: "Running" },
    pending: { cls: "badge-pending", icon: "schedule", label: "Pending" },
    paused: { cls: "badge-paused", icon: "pause_circle", label: "Paused" },
    succeeded: { cls: "badge-completed", icon: "check_circle", label: "Succeeded" },
    failed: { cls: "badge-failed", icon: "error", label: "Failed" },
    cancelled: { cls: "badge-inactive", icon: "cancel", label: "Cancelled" },
  };
  const m = map[status] ?? { cls: "badge-inactive", icon: null, label: status };
  return (
    <div className={`badge ${m.cls}`}>
      {status === "running" ? (
        <span className="pulse-dot" />
      ) : (
        m.icon && <span className="material-symbols-outlined icon-sm">{m.icon}</span>
      )}
      <span>{m.label}</span>
    </div>
  );
}

function formatDuration(startedAt, finishedAt) {
  if (!startedAt) return "—";
  const end = finishedAt ? new Date(finishedAt) : new Date();
  const ms = end - new Date(startedAt);
  const secs = Math.max(0, Math.round(ms / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function RunsPage() {
  const { currentOrgId, isLoading: orgLoading, memberships } = useOrg();
  const [search, setSearch] = useState("");
  const { data, error } = useSubscription(RUNS_SUBSCRIPTION, { orgId: currentOrgId }, { skip: !currentOrgId });

  const runs = useMemo(() => {
    const all = data?.workflow_runs ?? [];
    if (!search.trim()) return all;
    const q = search.trim().toLowerCase();
    return all.filter((r) => r.id.toLowerCase().includes(q) || r.workflow?.name?.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <div className="app-layout">
      <Sidebar />
      <TopBar title="Runs" />

      <main
        className="main-content-with-topbar dot-grid"
        style={{ overflow: "auto", padding: 24, backgroundColor: "var(--color-surface-dim)" }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div
            className="flex justify-between"
            style={{
              alignItems: "flex-end",
              borderBottom: "1px solid var(--color-outline-variant)",
              paddingBottom: 16,
              marginBottom: 24,
            }}
          >
            <div>
              <h2 className="text-headline-lg">Execution Runs</h2>
              <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)", marginTop: 4 }}>
                Monitor and manage workflow execution history across the organization.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="search-input-wrapper">
                <span className="material-symbols-outlined">search</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search Run ID or workflow..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {orgLoading ? (
            <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
              Loading…
            </p>
          ) : memberships.length === 0 ? (
            <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
              You&apos;re not in an organization yet.
            </p>
          ) : error ? (
            <p className="text-body-md" style={{ color: "var(--color-error)" }}>
              {error}
            </p>
          ) : (
            <div className="table-container">
              <div className="gradient-highlight-top" />
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Workflow</th>
                    <th>Run ID</th>
                    <th>Status</th>
                    <th>Trigger</th>
                    <th>Start Time</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className={run.status === "failed" ? "row-error" : ""}>
                      <td style={{ color: "var(--color-on-surface)" }}>{run.workflow?.name ?? "—"}</td>
                      <td>
                        <Link
                          href={`/runs/${run.id}`}
                          className="text-label-mono"
                          style={{
                            color: run.status === "running" ? "var(--color-primary)" : "var(--color-on-surface)",
                            fontWeight: run.status === "running" ? 700 : 500,
                          }}
                        >
                          #{run.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td>
                        <StatusBadge status={run.status} />
                      </td>
                      <td style={{ color: "var(--color-on-surface-variant)" }}>{run.trigger_type}</td>
                      <td style={{ color: "var(--color-on-surface-variant)" }}>
                        {new Date(run.created_at).toLocaleString()}
                      </td>
                      <td style={{ color: "var(--color-on-surface-variant)" }}>
                        {formatDuration(run.started_at, run.finished_at)}
                      </td>
                    </tr>
                  ))}
                  {runs.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ color: "var(--color-on-surface-variant)", textAlign: "center", padding: 24 }}>
                        No runs yet. Trigger a workflow from the Builder to see it here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
