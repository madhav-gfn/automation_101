export default function TopBar({ children, statusBadge }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-title">Workflow Orchestrator</span>
        <div className="topbar-divider" />
        <nav className="topbar-nav">
          <a href="#" className="topbar-nav-link">
            Drafts
          </a>
          <a href="#" className="topbar-nav-link active">
            v1.2.0-stable
          </a>
        </nav>
      </div>

      <div className="topbar-right">
        {/* Optional status badge slot */}
        {statusBadge && <div>{statusBadge}</div>}

        <div className="topbar-icon-group">
          <button className="topbar-icon-btn" title="Notifications">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="topbar-icon-btn" title="History">
            <span className="material-symbols-outlined">history</span>
          </button>
        </div>

        <div className="topbar-actions">
          <button className="btn btn-ghost">Run</button>
          <button className="btn btn-primary">Deploy</button>
          <div className="topbar-avatar">
            <div
              style={{
                width: "100%",
                height: "100%",
                background:
                  "linear-gradient(135deg, var(--color-primary-container), var(--color-inverse-primary))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "white",
              }}
            >
              JS
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
