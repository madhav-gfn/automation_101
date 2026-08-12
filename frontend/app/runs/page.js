import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

export const metadata = {
  title: "Workflow Runs — AI Architect",
  description: "Monitor and manage workflow execution history",
};

const runs = [
  {
    id: "#RUN-8A92B",
    status: "running",
    startTime: "2023-10-27 14:32:01 UTC",
    duration: "02:14",
    durationExtra: "...",
  },
  {
    id: "#RUN-8A92A",
    status: "completed",
    startTime: "2023-10-27 13:15:22 UTC",
    duration: "45:12",
  },
  {
    id: "#RUN-8A91F",
    status: "failed",
    startTime: "2023-10-27 11:05:10 UTC",
    duration: "01:03",
  },
  {
    id: "#RUN-8A91E",
    status: "completed",
    startTime: "2023-10-26 22:40:00 UTC",
    duration: "12:30",
  },
];

function StatusBadge({ status }) {
  if (status === "running") {
    return (
      <div className="badge badge-running">
        <span className="pulse-dot" />
        <span>Running</span>
      </div>
    );
  }
  if (status === "completed") {
    return (
      <div className="badge badge-completed">
        <span className="material-symbols-outlined icon-sm">check_circle</span>
        <span>Completed</span>
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="badge badge-failed">
        <span className="material-symbols-outlined icon-sm">error</span>
        <span>Failed</span>
      </div>
    );
  }
  return null;
}

export default function RunsPage() {
  return (
    <div className="app-layout">
      <Sidebar />
      <TopBar />

      <main
        className="main-content-with-topbar dot-grid"
        style={{
          overflow: "auto",
          padding: 24,
          backgroundColor: "var(--color-surface-dim)",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          {/* Header */}
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
              <p
                className="text-body-md"
                style={{
                  color: "var(--color-on-surface-variant)",
                  marginTop: 4,
                }}
              >
                Monitor and manage workflow execution history across the
                organization.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="search-input-wrapper">
                <span className="material-symbols-outlined">search</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search Run ID..."
                />
              </div>
              <button className="btn btn-ghost">
                <span className="material-symbols-outlined icon-sm">
                  filter_list
                </span>
                Filter
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <div className="gradient-highlight-top" />
            <table className="data-table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Status</th>
                  <th>Start Time</th>
                  <th>Duration</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className={run.status === "failed" ? "row-error" : ""}
                  >
                    <td
                      style={{
                        color:
                          run.status === "running"
                            ? "var(--color-primary)"
                            : "var(--color-on-surface)",
                        fontWeight: run.status === "running" ? 700 : 500,
                      }}
                    >
                      {run.id}
                    </td>
                    <td>
                      <StatusBadge status={run.status} />
                    </td>
                    <td style={{ color: "var(--color-on-surface-variant)" }}>
                      {run.startTime}
                    </td>
                    <td style={{ color: "var(--color-on-surface-variant)" }}>
                      {run.duration}
                      {run.durationExtra && (
                        <span
                          style={{
                            color: "var(--color-secondary)",
                            opacity: 0.7,
                            marginLeft: 4,
                          }}
                        >
                          {run.durationExtra}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="row-actions">
                        <button className="action-btn" title="View Logs">
                          <span className="material-symbols-outlined icon-sm">
                            subject
                          </span>
                        </button>
                        {run.status === "running" ? (
                          <button
                            className="action-btn action-btn-danger"
                            title="Stop Run"
                          >
                            <span className="material-symbols-outlined icon-sm">
                              stop_circle
                            </span>
                          </button>
                        ) : (
                          <button className="action-btn" title="Rerun">
                            <span className="material-symbols-outlined icon-sm">
                              replay
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="table-footer">
              <span
                className="text-label-mono"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                Showing 1-4 of 128 runs
              </span>
              <div className="pagination-btns">
                <button className="pagination-btn" disabled>
                  <span className="material-symbols-outlined icon-sm">
                    chevron_left
                  </span>
                </button>
                <button className="pagination-btn">
                  <span className="material-symbols-outlined icon-sm">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
