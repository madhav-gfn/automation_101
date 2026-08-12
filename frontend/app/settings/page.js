"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../lib/AuthProvider";
import { useOrg } from "../lib/OrgProvider";
import { gqlRequest } from "../lib/graphql";

const SETTINGS_QUERY = `
  query Settings($orgId: uuid!) {
    organizations_by_pk(id: $orgId) {
      id
      name
      quota_calls_used
      quota_calls_allowed
      quota_period_start
    }
    org_usage_stats(where: { org_id: { _eq: $orgId } }) {
      runs_this_month
      calls_used_this_month
      avg_run_duration_seconds
    }
    org_members(where: { org_id: { _eq: $orgId } }, order_by: { created_at: asc }) {
      id
      role
      created_at
      user {
        id
        email
        display_name
      }
    }
  }
`;

const ROLES = ["owner", "editor", "viewer"];

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { currentOrgId, currentOrg, isOwner, isLoading: orgLoading, memberships, refetch: refetchOrgs } = useOrg();

  const [org, setOrg] = useState(null);
  const [usage, setUsage] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");

  const load = useCallback(async () => {
    if (!currentOrgId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await gqlRequest(SETTINGS_QUERY, { orgId: currentOrgId });
      setOrg(data.organizations_by_pk);
      setUsage(data.org_usage_stats[0] ?? null);
      setMembers(data.org_members);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    load();
  }, [load]);

  async function renameOrg(name) {
    try {
      await gqlRequest(
        `mutation ($id: uuid!, $name: String!) {
          update_organizations_by_pk(pk_columns: { id: $id }, _set: { name: $name }) { id }
        }`,
        { id: currentOrgId, name }
      );
      setOrg((o) => ({ ...o, name }));
      refetchOrgs();
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeRole(memberId, role) {
    try {
      await gqlRequest(
        `mutation ($id: uuid!, $role: org_role!) {
          update_org_members_by_pk(pk_columns: { id: $id }, _set: { role: $role }) { id }
        }`,
        { id: memberId, role }
      );
      setMembers((ms) => ms.map((m) => (m.id === memberId ? { ...m, role } : m)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeMember(memberId) {
    if (!window.confirm("Remove this member from the organization?")) return;
    try {
      await gqlRequest(`mutation ($id: uuid!) { delete_org_members_by_pk(id: $id) { id } }`, { id: memberId });
      setMembers((ms) => ms.filter((m) => m.id !== memberId));
    } catch (err) {
      setError(err.message);
    }
  }

  async function invite() {
    if (!inviteUserId.trim()) return;
    try {
      const data = await gqlRequest(
        `mutation ($orgId: uuid!, $userId: uuid!, $role: org_role!) {
          insert_org_members_one(object: { org_id: $orgId, user_id: $userId, role: $role }) {
            id role created_at user { id email display_name }
          }
        }`,
        { orgId: currentOrgId, userId: inviteUserId.trim(), role: inviteRole }
      );
      setMembers((ms) => [...ms, data.insert_org_members_one]);
      setInviteUserId("");
    } catch (err) {
      setError(err.message);
    }
  }

  const usagePct = org && org.quota_calls_allowed > 0 ? Math.min(100, Math.round((org.quota_calls_used / org.quota_calls_allowed) * 100)) : 0;

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content dot-grid" style={{ backgroundColor: "var(--color-canvas)" }}>
        <div className="settings-header">
          <div>
            <h2 className="text-headline-lg">Workspace Settings</h2>
            <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)", marginTop: 4 }}>
              Manage organization details, team access, and view consumption metrics.
            </p>
          </div>
        </div>

        {orgLoading ? (
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)", padding: 24 }}>
            Loading…
          </p>
        ) : memberships.length === 0 ? (
          <div style={{ padding: 24 }}>
            <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
              You&apos;re not in an organization yet. Share your User ID below with an owner so they can add you.
            </p>
            <YourAccountCard user={user} onSignOut={signOut} />
          </div>
        ) : loading ? (
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)", padding: 24 }}>
            Loading settings…
          </p>
        ) : (
          <div className="bento-grid">
            {error && (
              <div
                className="text-body-md col-span-12"
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--color-error)",
                  color: "var(--color-error)",
                }}
              >
                {error}
              </div>
            )}

            {/* Org + Account — 8 columns */}
            <section className="bento-card col-span-8 flex flex-col">
              <h3 className="text-headline-sm flex items-center gap-2" style={{ color: "var(--color-primary)", marginBottom: 16 }}>
                <span className="material-symbols-outlined">domain</span>
                Organization
              </h3>
              <div style={{ marginBottom: 20 }}>
                <label className="config-field-label">Name</label>
                <input
                  type="text"
                  className="input-field"
                  defaultValue={org?.name}
                  disabled={!isOwner}
                  key={org?.id}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value !== org?.name) renameOrg(e.target.value);
                  }}
                />
              </div>
              <YourAccountCard user={user} onSignOut={signOut} inline />
            </section>

            {/* Quota Usage — 4 columns */}
            <section className="bento-card col-span-4 flex flex-col relative overflow-hidden">
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
                <div style={{ height: "100%", width: `${usagePct}%`, backgroundColor: "var(--color-secondary)" }} />
              </div>

              <h3 className="text-headline-sm flex items-center gap-2" style={{ color: "var(--color-secondary)", marginBottom: 24 }}>
                <span className="material-symbols-outlined">speed</span>
                Quota Usage
              </h3>

              <div className="flex-1 flex flex-col justify-center items-center" style={{ padding: "24px 0" }}>
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
                      strokeDasharray={`${usagePct}, 100`}
                    />
                  </svg>
                  <div className="donut-label">
                    <span className="text-headline-lg">{usagePct}%</span>
                  </div>
                </div>
                <p className="text-label-mono text-center" style={{ color: "var(--color-on-surface-variant)", marginTop: 16 }}>
                  {org?.quota_calls_used ?? 0} / {org?.quota_calls_allowed ?? 0} calls this period
                </p>
              </div>

              <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(70, 69, 84, 0.5)" }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                  <span className="text-label-mono" style={{ fontSize: 10, color: "var(--color-on-surface-variant)" }}>
                    Runs this month
                  </span>
                  <span className="text-label-mono" style={{ fontSize: 10, color: "var(--color-on-surface)" }}>
                    {usage?.runs_this_month ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-label-mono" style={{ fontSize: 10, color: "var(--color-on-surface-variant)" }}>
                    Avg run duration
                  </span>
                  <span className="text-label-mono" style={{ fontSize: 10, color: "var(--color-on-surface)" }}>
                    {usage?.avg_run_duration_seconds != null ? `${Math.round(usage.avg_run_duration_seconds)}s` : "—"}
                  </span>
                </div>
              </div>
            </section>

            {/* Team Permissions — 12 columns */}
            <section className="bento-card col-span-12">
              <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
                <h3 className="text-headline-sm flex items-center gap-2" style={{ color: "var(--color-tertiary)" }}>
                  <span className="material-symbols-outlined">group</span>
                  Team Permissions
                </h3>
                {isOwner && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input-field"
                      style={{ width: 260 }}
                      placeholder="User ID to invite"
                      value={inviteUserId}
                      onChange={(e) => setInviteUserId(e.target.value)}
                    />
                    <select className="select-field" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button className="btn btn-ghost" onClick={invite}>
                      Invite
                    </button>
                  </div>
                )}
              </div>

              <div style={{ border: "1px solid var(--color-outline-variant)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                <table className="data-table">
                  <thead>
                    <tr style={{ backgroundColor: "var(--color-surface-container-high)" }}>
                      <th>User</th>
                      <th>Role</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="team-avatar">
                              {(member.user?.display_name || member.user?.email || "?")[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="text-body-md" style={{ fontWeight: 600, color: "var(--color-on-surface)" }}>
                                {member.user?.display_name || "(no display name)"}
                                {member.user?.id === user?.id && " (you)"}
                              </div>
                              <div className="text-label-mono" style={{ fontSize: 10, color: "var(--color-on-surface-variant)" }}>
                                {member.user?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {isOwner && member.user?.id !== user?.id ? (
                            <select
                              className="team-role-select"
                              value={member.role}
                              onChange={(e) => changeRole(member.id, e.target.value)}
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: "var(--radius)",
                                backgroundColor: "var(--color-surface-bright)",
                                border: "1px solid var(--color-outline-variant)",
                                fontFamily: "var(--font-mono)",
                                fontSize: 10,
                                color: "var(--color-on-surface)",
                              }}
                            >
                              {member.role}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {isOwner && member.user?.id !== user?.id && (
                            <button className="action-btn action-btn-danger" title="Remove" onClick={() => removeMember(member.id)}>
                              <span className="material-symbols-outlined icon-sm">delete</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function YourAccountCard({ user, onSignOut, inline }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={inline ? { marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--color-outline-variant)" } : {}}>
      <div className="text-label-mono" style={{ fontSize: 10, color: "var(--color-on-surface-variant)", marginBottom: 8 }}>
        YOUR ACCOUNT
      </div>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div>
          <div className="text-body-md" style={{ fontWeight: 600 }}>
            {user?.displayName || user?.email}
          </div>
          <div className="text-label-mono" style={{ fontSize: 10, color: "var(--color-on-surface-variant)" }}>
            {user?.email}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={onSignOut}>
          Sign out
        </button>
      </div>
      <div className="flex items-center gap-2">
        <code
          className="text-label-mono"
          style={{ padding: "6px 10px", background: "var(--color-surface-container-high)", borderRadius: "var(--radius)", fontSize: 11 }}
        >
          {user?.id}
        </code>
        <button
          className="action-btn"
          title="Copy your User ID (share it with an owner to be invited to their org)"
          onClick={() => {
            navigator.clipboard.writeText(user?.id ?? "");
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          <span className="material-symbols-outlined icon-sm">{copied ? "check" : "content_copy"}</span>
        </button>
      </div>
    </div>
  );
}
