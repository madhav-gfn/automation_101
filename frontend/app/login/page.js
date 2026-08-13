"use client";

import { useState } from "react";
import { useAuth } from "../lib/AuthProvider";

const DEMO_ACCOUNTS = [
  { role: "Owner", email: "demo.owner@example.com", password: "DemoPass123!" },
  { role: "Editor", email: "demo.editor@example.com", password: "DemoPass123!" },
  { role: "Viewer", email: "demo.viewer@example.com", password: "DemoPass123!" },
];

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  function useDemoAccount(account) {
    setMode("signin");
    setError(null);
    setNotice(null);
    setEmail(account.email);
    setPassword(account.password);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        const session = await signUp(email, password, displayName || undefined);
        if (!session) {
          setNotice("Account created. Check your email to verify before signing in.");
          setMode("signin");
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        flexWrap: "wrap",
        background: "var(--color-canvas)",
      }}
    >
      <div
        style={{
          width: 380,
          padding: 32,
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-outline-variant)",
          background: "var(--color-surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div className="sidebar-logo">A</div>
          <div>
            <div className="sidebar-brand-name">AI Architect</div>
            <div className="sidebar-brand-tier">Enterprise Tier</div>
          </div>
        </div>

        <h2 className="text-headline-sm" style={{ marginBottom: 4 }}>
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h2>
        <p
          className="text-body-md"
          style={{ color: "var(--color-on-surface-variant)", marginBottom: 20 }}
        >
          {mode === "signin"
            ? "Access your organization's workflows."
            : "You'll need an org owner to invite you before you can see any workflows."}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mode === "signup" && (
            <div>
              <label className="config-field-label">Display Name</label>
              <input
                type="text"
                className="input-field"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
          )}
          <div>
            <label className="config-field-label">Email</label>
            <input
              type="email"
              required
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="config-field-label">Password</label>
            <input
              type="password"
              required
              minLength={3}
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-body-md" style={{ color: "var(--color-error)" }}>
              {error}
            </div>
          )}
          {notice && (
            <div className="text-body-md" style={{ color: "var(--color-secondary)" }}>
              {notice}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setError(null);
              setNotice(null);
              setMode(mode === "signin" ? "signup" : "signin");
            }}
          >
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>

      <div
        style={{
          width: 320,
          padding: 24,
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-outline-variant)",
          background: "var(--color-surface)",
        }}
      >
        <h3 className="text-headline-sm" style={{ marginBottom: 4 }}>
          Try the demo
        </h3>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)", marginBottom: 16 }}>
          No sign-up needed — sign in as a member of &quot;Demo Organization&quot; to explore each role.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => useDemoAccount(account)}
              className="btn btn-ghost"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 2,
                padding: "10px 12px",
                border: "1px solid var(--color-outline-variant)",
              }}
            >
              <span className="text-label-mono" style={{ fontSize: 10, color: "var(--color-secondary)" }}>
                {account.role.toUpperCase()}
              </span>
              <span className="text-body-md">{account.email}</span>
              <span className="text-label-mono" style={{ fontSize: 10, color: "var(--color-on-surface-variant)" }}>
                {account.password}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
