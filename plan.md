# AI Agent Workflow Builder — Master Plan

nhost + Hasura + PostgreSQL + GraphQL | n8n-like AI agent workflow platform

## Infra decisions (locked in)

- **Nhost Cloud + GitHub deploy.** The `nhost` CLI has no native Windows build (WSL2-only, confirmed via
  `npm view @nhost/cli optionalDependencies` — only darwin/linux binaries exist). Instead: a free Nhost Cloud
  project connected to a GitHub repo, which auto-deploys `nhost/migrations`, `nhost/metadata`, and `functions/`
  on every push. Local iteration uses plain `docker-compose` (Postgres + Hasura images only — no CLI/WSL
  required) plus the native Windows Hasura CLI for `hasura migrate apply` / `hasura metadata apply`.
- **LLM provider: Groq.** Free tier, OpenAI-compatible API, fast. Needs an API key from console.groq.com.

## User actions required (I cannot do these — need your account/identity)

1. Create a free Nhost Cloud project at https://app.nhost.io (no credit card) — send me the subdomain/region.
2. Create an empty GitHub repo for this project and give me the URL (or tell me to `gh repo create`).
3. Connect that GitHub repo to the Nhost project (Settings → Git) once it exists, pointing at `/` (repo root).
4. Grab a free Groq API key from https://console.groq.com/keys.
5. Start Docker Desktop (needed for local Postgres+Hasura iteration).

I'll proceed building everything I can locally in the meantime and flag exactly when each of these becomes
blocking.

## Phase 1 — Foundations & Infra Wiring
- Scaffold repo: `nhost/` (migrations, metadata, seeds), `functions/` (serverless), `frontend/` (Next.js), `docs/`
- `docker-compose.yml` for local Postgres + Hasura (no nhost CLI)
- Hasura CLI `config.yaml`, `.env` templates, README with setup steps
- Get Docker Desktop running locally; verify `hasura console` connects

## Phase 2 — Data Model & Hasura Permission Layers
- SQL migrations for all core tables + enums (role, step type, trigger type, run/step status)
- Postgres view for org-level usage aggregation (calls used this month), exposed as a Hasura relationship/computed field
- Hasura metadata: table tracking + all relationships (org → members → workflows → steps/triggers, workflow → runs → step_runs)
- **Layer 1** permissions per table per role (owner/editor/viewer), every rule scoped through `org_members` on `X-Hasura-User-Id`
- **Layer 2** (DB-enforceable part): insert permission on `workflow_steps`/`workflow_triggers` restricting `db_write`/`notify`/`webhook` to owner role only
- Seed script: 2 orgs, users with owner/editor/viewer roles in each

## Phase 3 — Backend Logic: Actions, Triggers, Step Execution
- Action `triggerWorkflowRun(workflow_id)`: role + quota checks, creates `workflow_run`, executes steps in order (llm_call via Groq, http_request, db_write, conditional_branch, approval_gate pause), retry w/ backoff, live status updates
- Action `approveStep(step_run_id, decision)`: checks approver's org role in the handler (not just DB permissions), resumes execution
- Webhook trigger endpoint (token-authenticated, no user JWT) invoking the same run executor
- Scheduled trigger via Nhost cron function
- Database event trigger (Hasura Event Trigger) auto-starting a run on a watched row insert
- `notify` step implemented as a Hasura Event Trigger firing a stub Slack/email call (disclosed stub)

## Phase 4 — Frontend (Next.js + nhost)
- Auth (sign in/up) + org context/switcher
- Workflow builder: add/reorder/configure steps, attach trigger
- Run button (role-gated), live step-by-step status via subscription, pause/approve UI
- Usage/quota indicator
- Org member management (owner only)

## Phase 5 — End-to-End Scenario, Isolation Proof, Docs & Recording
- Deploy via GitHub push, set Groq key + secrets in Nhost Cloud
- Run the exact grading scenario live: 3+ step types incl. llm_call/http_request/conditional_branch, manual + webhook trigger, approval gate pause/approve, live subscription incl. paused state
- Cross-org isolation proof: Org B user cannot see/trigger/approve Org A's workflow even via direct ID guessing
- ~1 page write-up (schema reasoning, two-layer permission enforcement, approval-gate pause/resume mechanics)
- Short recording of the scenario
- Final export/cleanup of Hasura metadata & migrations
