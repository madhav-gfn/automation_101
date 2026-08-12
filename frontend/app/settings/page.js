import Sidebar from "../components/Sidebar";

export const metadata = {
  title: "Workspace Settings — AI Architect",
  description: "Manage API keys, team access, and consumption metrics",
};

const apiKeys = [
  {
    name: "Production_v2",
    status: "active",
    value: "sk-prod-*************************8a9f",
    lastUsed: "2m ago",
  },
  {
    name: "Staging_Env",
    status: "inactive",
    value: "sk-stag-*************************3c1b",
    lastUsed: "5d ago",
  },
];

const teamMembers = [
  {
    initials: "JS",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "Owner",
    lastActive: "Just now",
    avatarBg: "var(--color-tertiary-container)",
    avatarColor: "var(--color-on-tertiary-container)",
  },
  {
    initials: "MR",
    name: "Mark Rogers",
    email: "mark@example.com",
    role: "Editor",
    lastActive: "2h ago",
    avatarBg: "var(--color-primary-container)",
    avatarColor: "var(--color-on-primary-container)",
  },
];

export default function SettingsPage() {
  return (
    <div className="app-layout">
      <Sidebar />

      <main
        className="main-content dot-grid"
        style={{ backgroundColor: "var(--color-canvas)" }}
      >
        {/* Header */}
        <div className="settings-header">
          <div>
            <h2 className="text-headline-lg">Workspace Settings</h2>
            <p
              className="text-body-md"
              style={{
                color: "var(--color-on-surface-variant)",
                marginTop: 4,
              }}
            >
              Manage API keys, team access, and view consumption metrics.
            </p>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="bento-grid">
          {/* API Keys — 8 columns */}
          <section className="bento-card col-span-8 flex flex-col">
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 24 }}
            >
              <div>
                <h3
                  className="text-headline-sm flex items-center gap-2"
                  style={{ color: "var(--color-primary)" }}
                >
                  <span className="material-symbols-outlined">key</span>
                  API Keys
                </h3>
                <p
                  className="text-body-md"
                  style={{
                    color: "var(--color-on-surface-variant)",
                    marginTop: 4,
                  }}
                >
                  Active keys for programmatic workflow execution.
                </p>
              </div>
              <button className="btn btn-primary">
                <span className="material-symbols-outlined icon-xs">add</span>
                Generate Key
              </button>
            </div>

            <div className="flex flex-col gap-4 flex-1">
              {apiKeys.map((key) => (
                <div className="key-item" key={key.name}>
                  <div className="flex-1">
                    <div
                      className="flex items-center gap-3"
                      style={{ marginBottom: 4 }}
                    >
                      <span
                        className="text-body-md"
                        style={{
                          fontWeight: 600,
                          color: "var(--color-on-surface)",
                        }}
                      >
                        {key.name}
                      </span>
                      <span
                        className={`badge ${
                          key.status === "active"
                            ? "badge-active"
                            : "badge-inactive"
                        }`}
                        style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}
                      >
                        {key.status === "active" ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                    <div className="key-value">{key.value}</div>
                  </div>
                  <div className="key-actions">
                    <span className="key-meta">Last used: {key.lastUsed}</span>
                    <button
                      className="action-btn"
                      title="Copy"
                      style={{ opacity: 1 }}
                    >
                      <span className="material-symbols-outlined">
                        content_copy
                      </span>
                    </button>
                    <button
                      className="action-btn action-btn-danger"
                      title="Revoke"
                      style={{ opacity: 1 }}
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quota Usage — 4 columns */}
          <section
            className="bento-card col-span-4 flex flex-col relative overflow-hidden"
          >
            {/* Top progress bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: 4,
                backgroundColor: "var(--color-surface-container-highest)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: "85%",
                  backgroundColor: "var(--color-secondary)",
                }}
              />
            </div>

            <h3
              className="text-headline-sm flex items-center gap-2"
              style={{ color: "var(--color-secondary)", marginBottom: 24 }}
            >
              <span className="material-symbols-outlined">speed</span>
              Quota Usage
            </h3>

            {/* Donut Chart */}
            <div
              className="flex-1 flex flex-col justify-center items-center"
              style={{ padding: "24px 0" }}
            >
              <div className="donut-container">
                <svg viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--color-surface-container-highest)"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--color-secondary)"
                    strokeWidth="3"
                    strokeDasharray="85, 100"
                  />
                </svg>
                <div className="donut-label">
                  <span className="text-headline-lg">85%</span>
                </div>
              </div>
              <p
                className="text-label-mono text-center"
                style={{
                  color: "var(--color-on-surface-variant)",
                  marginTop: 16,
                }}
              >
                4.2M / 5M Node Executions
              </p>
            </div>

            {/* Breakdown */}
            <div
              style={{
                marginTop: "auto",
                paddingTop: 16,
                borderTop: "1px solid rgba(70, 69, 84, 0.5)",
              }}
            >
              <div
                className="flex justify-between items-center"
                style={{ marginBottom: 8 }}
              >
                <span
                  className="text-label-mono"
                  style={{
                    fontSize: 10,
                    color: "var(--color-on-surface-variant)",
                  }}
                >
                  LLM Tokens
                </span>
                <span
                  className="text-label-mono"
                  style={{ fontSize: 10, color: "var(--color-on-surface)" }}
                >
                  12.4M
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span
                  className="text-label-mono"
                  style={{
                    fontSize: 10,
                    color: "var(--color-on-surface-variant)",
                  }}
                >
                  Storage
                </span>
                <span
                  className="text-label-mono"
                  style={{ fontSize: 10, color: "var(--color-on-surface)" }}
                >
                  45GB / 100GB
                </span>
              </div>
            </div>
          </section>

          {/* Team Permissions — 12 columns */}
          <section className="bento-card col-span-12">
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 24 }}
            >
              <h3
                className="text-headline-sm flex items-center gap-2"
                style={{ color: "var(--color-tertiary)" }}
              >
                <span className="material-symbols-outlined">group</span>
                Team Permissions
              </h3>
              <div className="flex gap-3">
                <div className="search-input-wrapper">
                  <span className="material-symbols-outlined">search</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search members..."
                    style={{ width: 200 }}
                  />
                </div>
                <button className="btn btn-ghost">Invite</button>
              </div>
            </div>

            <div
              style={{
                border: "1px solid var(--color-outline-variant)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
              }}
            >
              <table className="data-table">
                <thead>
                  <tr
                    style={{
                      backgroundColor: "var(--color-surface-container-high)",
                    }}
                  >
                    <th>User</th>
                    <th>Role</th>
                    <th>Last Active</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.email}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className="team-avatar"
                            style={{
                              backgroundColor: member.avatarBg,
                              color: member.avatarColor,
                            }}
                          >
                            {member.initials}
                          </div>
                          <div>
                            <div
                              className="text-body-md"
                              style={{
                                fontWeight: 600,
                                color: "var(--color-on-surface)",
                              }}
                            >
                              {member.name}
                            </div>
                            <div
                              className="text-label-mono"
                              style={{
                                fontSize: 10,
                                color: "var(--color-on-surface-variant)",
                              }}
                            >
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {member.role === "Owner" ? (
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "var(--radius)",
                              backgroundColor: "var(--color-surface-bright)",
                              border:
                                "1px solid var(--color-outline-variant)",
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              color: "var(--color-on-surface)",
                            }}
                          >
                            Owner
                          </span>
                        ) : (
                          <select className="team-role-select" defaultValue={member.role}>
                            <option>Editor</option>
                            <option>Viewer</option>
                            <option>Admin</option>
                          </select>
                        )}
                      </td>
                      <td>
                        <span
                          className="text-label-mono"
                          style={{
                            fontSize: 11,
                            color: "var(--color-on-surface-variant)",
                          }}
                        >
                          {member.lastActive}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          style={{
                            padding: 4,
                            color: "var(--color-on-surface-variant)",
                            transition: "color 0.15s",
                          }}
                        >
                          <span className="material-symbols-outlined icon-sm">
                            more_vert
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
