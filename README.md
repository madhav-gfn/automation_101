# AI Agent Workflow Builder

An n8n-like platform for chaining AI agent steps, built on nhost + Hasura + PostgreSQL + GraphQL.
See `plan.md` for the full 5-phase build plan and status.

## Repo layout

- `nhost/` — the canonical backend: SQL migrations, Hasura metadata (tables, relationships,
  permissions, actions, cron/event triggers), and seed data. This directory is what Nhost
  Cloud's Git integration deploys automatically on push.
- `functions/` — serverless function handlers (Action handlers, event trigger webhooks,
  cron dispatcher). Built in Phase 3.
- `frontend/` — the Next.js app. Built in Phase 4.
- `scripts/apply-metadata.mjs` — dev-only tool that pushes `nhost/metadata` to a **local**
  Hasura instance (see "Why not the nhost/hasura CLI" below).
- `docker-compose.yml` — local Postgres + Hasura for fast iteration.

## Why not the nhost/hasura CLI

The `nhost` CLI ships no Windows build — only darwin/linux binaries (`npm view @nhost/cli
optionalDependencies` confirms this) — and Nhost's own docs say WSL2 is required on Windows.
This machine's sandboxed network also can't reach `github.com` (only the npm registry),
so the standalone Hasura CLI binary can't be downloaded either.

Instead:
- **Local dev**: plain `docker-compose` (official `postgres` and `hasura/graphql-engine`
  images — no CLI needed) plus `scripts/apply-metadata.mjs`, a small script that reads
  `nhost/metadata/*.yaml` and pushes it to local Hasura via the `/v1/metadata` HTTP API
  (`replace_metadata`). SQL migrations are applied directly with `docker compose exec
  postgres psql`.
- **Deployment**: `nhost/metadata` and `nhost/migrations` are written in the real Hasura
  CLI v3 format, so once this repo is pushed to GitHub and connected to an Nhost Cloud
  project (Settings → Git), Nhost's own server-side pipeline applies them exactly as the
  CLI would — no local CLI involved at all.

## Local dev quickstart

```bash
docker compose up -d                                    # Postgres + Hasura
docker compose exec -T postgres psql -U postgres -d local \
  < nhost/migrations/default/1786439535928_init_schema/up.sql
docker compose exec -T postgres psql -U postgres -d local \
  < nhost/migrations/default/1786439600000_workflow_latest_run_view/up.sql
docker compose exec -T postgres psql -U postgres -d local \
  < nhost/seeds/default/seed.sql                         # 2 orgs, 5 users, roles

npm install
node scripts/apply-metadata.mjs                          # tables, relationships, permissions, actions
```

Hasura console: http://localhost:8080/console (admin secret: `localdevsecret`, see `.env.example`).

Since the local instance has no real nhost Auth issuing JWTs, test permissions by combining
the admin secret with role-emulation headers (same trick the Hasura Console's "Test as role"
feature uses):

```bash
curl http://localhost:8080/v1/graphql \
  -H "x-hasura-admin-secret: localdevsecret" \
  -H "x-hasura-role: user" \
  -H "x-hasura-user-id: 00000000-0000-0000-0000-00000000000a" \
  -d '{"query":"query { organizations { id name } }"}'
```

Seeded users (see `nhost/seeds/default/seed.sql`): Org A has an owner (`...a`), editor
(`...b`), viewer (`...c`); Org B has an owner (`...d`) and editor (`...e`).

## What's needed from you before Phase 3

1. A free Nhost Cloud project at https://app.nhost.io (no credit card) — send me the
   subdomain/region.
2. A GitHub repo for this project, connected to that Nhost project (Settings → Git). Set
   the "Nhost folder" to `/` (repo root) — `nhost/` and `functions/` both live there.
3. A free Groq API key from https://console.groq.com/keys for the `llm_call` step.
