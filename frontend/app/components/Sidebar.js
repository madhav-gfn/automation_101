"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", icon: "architecture", label: "Builder" },
  { href: "/runs", icon: "play_circle", label: "Runs" },
  { href: "/settings", icon: "settings", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const getActiveKey = () => {
    if (pathname === "/") return "/";
    if (pathname.startsWith("/runs")) return "/runs";
    if (pathname.startsWith("/settings")) return "/settings";
    return "/";
  };

  const activeKey = getActiveKey();

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
        <div className="sidebar-quota">
          <div className="sidebar-quota-header">
            <span>Quota</span>
            <span>78%</span>
          </div>
          <div className="quota-bar">
            <div className="quota-bar-fill" style={{ width: "78%" }} />
          </div>
          <button
            className="btn btn-outline-primary btn-full"
            style={{ marginTop: 12 }}
          >
            Upgrade Quota
          </button>
        </div>

        {/* Links */}
        <div className="sidebar-footer-links">
          <a href="#" className="sidebar-footer-link">
            <span className="material-symbols-outlined icon-sm">help</span>
            Help
          </a>
          <a href="#" className="sidebar-footer-link">
            <span className="material-symbols-outlined icon-sm">terminal</span>
            Logs
          </a>
        </div>
      </div>
    </aside>
  );
}
