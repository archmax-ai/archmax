# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

archmax semantics is a semantic layer between databases and AI agents: semantic models (OSI YAML) describe data with business context, and an MCP server exposes them so agents can query safely through read-only, sandboxed DuckDB VIEWs. Single-user, self-hosted system.

The `context:` block in `openspec/config.yaml` is the authoritative conventions document (architecture patterns, UI/UX rules, domain context). Consult it before non-trivial changes, especially frontend work — it contains detailed rules for toasts, tables, dialogs, filters, settings pages, and page layout that are enforced in review.

## Commands

pnpm + Turborepo monorepo. MongoDB and Redis must be running locally for dev.

```bash
pnpm install
pnpm dev                              # API :3000, frontend :5173, docs :4321, worker
pnpm typecheck                        # tsc --noEmit across all packages
pnpm lint                             # ESLint across all packages
npx vitest run                        # full test suite (prefer over `pnpm test`, which
                                      # can fail with "no test files" on empty packages)
pnpm vitest run --project api         # one workspace project: core | api | frontend | worker
pnpm vitest run path/to/file.test.ts  # single test file
pnpm test:coverage                    # coverage (text + HTML + JSON)
pnpm --filter @archmax/api build      # emitting build — run when touching apps/api;
                                      # catches emit errors that --noEmit misses
```

Before committing: `pnpm typecheck && pnpm lint` must both exit 0 (same checks as CI), plus the API build if `apps/api` changed.

Environment: the app loads `.env.local` (precedence) then `.env` from the repo root (`packages/core/src/config/bootstrap.ts`). Minimum: `BETTER_AUTH_SECRET` (32+ chars), `UI_USERNAME`/`UI_PASSWORD`, `MONGODB_URI`, `REDIS_URL`; `AGENT_API_KEY` only for AI agent features (dummy value is fine to start).

### E2E tests (Docker)

E2E tests run against the `docker-compose.ci.yml` stack. Two gotchas:

- The compose file defaults to the remote image. After `docker build -t semantics:local .`, you **must** pass `APP_IMAGE=semantics:local` and `--force-recreate app`, or tests silently run against stale code:
  ```bash
  APP_IMAGE=semantics:local docker compose -f docker-compose.ci.yml --env-file /dev/null up -d --force-recreate app
  ```
- If login tests start returning 429, rate-limit records have accumulated in MongoDB — `down` then `up -d` to reset.

## Architecture

```
apps/api        Hono 4 API server + MCP JSON-RPC endpoint (bearer token auth)
apps/frontend   Vite 6 + React 19 SPA — TanStack Router (file-based) + Query, Tailwind 4
apps/worker     BullMQ worker for background agent/test jobs (Redis)
apps/docs       Astro Starlight documentation site
apps/e2e        Playwright end-to-end tests
packages/core   @archmax/core — models, services, config, prompts (shared business logic)
packages/ui     @archmax/ui — Radix + CVA React components (shadcn-style)
openspec/       Specs and change proposals (OpenSpec)
```

**Data storage is split**: MongoDB (Mongoose 9) stores projects and connections; **semantic models are YAML files on disk** (`$SEMANTICS_DATA_DIR/projects/<projectId>/`, default `./data`), following the OSI spec with snake_case naming. All YAML I/O goes through `SemanticModelFileService` (`@archmax/core/services/semantic-model-files`), which does atomic writes. Each project also has a built-in Git repo that commits on publish.

**Query path**: each project gets a lazy in-process DuckDB instance (`@archmax/core/services/duckdb`); external databases (Postgres, MySQL, MSSQL, SQLite, Iceberg) are attached as named schemas via DuckDB extensions. Datasets define a `view_query` SELECT body that the platform wraps as a per-model DuckDB VIEW — agents' `execute_query` runs read-only SQL against those VIEWs only, never raw tables.

**MCP server** (`apps/api/src/mcp/`): JSON-RPC on Hono at `/mcp/<project-slug>/mcp`, bearer-token auth with model-level scopes. OSI YAML is never served raw — it's converted on the fly to compressed markdown digests (3–5× fewer tokens). Tools: `list_semantic_models`, `get_semantic_model`, `get_datasets`, `execute_query`, `request_improvement`. Tools are defined as a function returning a tool map `Record<string, { description, handler }>`.

**End-to-end typing**: the Hono app exports `AppType`; the frontend consumes it via `hc<AppType>`. All frontend HTTP calls MUST use the typed `api` client from `@/lib/api` — never raw `fetch()`. Wrap query/mutation logic in custom hooks (pattern: `@/lib/use-git.ts`) that combine the typed call, error handling, cache invalidation, and toast feedback.

### Key patterns

- **Errors**: `AppError` static factories (`badRequest`, `notFound`, …) in API/service code — never raw `throw new Error`
- **Validation**: Zod on all Hono route inputs (body, params, query); env config via `getEnv()` singleton (`@archmax/core/config/env`)
- **Mongoose**: hot-reload-safe exports (`mongoose.models.X || mongoose.model()`); shared `softDeletePlugin` adds `deleted`/`deletedAt` and auto-filters
- **Placement**: business logic → `@archmax/core/services`; UI components → `@archmax/ui`; route-specific logic stays in the owning app
- **Auth**: Better Auth session login for the admin UI; MCP bearer tokens are the only security boundary for agents

## Code style

- Strict TypeScript everywhere; ESM-only (`"type": "module"`) — mind file extensions in imports
- Functional React components only; CVA for variants; `cn()` for class composition
- Only `toast.success()` / `toast.error()`; success messages are short past-tense "{Entity} {action}" (no "successfully")
- No comments that narrate what code does

## Testing

Vitest 4 workspace (`vitest.config.ts`) with four projects: `core`, `api`, `frontend`, `worker`. Tests are colocated (`my-service.ts` → `my-service.test.ts`); integration tests use `.integration.test.ts`. API integration tests use Hono's `app.request()` via `apps/api/src/test-utils/api-client.ts`; shared factories and mocks live in `packages/core/src/test-utils/`. Frontend tests use React Testing Library against user-visible behaviour.

## OpenSpec workflow

Development is spec-driven. **Every PR that adds or changes user-facing behaviour must include an OpenSpec change proposal** (`openspec/changes/<change-id>/`) with spec deltas; bug fixes, typos, and non-breaking dependency updates are exempt. When a change is user-facing, its `tasks.md` must include a docs update task for `apps/docs`.

Slash commands: `/opsx:propose` (scaffold + validate a proposal — no code at this stage), `/opsx:apply` (implement an approved change), `/opsx:archive` (archive after deployment), plus `/opsx:explore` (think a change through first) and `/opsx:sync` (fold delta specs into main specs without archiving). CLI: `openspec list`, `openspec show <id>`, `openspec validate <id> --strict`, `openspec archive <id> --yes`. Conventions live in the OpenSpec skills under `.claude/skills/openspec-*/`.
