// Applies nhost/metadata/* to the LOCAL Hasura instance via the metadata HTTP API.
// This is a dev convenience only — it is not what deploys to Nhost Cloud. Nhost
// Cloud's git integration reads nhost/metadata directly (real Hasura CLI format)
// and applies it server-side on push. This script exists purely because the
// nhost/hasura CLIs have no Windows build and this machine's sandbox can't reach
// github.com to download the standalone binary, so local iteration goes through
// this thin YAML -> replace_metadata JSON translator instead.
//
// Usage: node scripts/apply-metadata.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const metaDir = path.join(root, "nhost", "metadata");

const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT_BASE || "http://localhost:8080";
const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET || "localdevsecret";
const ACTIONS_BASE_URL = process.env.ACTIONS_BASE_URL || "http://host.docker.internal:3010";

function loadYaml(relPath) {
  return yaml.load(readFileSync(path.join(metaDir, relPath), "utf8"));
}

const tables = loadYaml("databases/default/tables/tables.yaml");
const cronTriggers = loadYaml("cron_triggers.yaml").map((c) => ({
  ...c,
  webhook: c.webhook.replace("{{ACTIONS_BASE_URL}}", ACTIONS_BASE_URL),
}));

const actionDefs = loadYaml("actions.yaml").actions;

// Mirrors nhost/metadata/actions.graphql by hand (see comment in that file / here):
// the real Hasura CLI parses the SDL itself; this script isn't the CLI, so the
// argument/output shapes are duplicated here in JSON form for the local apply path.
const actionSignatures = {
  triggerWorkflowRun: {
    arguments: [{ name: "workflow_id", type: "uuid!" }],
    output_type: "TriggerWorkflowRunOutput",
  },
  approveStep: {
    arguments: [
      { name: "step_run_id", type: "uuid!" },
      { name: "decision", type: "String!" },
    ],
    output_type: "ApproveStepOutput",
  },
  webhookTriggerRun: {
    arguments: [
      { name: "workflow_id", type: "uuid!" },
      { name: "token", type: "String!" },
    ],
    output_type: "WebhookTriggerRunOutput",
  },
};

const outputFields = {
  TriggerWorkflowRunOutput: [
    { name: "workflow_run_id", type: "uuid!" },
    { name: "status", type: "String!" },
  ],
  ApproveStepOutput: [
    { name: "step_run_id", type: "uuid!" },
    { name: "status", type: "String!" },
  ],
  WebhookTriggerRunOutput: [
    { name: "workflow_run_id", type: "uuid!" },
    { name: "status", type: "String!" },
  ],
};

const actions = actionDefs.map((a) => {
  const sig = actionSignatures[a.name];
  return {
    name: a.name,
    definition: {
      kind: a.definition.kind,
      type: "mutation",
      arguments: sig.arguments,
      output_type: sig.output_type,
      handler: a.definition.handler.replace("{{ACTIONS_BASE_URL}}", ACTIONS_BASE_URL),
      forward_client_headers: a.definition.forward_client_headers,
      headers: [{ name: "x-webhook-secret", value: "local-dev-actions-secret" }],
      timeout: a.definition.timeout,
    },
    permissions: a.permissions,
  };
});

const custom_types = {
  enums: [],
  input_objects: [],
  scalars: [],
  objects: Object.entries(outputFields).map(([name, fields]) => ({ name, fields })),
};

const metadata = {
  version: 3,
  sources: [
    {
      name: "default",
      kind: "postgres",
      tables,
      configuration: {
        connection_info: {
          database_url: { from_env: "HASURA_GRAPHQL_DATABASE_URL" },
          isolation_level: "read-committed",
          use_prepared_statements: true,
        },
      },
    },
  ],
  actions,
  custom_types,
  cron_triggers: cronTriggers,
  query_collections: [],
  allow_list: [],
  rest_endpoints: [],
  remote_schemas: [],
  inherited_roles: [],
};

const res = await fetch(`${HASURA_ENDPOINT}/v1/metadata`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-hasura-admin-secret": ADMIN_SECRET,
  },
  body: JSON.stringify({ type: "replace_metadata", args: { metadata, allow_inconsistent_metadata: true } }),
});

const body = await res.json();
if (!res.ok) {
  console.error("replace_metadata failed:", JSON.stringify(body, null, 2));
  process.exit(1);
}
if (body.is_consistent === false) {
  console.warn("Metadata applied WITH inconsistencies:");
  console.warn(JSON.stringify(body.inconsistent_objects, null, 2));
} else {
  console.log("Metadata applied cleanly.");
}
