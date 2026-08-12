import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import WorkflowNode from "../../components/WorkflowNode";
import ExecutionDrawer from "../../components/ExecutionDrawer";

export const metadata = {
  title: "Run Execution — AI Architect",
  description: "Live execution view with streaming logs and approval gates",
};

export default function RunDetailPage() {
  const statusBadge = (
    <div className="badge-running-pill">
      <div className="pulse-dot" />
      <span>RUNNING</span>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <TopBar statusBadge={statusBadge} />

      <main
        className="main-content-with-topbar dot-grid"
        style={{
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--color-surface-dim)",
        }}
      >
        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          {/* SVG Connection Lines */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            {/* Ingestion → Classification (completed, green) */}
            <path
              d="M 340 180 C 400 180, 400 240, 460 240"
              fill="none"
              stroke="#4edea3"
              strokeWidth="2"
            />
            {/* Classification → Approval (active, flowing indigo) */}
            <path
              className="flow-line"
              d="M 700 240 C 760 240, 760 300, 820 300"
              fill="none"
              stroke="#c0c1ff"
              strokeWidth="2"
            />
          </svg>

          {/* Node 1: Webhook Trigger (Completed / Dimmed) */}
          <WorkflowNode
            type="webhook"
            title="Customer Email Ingestion"
            typeLabel="Webhook Trigger"
            icon="webhook"
            inputs={[]}
            outputs={[]}
            top={100}
            left={100}
            dimmed
            statusIcon="check_circle"
          >
            <div style={{ marginTop: 8 }}>
              <div
                className="text-label-mono"
                style={{
                  fontSize: 10,
                  color: "var(--color-on-surface-variant)",
                  marginBottom: 4,
                }}
              >
                OUTPUT (JSON)
              </div>
              <div className="exec-node-output">
                {`{"source": "support@acme.com", ...}`}
              </div>
              <div className="exec-node-meta">
                <span>42ms</span>
                <span>Success</span>
              </div>
            </div>
          </WorkflowNode>

          {/* Node 2: LLM Chain (Active / Pulsing) */}
          <WorkflowNode
            type="llm"
            title="Intent Classification"
            typeLabel="LLM Chain"
            icon="smart_toy"
            inputs={[]}
            outputs={[]}
            top={160}
            left={460}
            active
            statusIcon="sync"
          >
            <div style={{ marginTop: 8 }}>
              <div
                className="text-label-mono"
                style={{
                  fontSize: 10,
                  color: "var(--color-on-surface-variant)",
                  marginBottom: 4,
                }}
              >
                PROMPT TEMPLATE
              </div>
              <div className="flex gap-1 flex-wrap" style={{ marginBottom: 8 }}>
                <span className="exec-node-chip">system_prompt</span>
                <span className="exec-node-chip">email_body</span>
              </div>
              <div
                className="exec-node-output"
                style={{ color: "var(--color-primary)" }}
              >
                Generating response... (2.4s)
              </div>
            </div>
          </WorkflowNode>

          {/* Node 3: Approval Gate (Pending) */}
          <WorkflowNode
            type="gate"
            title="High-Value Refund Approval"
            typeLabel="Human-in-Loop"
            icon="rule"
            inputs={[]}
            outputs={[]}
            top={220}
            left={820}
            statusIcon="pause_circle"
          >
            <div style={{ marginTop: 8, opacity: 0.5 }}>
              <div
                className="text-label-mono"
                style={{
                  fontSize: 10,
                  color: "var(--color-on-surface-variant)",
                  marginBottom: 4,
                }}
              >
                WAITING FOR INPUT
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-ghost flex-1"
                  style={{
                    fontSize: 10,
                    padding: "4px 8px",
                    cursor: "not-allowed",
                    justifyContent: "center",
                  }}
                  disabled
                >
                  Reject
                </button>
                <button
                  className="flex-1"
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "rgba(192, 193, 255, 0.2)",
                    color: "var(--color-primary)",
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    borderRadius: "var(--radius)",
                    cursor: "not-allowed",
                    textAlign: "center",
                  }}
                  disabled
                >
                  Approve
                </button>
              </div>
            </div>
          </WorkflowNode>
        </div>

        {/* Expanded Execution Drawer */}
        <ExecutionDrawer collapsed={false} />
      </main>
    </div>
  );
}
