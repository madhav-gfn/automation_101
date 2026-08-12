/**
 * NodeConfigPanel — Right-side inspector for configuring a selected node.
 */
export default function NodeConfigPanel() {
  return (
    <aside className="config-panel">
      {/* Header */}
      <div className="config-panel-header">
        <h3 className="text-headline-sm" style={{ fontWeight: 600 }}>
          Node Config
        </h3>
        <button style={{ color: "var(--color-on-surface-variant)" }}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Body */}
      <div className="config-panel-body">
        {/* Node Name */}
        <div>
          <label className="config-field-label">Node Name</label>
          <input
            type="text"
            className="input-field"
            defaultValue="Classify Intent"
          />
        </div>

        {/* Model Selection */}
        <div>
          <label className="config-field-label">Model Selection</label>
          <select className="select-field">
            <option>GPT-4o (Default)</option>
            <option>Claude 3.5 Sonnet</option>
          </select>
        </div>

        {/* System Prompt */}
        <div>
          <div className="config-field-label-row">
            <span className="config-field-label" style={{ marginBottom: 0 }}>
              System Prompt
            </span>
            <span
              style={{
                color: "var(--color-primary)",
                fontSize: 10,
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
              }}
            >
              Edit
            </span>
          </div>
          <div className="prompt-viewer">
            You are a strict classifier. Read the{" "}
            <span className="prompt-variable">{"{{Input Text}}"}</span> and
            determine if the user is highly upset or needs immediate technical
            assistance. Output JSON only.
          </div>
        </div>

        {/* Output Variables */}
        <div>
          <label className="config-field-label">Output Variables</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span className="variable-chip">
              Intent Score{" "}
              <span className="material-symbols-outlined icon-xxs" style={{ cursor: "pointer" }}>
                close
              </span>
            </span>
            <span className="variable-chip">
              Category{" "}
              <span className="material-symbols-outlined icon-xxs" style={{ cursor: "pointer" }}>
                close
              </span>
            </span>
            <button className="add-chip">
              <span className="material-symbols-outlined icon-xxs">add</span>
              Add
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
