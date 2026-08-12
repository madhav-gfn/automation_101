export default function TopBar({ title = "Workflow Orchestrator", breadcrumb, statusBadge, right }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-title">{title}</span>
        {breadcrumb && (
          <>
            <div className="topbar-divider" />
            <nav className="topbar-nav">{breadcrumb}</nav>
          </>
        )}
      </div>

      <div className="topbar-right">
        {statusBadge && <div>{statusBadge}</div>}

        <div className="topbar-icon-group">
          <button className="topbar-icon-btn" title="Notifications">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="topbar-icon-btn" title="History">
            <span className="material-symbols-outlined">history</span>
          </button>
        </div>

        {right && <div className="topbar-actions">{right}</div>}
      </div>
    </header>
  );
}
