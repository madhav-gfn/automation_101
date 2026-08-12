"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/AuthProvider";
import { useOrg } from "../lib/OrgProvider";

const navItems = [
  { href: "/", icon: "architecture", label: "Builder" },
  { href: "/runs", icon: "play_circle", label: "Runs" },
  { href: "/settings", icon: "settings", label: "Settings" },
];

function initialsOf(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { memberships, currentOrgId, currentOrg, setCurrentOrgId, isLoading } = useOrg();

  const getActiveKey = () => {
    if (pathname === "/") return "/";
    if (pathname.startsWith("/runs")) return "/runs";
    if (pathname.startsWith("/settings")) return "/settings";
    return "/";
  };

  const activeKey = getActiveKey();
  const usagePct =
    currentOrg && currentOrg.quota_calls_allowed > 0
      ? Math.min(100, Math.round((currentOrg.quota_calls_used / currentOrg.quota_calls_allowed) * 100))
      : 0;

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-header">
        <div className="sidebar-logo">A</div>
        <div>
          <div className="sidebar-brand-name">AI Architect</div>
          <div className="sidebar-brand-tier">Enterprise Tier</div>
        </div>
      </div>

      {/* Org switcher */}
      <div style={{ padding: "0 16px", marginBottom: 8 }}>
        {isLoading ? (
          <div className="text-label-mono" style={{ color: "var(--color-on-surface-variant)" }}>
            Loading orgs…
          </div>
        ) : memberships.length === 0 ? (
          <div className="text-label-mono" style={{ color: "var(--color-on-surface-variant)" }}>
            No organizations yet
          </div>
        ) : (
          <select
            className="select-field"
            value={currentOrgId ?? ""}
            onChange={(e) => setCurrentOrgId(e.target.value)}
          >
            {memberships.map((m) => (
              <option key={m.org_id} value={m.org_id}>
                {m.organization.name} ({m.role})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-nav-item ${activeKey === item.href ? "active" : ""}`}
          >
            <span
              className={`material-symbols-outlined ${activeKey === item.href ? "filled" : ""}`}
            >
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Quota */}
        {currentOrg && (
          <div className="sidebar-quota">
            <div className="sidebar-quota-header">
              <span>Quota</span>
              <span>{usagePct}%</span>
            </div>
            <div className="quota-bar">
              <div className="quota-bar-fill" style={{ width: `${usagePct}%` }} />
            </div>
            <div
              className="text-label-mono"
              style={{ marginTop: 6, fontSize: 10, color: "var(--color-on-surface-variant)" }}
            >
              {currentOrg.quota_calls_used} / {currentOrg.quota_calls_allowed} calls this period
            </div>
          </div>
        )}

        {/* Account */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              flexShrink: 0,
              background:
                "linear-gradient(135deg, var(--color-primary-container), var(--color-inverse-primary))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "white",
            }}
          >
            {initialsOf(user?.displayName || user?.email)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              className="text-label-mono"
              style={{
                fontSize: 11,
                color: "var(--color-on-surface)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={user?.email}
            >
              {user?.displayName || user?.email}
            </div>
          </div>
          <button
            className="sidebar-footer-link"
            title="Sign out"
            onClick={() => signOut()}
            style={{ padding: 4 }}
          >
            <span className="material-symbols-outlined icon-sm">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
