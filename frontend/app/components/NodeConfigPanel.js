"use client";

import { useEffect, useState } from "react";

const STEP_TYPES = [
  { value: "llm_call", label: "LLM Call" },
  { value: "http_request", label: "HTTP Request" },
  { value: "db_write", label: "DB Write" },
  { value: "conditional_branch", label: "Conditional Branch" },
  { value: "approval_gate", label: "Approval Gate" },
  { value: "notify", label: "Notify" },
];

const OPERATORS = ["eq", "neq", "gt", "lt", "contains"];

function jsonToText(value) {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function textToJson(text, fallback) {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed; // allow plain strings where JSON isn't required
  }
}

export default function NodeConfigPanel({ step, readOnly, confirmingDelete, onSave, onDelete, onClose }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("llm_call");
  const [fields, setFields] = useState({});
  const [rawError, setRawError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!step) return;
    setName(step.name);
    setType(step.type);
    setFields(step.config ?? {});
    setRawError(null);
  }, [step?.id]);

  if (!step) return null;

  function updateField(key, value) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function buildConfig() {
    switch (type) {
      case "llm_call":
        return { prompt: fields.prompt ?? "", ...(fields.system ? { system: fields.system } : {}) };
      case "http_request":
        return {
          url: fields.url ?? "",
          method: fields.method ?? "GET",
          ...(fields.headersText?.trim()
            ? { headers: textToJson(fields.headersText, {}) }
            : {}),
          ...(fields.bodyText?.trim() ? { body: textToJson(fields.bodyText, fields.bodyText) } : {}),
        };
      case "db_write":
        return { data: textToJson(fields.dataText ?? "{}", {}) };
      case "conditional_branch":
        return {
          field: fields.field ?? "",
          operator: fields.operator ?? "eq",
          value: textToJson(fields.valueText ?? "", fields.valueText ?? ""),
        };
      case "approval_gate":
        return {};
      case "notify":
        return { message: fields.message ?? "" };
      default:
        return {};
    }
  }

  async function handleSave() {
    setRawError(null);
    setSaving(true);
    try {
      await onSave({ name, type, config: buildConfig() });
    } catch (err) {
      setRawError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="config-panel">
      <div className="config-panel-header">
        <h3 className="text-headline-sm" style={{ fontWeight: 600 }}>
          Node Config
        </h3>
        <button style={{ color: "var(--color-on-surface-variant)" }} onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="config-panel-body">
        <div>
          <label className="config-field-label">Node Name</label>
          <input
            type="text"
            className="input-field"
            value={name}
            disabled={readOnly}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="config-field-label">Step Type</label>
          <select
            className="select-field"
            value={type}
            disabled={readOnly}
            onChange={(e) => setType(e.target.value)}
          >
            {STEP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {type === "llm_call" && (
          <>
            <div>
              <label className="config-field-label">Prompt ({"{{path}}"} templating supported)</label>
              <textarea
                className="input-field"
                rows={4}
                disabled={readOnly}
                value={fields.prompt ?? ""}
                onChange={(e) => updateField("prompt", e.target.value)}
              />
            </div>
            <div>
              <label className="config-field-label">System Prompt (optional)</label>
              <textarea
                className="input-field"
                rows={2}
                disabled={readOnly}
                value={fields.system ?? ""}
                onChange={(e) => updateField("system", e.target.value)}
              />
            </div>
          </>
        )}

        {type === "http_request" && (
          <>
            <div>
              <label className="config-field-label">URL</label>
              <input
                type="text"
                className="input-field"
                disabled={readOnly}
                value={fields.url ?? ""}
                onChange={(e) => updateField("url", e.target.value)}
                placeholder="https://api.example.com/resource"
              />
            </div>
            <div>
              <label className="config-field-label">Method</label>
              <select
                className="select-field"
                disabled={readOnly}
                value={fields.method ?? "GET"}
                onChange={(e) => updateField("method", e.target.value)}
              >
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="config-field-label">Headers (JSON, optional)</label>
              <textarea
                className="input-field"
                rows={2}
                disabled={readOnly}
                value={fields.headersText ?? jsonToText(fields.headers)}
                onChange={(e) => updateField("headersText", e.target.value)}
                placeholder={'{"Content-Type": "application/json"}'}
              />
            </div>
            <div>
              <label className="config-field-label">Body (JSON, optional)</label>
              <textarea
                className="input-field"
                rows={3}
                disabled={readOnly}
                value={fields.bodyText ?? jsonToText(fields.body)}
                onChange={(e) => updateField("bodyText", e.target.value)}
              />
            </div>
          </>
        )}

        {type === "db_write" && (
          <div>
            <label className="config-field-label">Data (JSON)</label>
            <textarea
              className="input-field"
              rows={5}
              disabled={readOnly}
              value={fields.dataText ?? jsonToText(fields.data)}
              onChange={(e) => updateField("dataText", e.target.value)}
            />
          </div>
        )}

        {type === "conditional_branch" && (
          <>
            <div>
              <label className="config-field-label">Field (dot path, e.g. steps.1.status)</label>
              <input
                type="text"
                className="input-field"
                disabled={readOnly}
                value={fields.field ?? ""}
                onChange={(e) => updateField("field", e.target.value)}
              />
            </div>
            <div>
              <label className="config-field-label">Operator</label>
              <select
                className="select-field"
                disabled={readOnly}
                value={fields.operator ?? "eq"}
                onChange={(e) => updateField("operator", e.target.value)}
              >
                {OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="config-field-label">Value</label>
              <input
                type="text"
                className="input-field"
                disabled={readOnly}
                value={fields.valueText ?? jsonToText(fields.value)}
                onChange={(e) => updateField("valueText", e.target.value)}
              />
            </div>
          </>
        )}

        {type === "approval_gate" && (
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            No config needed. When the run reaches this step it pauses until an owner or
            editor approves or rejects it from the run detail page.
          </p>
        )}

        {type === "notify" && (
          <div>
            <label className="config-field-label">Message ({"{{path}}"} templating supported)</label>
            <textarea
              className="input-field"
              rows={3}
              disabled={readOnly}
              value={fields.message ?? ""}
              onChange={(e) => updateField("message", e.target.value)}
            />
          </div>
        )}

        {rawError && (
          <div className="text-body-md" style={{ color: "var(--color-error)" }}>
            {rawError}
          </div>
        )}

        {!readOnly && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              className="btn btn-ghost action-btn-danger"
              onClick={() => onDelete()}
              title={confirmingDelete ? "Click again to confirm delete" : "Delete step"}
            >
              <span className="material-symbols-outlined icon-sm">delete</span>
              {confirmingDelete && <span style={{ marginLeft: 4 }}>Confirm?</span>}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
