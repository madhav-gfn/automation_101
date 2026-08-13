# Auth / Storage / Functions / cron

`docker-compose.yml` only runs Postgres + Hasura locally. Everything else — Auth,
Storage, serverless Functions, and cron — has no practical local emulator on this
machine (see the repo root `README.md`'s "Why not the nhost/hasura CLI"), so it
runs on the linked Nhost Cloud project instead, and `functions/` is written to
match Nhost's real Functions runtime exactly.

## `functions/` deployment model

Nhost Cloud deploys `functions/**` automatically on push (same Git integration
that deploys `nhost/migrations` and `nhost/metadata`). Its router maps every file
under `functions/` to an HTTP endpoint by path — `functions/actions/foo.js`
becomes reachable at `{ACTIONS_BASE_URL}/actions/foo` — **except** files or
folders whose name starts with `_`, which are never exposed as routes. That's why
shared code lives in `functions/_lib/` instead of `functions/lib/`.

Nhost's function discovery only recognizes `.js` and `.ts` files — **not**
`.mjs` — even though the repo's `"type": "module"` in `package.json` makes plain
`.js` behave as ESM (so `import`/`export` still works). A `.mjs` file here
deploys as zero functions with no error, which silently breaks every Action,
event trigger, and cron trigger that depends on it.

Each handler file's default export is `(req, res) => {}` — a plain
Express-compatible request handler, same shape Nhost's runtime calls directly in
Cloud. `req.body` is parsed JSON, `req.headers` are the raw request headers,
`res.status(code).json(obj)` sends the response.

## Local dev

There's no local Functions runtime, so `scripts/functions-dev-server.mjs` is a
small hand-rolled HTTP server (plain `node:http`, no dependencies beyond
`dotenv`) that mounts the exact same handler files at the exact same routes. It's
a dev convenience only, kept outside `functions/` so Nhost's router never mistakes
it for an endpoint.

```bash
docker compose up -d          # Postgres + Hasura (needs ACTIONS_BASE_URL etc. — see docker-compose.yml)
npm install
npm run functions:dev         # serves functions/{actions,events,cron}/* on :3010
```

With both running, Hasura (in Docker) reaches the functions server via
`http://host.docker.internal:3010` (see `.env`) and everything — triggering a
workflow, approving a paused step, the notify event trigger, the scheduled cron
dispatcher — works end to end against local Postgres.

## What has to be configured on Nhost Cloud (not in this repo)

Unlike local dev (where `docker-compose.yml` hardcodes these), Cloud has no
default for any of the following — they must be set as Project Environment
Variables (Settings → Environment Variables):

- `ACTIONS_BASE_URL` — the handler base URL the metadata's `{{ACTIONS_BASE_URL}}`
  templates resolve against, e.g.
  `https://<subdomain>.functions.<region>.nhost.run/v1`. Without it, every
  Action/cron trigger is "inconsistent" and silently disappears from the GraphQL
  schema (looks like `field 'x' not found in type: 'mutation_root'`, not a
  permission error).
- `ACTIONS_BASE_URL_EVENT_DB` / `ACTIONS_BASE_URL_EVENT_NOTIFY` — same idea, but
  each event trigger's `webhook_from_env` wants the *full* URL including path,
  e.g. `.../v1/events/on-external-event` and `.../v1/events/on-notify-step`.
- `ACTIONS_WEBHOOK_SECRET` — sent as `x-webhook-secret` on every Action and cron
  trigger call; handlers reject requests that don't carry the matching value.
- `EVENT_TRIGGER_SECRET` — same, for the `on_step_run_insert_notify` and
  `on_external_event_insert` event triggers.

Everything else the handlers need in Cloud (`NHOST_GRAPHQL_URL`,
`NHOST_ADMIN_SECRET`) is injected automatically by the Functions runtime — see
`functions/_lib/hasura.js`. `GROQ_API_KEY` / `GROQ_MODEL` / `NOTIFY_WEBHOOK_URL`
also need to be set as Cloud environment variables for `llm_call` and `notify`
steps to work there.
