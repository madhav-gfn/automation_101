import { HttpError } from "./http.mjs";

// Every Action/event-trigger webhook call from Hasura carries this header (see
// nhost/metadata/actions.yaml and cron_triggers.yaml headers: x-webhook-secret).
// It proves the request came from our own Hasura instance, not an open endpoint.
export function verifyWebhookSecret(req, envVar) {
  const expected = process.env[envVar];
  const got = req.headers["x-webhook-secret"];
  if (!expected || got !== expected) {
    throw new HttpError(401, "invalid or missing x-webhook-secret");
  }
}

// Hasura Actions always send session_variables in the JSON body (independent of
// forward_client_headers, which only forwards the raw client headers alongside it).
export function sessionUserId(req) {
  const id = req.body?.session_variables?.["x-hasura-user-id"];
  if (!id) throw new HttpError(401, "missing x-hasura-user-id session variable");
  return id;
}
