/**
 * WorkflowNode — A draggable node on the builder canvas.
 *
 * Props:
 *  - type: "llm" | "gate" | "http"
 *  - title: node display name
 *  - typeLabel: short label (e.g. "LLM", "Gate", "HTTP")
 *  - icon: Material Symbol icon name
 *  - inputs: [{ label }]
 *  - outputs: [{ label, variant? }]  — variant: "primary" | "secondary" | "default"
 *  - top / left: absolute position
 *  - selected: boolean
 *  - dimmed: boolean
 *  - active: boolean (pulsing border)
 *  - statusIcon: optional icon to show in header-right
 *  - children: optional extra content in body
 */

const accentMap = {
  llm: "node-accent-indigo",
  gate: "node-accent-amber",
  http: "node-accent-sky",
  webhook: "node-accent-tertiary",
};

const colorMap = {
  llm: "var(--color-primary)",
  gate: "var(--color-amber)",
  http: "var(--color-sky)",
  webhook: "var(--color-tertiary)",
};

export default function WorkflowNode({
  type = "llm",
  title,
  typeLabel,
  icon,
  inputs = [],
  outputs = [],
  top,
  left,
  selected,
  dimmed,
  active,
  statusIcon,
  children,
}) {
  const nodeClass = [
    "workflow-node",
    selected && "selected",
    dimmed && "dimmed",
    active && "active",
  ]
    .filter(Boolean)
    .join(" ");

  const accentColor = colorMap[type] || "var(--color-primary)";

  return (
    <div className={nodeClass} style={{ top, left }}>
      <div className={`node-accent ${accentMap[type] || "node-accent-indigo"}`} />

      {/* Header */}
      <div className="node-header">
        <div className="node-header-left">
          <span
            className="material-symbols-outlined icon-sm"
            style={{ color: accentColor }}
          >
            {icon}
          </span>
          <span className="node-type-label" style={{ color: accentColor }}>
            {typeLabel}
          </span>
        </div>
        {statusIcon ? (
          <span
            className={`material-symbols-outlined icon-sm ${
              statusIcon === "sync" ? "animate-spin" : ""
            }`}
            style={{
              color:
                statusIcon === "check_circle"
                  ? "var(--color-secondary)"
                  : statusIcon === "sync"
                  ? "var(--color-primary)"
                  : "var(--color-outline)",
            }}
          >
            {statusIcon}
          </span>
        ) : (
          <span
            className="material-symbols-outlined icon-xs"
            style={{
              color: "var(--color-on-surface-variant)",
              cursor: "pointer",
            }}
          >
            more_horiz
          </span>
        )}
      </div>

      {/* Body */}
      <div className="node-body">
        <h3 className="node-title">{title}</h3>

        {/* Ports */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {inputs.map((inp, i) => (
            <div className="node-port-row" key={`in-${i}`}>
              <div className="node-port node-port-input" />
              <span className="node-port-label">{inp.label}</span>
            </div>
          ))}

          {outputs.map((out, i) => (
            <div className="node-port-row" key={`out-${i}`}>
              <span className="node-port-label node-port-label-right">
                {out.label}
              </span>
              <div
                className={`node-port ${
                  out.variant === "secondary"
                    ? "node-port-output-secondary"
                    : "node-port-output"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Optional extra content */}
        {children}
      </div>
    </div>
  );
}
