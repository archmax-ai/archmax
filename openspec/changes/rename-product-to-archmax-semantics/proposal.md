## Why

The semantic-layer product is being renamed from **archmax** to **archmax semantics**. `archmax` remains the company name and will carry sibling products — `pangea` for agentic automation already exists as a separate repo. Today the product name and the company name are the same string, so nothing in this repo distinguishes "the company" from "this product", and every new sibling product makes that ambiguity worse.

The sibling repo has already settled the convention: root package `archmax-pangea`, workspace scope kept at `@archmax/*`, env vars prefixed `PANGEA_*`, brand rendered lowercase, README titled `# archmax pangea`. This change applies the same split here so the two products are consistent.

## What Changes

**Naming convention** (mirrors `pangea`):

- Root package `archmax` → `archmax-semantics`. The `@archmax/*` workspace scope is **retained** as the company namespace — no import churn.
- Product brand rendered lowercase `archmax semantics`; README titled `# archmax semantics`.
- Env var `ARCHMAX_DATA_DIR` → `SEMANTICS_DATA_DIR`, with `ARCHMAX_DATA_DIR` honored as a deprecated fallback that logs a warning. Existing deployments keep running unchanged.

**External identifiers** (the moves themselves are performed by the maintainer; this change updates every reference):

- GitHub org renamed `archmaxai` → `archmax-ai`; repo `archmaxai/archmax` → `archmax-ai/semantics`.
- Container image `ghcr.io/archmaxai/archmax` → `ghcr.io/archmax-ai/semantics`. **BREAKING** for anyone pulling the old tag.
- Docs site `docs.archmax.ai` → `semantics.archmax.ai` (Astro `site`, `CNAME`, and all inbound links).

**Identifiers deliberately NOT renamed** — each persists state that a rename would orphan:

- MongoDB database name `archmax` (and `archmax-e2e` / `archmax-test`) — renaming strands every project and connection.
- Better Auth `cookiePrefix: "archmax"` — renaming logs every user out.
- Seeded admin email `admin@archmax.local` — the admin is looked up by this address; renaming it orphans the existing admin record.
- All `localStorage` keys (`archmax-theme`, `archmax:disclaimer-accepted`, panel widths, last-project, graph viewports, model tabs) — renaming discards user preferences and re-shows the disclaimer.
- Dockerfile system user `archmax` — it owns every file on the persistent `/data` volume. `useradd -r` assigns a dynamic UID, so a rename risks leaving an existing volume's files unreadable.
- Docker Compose named volume `archmax-data` — Compose addresses volumes by name, so renaming it silently creates a new empty volume and orphans the deployment's data.
- Docker Compose service name `archmax` — a renamed service makes a plain `docker compose up -d` create a second container while the old one keeps running as an orphan on the same port, so the new one fails to bind. Found by the upgrade rehearsal.

Keeping the user and the volume makes an upgrade a pure image-tag change: no ownership repair, no volume migration, and a rollback that needs nothing but the old tag.

**Cosmetic identifiers that DO get renamed**: git commit author, MCP server name, UI brand strings, the `archmax.example.com` placeholder domain, and all prose.

## Capabilities

### New Capabilities

None. This change renames an existing product; it introduces no new capability.

### Modified Capabilities

- `deployment`: `ARCHMAX_DATA_DIR` → `SEMANTICS_DATA_DIR` with deprecated fallback; image reference `ghcr.io/archmax-ai/semantics`; `archmax.example.com` placeholder → `semantics.example.com`; the retained `archmax` system user and `archmax-data` volume made explicit in the spec, plus an upgrade section stating that no data migration is required.
- `documentation-site`: site title, `site` URL and `CNAME` move to `semantics.archmax.ai`; GitHub links point at `archmax-ai/semantics`; brand prose renamed.
- `frontend-shell`: sidebar brand text, browser tab title, and login page title read `archmax semantics`.
- `mcp-server`: the server identifies itself as `"archmax-semantics"`; documentation examples use `mcpServers["archmax-semantics"]` as the configuration key.
- `project-git-versioning`: fixed commit author identity `archmax <archmax@localhost>` → `archmax semantics <semantics@localhost>`; project data directory paths use `SEMANTICS_DATA_DIR`.
- `data-connections`: data directory paths use `SEMANTICS_DATA_DIR`.
- `semantic-models`: semantic model file paths documented under `<SEMANTICS_DATA_DIR>`.
- `semantic-model-agent`: agent filesystem backend root and written model paths documented under `<SEMANTICS_DATA_DIR>`.
- `document-uploads`: upload storage path documented under `<SEMANTICS_DATA_DIR>`.
- `hono-api`: health check reports data directory writability for `SEMANTICS_DATA_DIR`; CORS/auth scenarios use the `semantics.example.com` placeholder.
- `test-infrastructure`: `docker-compose.ci.yml` provides a writable `SEMANTICS_DATA_DIR` via tmpfs.

This change builds on `remove-firebird-connection-type` (implemented, awaiting archive): the `Env-Gated Firebird Federation` and `Firebird Extension Configuration` requirements it removes are not touched here, so the two changes archive in either order without conflict.

`auth` is deliberately **not** listed: the admin is identified by `admin@archmax.local`, which is retained as stated above, so no requirement changes.

**Spec drift found while auditing** (corrected in the deltas, not a rename as such): `semantic-models` and `semantic-model-agent` document dataset graph positions as `vendor_name: "archmax"`, but the implementation writes `vendor_name: "COMMON"` (`POSITION_VENDOR` in `model-graph-view.tsx`, `COMMON_VENDOR` in `semantic-model-schema.ts`). The deltas correct the specs to `COMMON`. Renaming that string to `archmax semantics` would have documented a vendor name the code never writes and would have orphaned existing graph layouts.

## Impact

**Code** (~180 non-import references across ~90 files; the ~780 `@archmax/*` import references are untouched):

- `packages/core`: `config/env.ts` (Zod schema + fallback + `projectsDir`), `config/bootstrap.ts`, `infra/health.ts`, `services/git.ts` (author), `services/duckdb.ts` (comments).
- `apps/api`: `mcp/archmax-server.ts` / `archmax-route.ts` / `archmax-server.test.ts` **renamed to `semantics-*`** along with the `registerArchmaxTools` export and the `@archmax/api` subpath export `./mcp/archmax-server`; `scripts/migrate-view-query.ts`.
- `apps/frontend`: brand strings in `app-sidebar.tsx`, `login.tsx`, `disclaimer-dialog.tsx`, `index.html`; docs/GitHub hrefs in `$projectId/index.tsx`.
- `apps/worker`, `apps/e2e`: env var and brand assertions (`smoke.spec.ts` expects `h1` = brand, `mcp.spec.ts` expects `serverInfo.name`).

**Infrastructure**: `Dockerfile`, `entrypoint.sh`, `docker-compose.yml`, `docker-compose.ci.yml`, `.github/workflows/ci.yml`, `.env.example`, `CNAME`, `scripts/bundle.mjs`.

**Docs**: all 15 `apps/docs` guide/reference pages, `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `CLAUDE.md`, and the `context:` block in `openspec/config.yaml`.

**Out of scope / maintainer actions**: the GitHub org and repo rename, DNS for `semantics.archmax.ai`, the first `ghcr.io/archmax-ai/semantics` publish, and any logo asset redraw.
