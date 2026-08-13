// Admin GraphQL client. All handlers use this exclusively (never a user JWT) —
// see nhost/metadata tables.yaml: workflow_runs/step_runs have no client-facing
// insert/update permissions at all, by design, so only the admin secret can write them.
import { HttpError } from "./http.mjs";

function graphqlUrl() {
  // Local docker-compose sets HASURA_GRAPHQL_ENDPOINT explicitly.
  if (process.env.HASURA_GRAPHQL_ENDPOINT) return process.env.HASURA_GRAPHQL_ENDPOINT;
  // Nhost Cloud injects this automatically into Functions at runtime.
  if (process.env.NHOST_GRAPHQL_URL) return process.env.NHOST_GRAPHQL_URL;
  if (process.env.NHOST_SUBDOMAIN && process.env.NHOST_REGION) {
    return `https://${process.env.NHOST_SUBDOMAIN}.graphql.${process.env.NHOST_REGION}.nhost.run/v1`;
  }
  return "http://localhost:8080/v1/graphql";
}

function adminSecret() {
  return process.env.HASURA_GRAPHQL_ADMIN_SECRET || process.env.NHOST_ADMIN_SECRET || "";
}

export async function adminGraphql(query, variables = {}) {
  const res = await fetch(graphqlUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hasura-admin-secret": adminSecret(),
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) {
    throw new HttpError(500, `Hasura GraphQL error: ${JSON.stringify(body.errors)}`);
  }
  return body.data;
}
