import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import WorkflowNode from "./components/WorkflowNode";
import NodeConfigPanel from "./components/NodeConfigPanel";
import ExecutionDrawer from "./components/ExecutionDrawer";

export const metadata = {
  title: "Workflow Builder — AI Architect",
  description: "Visual canvas builder for AI agent workflows",
};

export default function BuilderPage() {
  return (
    <div className="app-layout">
      <Sidebar />
      <TopBar />

      <main
        className="main-content-with-topbar canvas-bg"
        style={{ overflow: "hidden", display: "flex" }}
      >
        {/* Canvas Area */}
        <div className="flex-1 relative" style={{ padding: 32 }}>
          {/* SVG Connection Lines */}
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            {/* Connection: LLM → HTTP (green, active) */}
            <path
              className="node-path"
              d="M 300 150 C 400 150, 400 100, 500 100"
              fill="none"
              stroke="#4edea3"
              strokeWidth="2"
              strokeLinecap="round"
              style={{
                filter: "drop-shadow(0 0 4px rgba(78,222,163,0.5))",
              }}
            />
            {/* Connection: LLM → Gate (gray, inactive) */}
            <path
              className="node-path"
              d="M 300 150 C 400 150, 400 300, 500 300"
              fill="none"
              stroke="#4B5563"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>

          {/* Node 1: LLM (Selected) */}
          <WorkflowNode
            type="llm"
            title="Classify Intent"
            typeLabel="LLM"
            icon="smart_toy"
            inputs={[{ label: "Input Text" }]}
            outputs={[
              { label: "Intent Score" },
              { label: "Category" },
            ]}
            top={100}
            left={100}
            selected
          />

          {/* Node 2: HTTP Request */}
          <WorkflowNode
            type="http"
            title="Fetch CRM Data"
            typeLabel="HTTP"
            icon="cloud_sync"
            inputs={[{ label: "User ID" }]}
            outputs={[]}
            top={50}
            left={500}
          />

          {/* Node 3: Approval Gate */}
          <WorkflowNode
            type="gate"
            title="High Priority Check"
            typeLabel="Gate"
            icon="rule"
            inputs={[{ label: "Threshold" }]}
            outputs={[{ label: "True" }]}
            top={250}
            left={500}
          />
        </div>

        {/* Right Side: Node Config Panel */}
        <NodeConfigPanel />

        {/* Bottom Execution Log Drawer (Collapsed) */}
        <ExecutionDrawer collapsed withConfigPanel />
      </main>
    </div>
  );
}
