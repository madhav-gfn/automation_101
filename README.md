# AI Agent Workflow Builder

An n8n-like platform for chaining AI agent steps, built on nhost + Hasura + PostgreSQL + GraphQL.
See `plan.md` for the full 5-phase build plan and status.

## Live demo

**https://frontend-five-sable-f84j9ejeg6.vercel.app**

The login page lists three demo accounts — click one to fill the form, then sign in. All
three belong to the same "Demo Organization" and differ only in role, so you can see how
permissions change what the UI lets you do:

| Role   | Email                     | Password       |
| ------ | ------------------------- | -------------- |
| Owner  | `demo.owner@example.com`  | `DemoPass123!` |
| Editor | `demo.editor@example.com` | `DemoPass123!` |
| Viewer | `demo.viewer@example.com` | `DemoPass123!` |

Owners and editors can build workflows and trigger runs; viewers get read-only access.
Approval-gate decisions are restricted to owners/editors.

## Repo layout

- `nhost/` — the canonical backend: SQL migrations, Hasura metadata (tables, relationships,
  permissions, actions, cron/event triggers), and seed data. This directory is what Nhost
  Cloud's Git integration deploys automatically on push. See `nhost/README.md` for the
  Functions deployment model and the Cloud environment variables it requires.
- `functions/` — serverless function handlers: Action handlers, event trigger webhooks, and
  the cron dispatcher. `functions/_lib/executor.js` is the step-execution engine every run
  funnels through.
- `frontend/` — the Next.js app (builder, runs list, run detail, settings), deployed to Vercel.
- `scripts/apply-metadata.mjs` — dev-only tool that pushes `nhost/metadata` to a **local**
  Hasura instance (see "Why not the nhost/hasura CLI" below).
- `scripts/functions-dev-server.mjs` — dev-only HTTP server that mounts `functions/**` at the
  same routes Nhost Cloud serves them at.
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

npm run functions:dev                                    # functions/** on :3010
cd frontend && npm install && npm run dev                # Next.js on :3000
```

Hasura console: http://localhost:8080/console (admin secret: `localdevsecret`, see `.env.example`).

Auth has no local emulator, so the frontend always authenticates against Nhost Cloud even in
local dev — `frontend/.env.local` points at the Cloud project. Everything else (GraphQL,
Actions, event triggers) runs locally.

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

## Deployment

Both halves deploy on their own trigger — there is no combined deploy step.

**Backend (Nhost Cloud) — deploys on `git push` to `main`.** Nhost's Git integration applies
`nhost/migrations` and `nhost/metadata`, then builds and deploys `functions/**`. The Nhost
folder is set to `/` (repo root). Watch the Deployments panel in the Nhost dashboard: the
migrations/metadata step and the functions step report separately, and one can fail while the
other succeeds. Required Cloud environment variables are documented in `nhost/README.md` —
missing ones don't fail the deploy, they silently drop Actions from the GraphQL schema.

**Frontend (Vercel) — deploys from `frontend/`.**

```bash
cd frontend
vercel --prod
```

The Vercel project needs `NEXT_PUBLIC_NHOST_SUBDOMAIN` and `NEXT_PUBLIC_NHOST_REGION` set as
production environment variables (`vercel env add`); they point the browser client at the
Nhost project for Auth, GraphQL, and Actions.

Note that pushing to `main` **replaces** Hasura metadata wholesale rather than merging it, so
anything configured only through the Nhost dashboard or the Metadata API — including Nhost's
own defaults on tables in the `auth` schema — is reverted on the next push unless it is also
committed under `nhost/metadata/`.
