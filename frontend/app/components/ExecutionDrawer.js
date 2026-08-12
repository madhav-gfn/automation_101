/**
 * ExecutionDrawer — Bottom drawer for execution logs.
 *
 * Props:
 *  - collapsed: boolean (collapsed vs expanded view)
 *  - withConfigPanel: boolean (adjusts right margin when config panel is open)
 */
export default function ExecutionDrawer({
  collapsed = true,
  withConfigPanel = false,
}) {
  if (collapsed) {
    return (
      <div
        className={`exec-drawer ${withConfigPanel ? "exec-drawer-collapsed" : ""}`}
      >
        <div className="exec-drawer-header">
          <div className="exec-drawer-header-left">
            <span
              className="material-symbols-outlined icon-sm"
              style={{ color: "var(--color-secondary)" }}
            >
              check_circle
            </span>
            <span
              className="text-label-mono"
              style={{ fontWeight: 600, color: "var(--color-on-surface)" }}
            >
              Execution Logs (Idle)
            </span>
            <span className="exec-drawer-tag">Last run: 2m ago</span>
          </div>
          <div className="exec-drawer-header-right">
            <button
              style={{ color: "var(--color-on-surface-variant)" }}
              title="Expand"
            >
              <span className="material-symbols-outlined icon-sm">
                open_in_full
              </span>
            </button>
            <button
              style={{ color: "var(--color-on-surface-variant)" }}
              title="Expand"
            >
              <span className="material-symbols-outlined icon-sm">
                keyboard_arrow_up
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="exec-drawer drawer-expanded">
      {/* Header */}
      <div className="drawer-expanded-header">
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            terminal
          </span>
          <h3 className="text-headline-sm" style={{ fontSize: 14, fontWeight: 700 }}>
            Execution Trace:{" "}
            <span
              className="text-label-mono"
              style={{
                fontWeight: 400,
                color: "var(--color-on-surface-variant)",
              }}
            >
              run_req_98a7f4
            </span>
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            style={{
              padding: 4,
              borderRadius: "var(--radius)",
              color: "var(--color-on-surface-variant)",
            }}
          >
            <span className="material-symbols-outlined icon-sm">
              filter_list
            </span>
          </button>
          <button
            style={{
              padding: 4,
              borderRadius: "var(--radius)",
              color: "var(--color-on-surface-variant)",
            }}
          >
            <span className="material-symbols-outlined icon-sm">
              keyboard_arrow_down
            </span>
          </button>
        </div>
      </div>

      {/* Approval Banner */}
      <div className="drawer-approval-banner">
        <div
          className="flex items-center gap-2"
          style={{ color: "var(--color-error)" }}
        >
          <span className="material-symbols-outlined icon-sm">warning</span>
          <span
            className="text-body-md"
            style={{ fontSize: 14, fontWeight: 600 }}
          >
            Approval Required: High-Value Refund Gate requires manual
            intervention.
          </span>
        </div>
        <button className="btn btn-danger" style={{ fontSize: 11, padding: "4px 12px" }}>
          Review Now
        </button>
      </div>

      {/* Split Content */}
      <div className="drawer-content-split">
        {/* Log List */}
        <div className="drawer-log-list">
          <div className="drawer-log-item dimmed">
            <span style={{ color: "var(--color-on-surface-variant)", width: 56 }}>
              10:42:01
            </span>
            <span style={{ color: "var(--color-secondary)" }}>[INFO]</span>
            <span className="truncate" style={{ color: "var(--color-on-surface)" }}>
              Webhook Trigger initiated
            </span>
          </div>

          <div className="drawer-log-item dimmed">
            <span style={{ color: "var(--color-on-surface-variant)", width: 56 }}>
              10:42:01
            </span>
            <span style={{ color: "var(--color-secondary)" }}>[SUCCESS]</span>
            <span className="truncate" style={{ color: "var(--color-on-surface)" }}>
              Payload parsed successfully (42ms)
            </span>
          </div>

          <div className="drawer-log-item active">
            <span style={{ color: "var(--color-on-surface-variant)", width: 56 }}>
              10:42:02
            </span>
            <span style={{ color: "var(--color-primary)" }}>[ACTIVE]</span>
            <span
              className="truncate"
              style={{
                color: "var(--color-primary)",
                fontWeight: 700,
              }}
            >
              LLM Intent Classification running...
            </span>
          </div>

          <div className="drawer-log-item">
            <span style={{ color: "var(--color-on-surface-variant)", width: 56 }}>
              10:42:05
            </span>
            <span style={{ color: "var(--color-amber)" }}>[WAIT]</span>
            <span className="truncate" style={{ color: "var(--color-amber)" }}>
              Approval Gate activated
            </span>
          </div>
        </div>

        {/* IO Inspector */}
        <div className="drawer-io-inspector">
          <div className="io-tabs">
            <span className="io-tab io-tab-input">INPUT</span>
            <span className="io-tab io-tab-output">STREAMING OUTPUT</span>
          </div>
          <div className="json-output">
            <span className="json-key">&quot;system_prompt&quot;:</span>{" "}
            &quot;Analyze the customer email and classify the intent. Extract
            relevant entities.&quot;,{"\n"}
            <span className="json-key">&quot;email_body&quot;:</span>{" "}
            &quot;Hello, I received order #8992 yesterday but the screen on the
            device is completely shattered. I need a refund immediately.&quot;,
            {"\n"}
            <span className="json-key">&quot;current_chunk&quot;:</span> {"{"}{"\n"}
            {"  "}&quot;intent&quot;:{" "}
            <span className="json-value">&quot;refund_request&quot;</span>,{"\n"}
            {"  "}&quot;sentiment&quot;:{" "}
            <span className="json-value">&quot;highly_negative&quot;</span>,{"\n"}
            {"  "}&quot;entities&quot;: {"{"}{"\n"}
            {"    "}&quot;order_id&quot;:{" "}
            <span className="json-value">&quot;8992&quot;</span>,{"\n"}
            {"    "}&quot;issue&quot;:{" "}
            <span className="json-value">&quot;shattered_screen&quot;</span>{"\n"}
            {"  "}{"}"},{"\n"}
            {"  "}&quot;suggested_action&quot;:{" "}
            <span className="json-streaming">
              &quot;route_to_tier_2...&quot;
            </span>
            {"\n"}
            {"}"}
          </div>
        </div>
      </div>
    </div>
  );
}
