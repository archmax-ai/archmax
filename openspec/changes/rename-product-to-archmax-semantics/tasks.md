## 1. Core config — the data directory variable

- [x] 1.1 In `packages/core/src/config/bootstrap.ts`, resolve `SEMANTICS_DATA_DIR` as the canonical variable: when it is unset and `ARCHMAX_DATA_DIR` is set, copy the value across and emit one deprecation warning naming the replacement; when both are set, prefer `SEMANTICS_DATA_DIR` and still warn. Keep the existing relative-path resolution. Verify with a new unit test covering all four cases (new only / old only / both / neither).
- [x] 1.2 Rename the field in `packages/core/src/config/env.ts` to `SEMANTICS_DATA_DIR` and update `projectsDir`; change the `APP_BASE_URL` description placeholder to `https://semantics.example.com`. Verify `pnpm vitest run --project core` passes.
- [x] 1.3 Update `packages/core/src/infra/health.ts` to read `SEMANTICS_DATA_DIR`, and update `health.test.ts` fixtures. Verify the health tests pass.
- [x] 1.4 Update `packages/core/src/config/env.test.ts` to use `https://semantics.example.com`. Verify the tests pass.
- [x] 1.5 Change the fixed git author in `packages/core/src/services/git.ts` to `archmax semantics <semantics@localhost>` and update `git.test.ts` assertions. Verify the git service tests pass.
- [x] 1.6 Update `SEMANTICS_DATA_DIR` references in `packages/core/src/services/duckdb.ts` comments and rename the temp-dir prefixes in `duckdb.test.ts` / `agent.test.ts` to `semantics-`. Verify `pnpm vitest run --project core` passes.

## 2. API — MCP module rename and remaining references

- [x] 2.1 Rename `apps/api/src/mcp/archmax-server.ts` → `semantics-server.ts`, `archmax-route.ts` → `semantics-route.ts`, `archmax-server.test.ts` → `semantics-server.test.ts` using `git mv` so history follows. Verify the files exist at their new paths.
- [x] 2.2 Rename the exported `registerArchmaxTools` to `registerSemanticsTools` and update its importers (`semantics-route.ts`, `semantics-server.test.ts`). Verify `pnpm typecheck` passes.
- [x] 2.3 Update the `@archmax/api` subpath export in `apps/api/package.json` from `./mcp/archmax-server` to `./mcp/semantics-server`, and the `archmaxMcp` identifier in `apps/api/src/app.ts`. Verify `pnpm --filter @archmax/api build` exits 0.
- [x] 2.4 Change the MCP server name in `semantics-route.ts` from `"archmax"` to `"archmax-semantics"` and the build temp-dir prefix to `semantics-test-build-`. Verify the MCP server unit tests pass.
- [x] 2.5 Update `apps/api/src/scripts/migrate-view-query.ts` to read `SEMANTICS_DATA_DIR` (its doc comment and the `baseDir` resolution), and the temp prefix in its test. Verify `pnpm vitest run --project api` passes.
- [x] 2.6 Replace `archmax.example.com` with `semantics.example.com` in `apps/api/src/middleware/csrf.test.ts` and update the `ARCHMAX_DATA_DIR` mock in `routes/semantic-models.integration.test.ts`. Verify `pnpm vitest run --project api` passes.
- [x] 2.7 Update the expected git author in `apps/api/src/routes/git.test.ts` to `archmax semantics <semantics@localhost>`. Verify the test passes.
- [x] 2.8 Leave `cookiePrefix: "archmax"` in `apps/api/src/lib/auth.ts` and `ADMIN_EMAIL = "admin@archmax.local"` in `lib/seed-admin.ts` unchanged (design D3); add a short comment at each site stating the value is retained deliberately to preserve sessions and the existing admin record. Verify no behavioural test changes are needed.

## 3. Frontend and worker

- [x] 3.1 Change the brand text to `archmax semantics` in `apps/frontend/src/components/layout/app-sidebar.tsx`, `routes/login.tsx`, `components/disclaimer-dialog.tsx`, and the `<title>` in `apps/frontend/index.html`. Verify the frontend tests pass and the rendered sidebar/login show `archmax semantics`.
- [x] 3.2 Update the documentation and GitHub hrefs in `apps/frontend/src/routes/_auth/$projectId/index.tsx` to `https://semantics.archmax.ai` and `https://github.com/archmax-ai/semantics`. Verify by loading the project home and following both links.
- [x] 3.3 Leave every `localStorage` key unchanged (design D3) — `archmax-theme`, `archmax:disclaimer-accepted`, `archmax-last-project`, `archmax-sidebar-collapsed`, the panel-width keys, `archmax:graph-viewport:`, `archmax:model-tab:`, `archmax:dataset-panel-width`, `archmax-playground-agent-`. Add a comment at the theme and disclaimer keys noting they are retained to preserve user preferences. Verify a pre-existing theme choice and dismissed disclaimer survive the upgrade.
- [x] 3.4 Update `SEMANTICS_DATA_DIR` and brand references in `apps/worker/src`. Verify `pnpm vitest run --project worker` passes.

## 4. Infrastructure

- [x] 4.1 In the `Dockerfile`, change only `ENV HOME=/data ARCHMAX_DATA_DIR=/data` to `SEMANTICS_DATA_DIR`. Leave the `archmax` system user and every `chown archmax:archmax` untouched (design D4). Verify `docker build -t semantics:local .` succeeds and `docker run --rm semantics:local id archmax` still resolves the user.
- [x] 4.2 In `entrypoint.sh`, switch the data-directory variable to `SEMANTICS_DATA_DIR` while still honouring an inherited `ARCHMAX_DATA_DIR`. Leave the `chown archmax:archmax` calls, the `gosu archmax` privilege drop, and the embedded `MONGODB_URI` database name as they are — no ownership-repair step is needed because the user is unchanged. Verify by starting the new image against a volume seeded by the previous image and confirming existing projects load and are writable.
- [x] 4.3 Update `docker-compose.yml`: image `ghcr.io/archmax-ai/semantics:latest` only. Leave the service name `archmax`, the named volume `archmax-data` and the `MONGODB_URI` database name unchanged (design D4) — add a comment at the volume noting it is retained so existing deployments keep their data. Verify `docker compose config` resolves, the stack starts, and `docker volume ls` shows the pre-existing volume reattached rather than a new one created.
- [x] 4.4 Update `docker-compose.ci.yml`: default `APP_IMAGE` to `ghcr.io/archmax-ai/semantics:latest`, rename the tmpfs data-dir variable to `SEMANTICS_DATA_DIR`, leave the `archmax-e2e` database name. Verify the E2E stack starts with `APP_IMAGE=semantics:local`.
- [x] 4.5 Update `.env.example` (`SEMANTICS_DATA_DIR` with a note that `ARCHMAX_DATA_DIR` is deprecated, `semantics.example.com` placeholder) and leave the commented `MONGODB_URI` database name as `archmax`. Verify a fresh checkout starts with the documented variables.
- [x] 4.6 Set `CNAME` to `semantics.archmax.ai` and update `.github/workflows/` references (including the `archmax-test` database name only if CI-local). Verify the docs workflow builds.
- [x] 4.7 Rename the root `package.json` name to `archmax-semantics`. Confirm `scripts/bundle.mjs` still filters on the `@archmax/` prefix (unchanged) and verify `pnpm install && pnpm typecheck` passes.

## 5. Documentation

- [x] 5.1 Update `apps/docs/astro.config.mjs`: `site: "https://semantics.archmax.ai"`, `title: "archmax semantics"`, GitHub and editLink URLs to `archmax-ai/semantics`. Verify `pnpm --filter @archmax/docs build` succeeds and canonical URLs use the new domain.
- [x] 5.2 Extend `apps/docs/src/components/SiteTitle.astro` to render the existing archmax wordmark followed by the text `semantics` and then the version badge, keeping `logo-light.svg` / `logo-dark.svg` unchanged. Verify the docs header reads "archmax semantics" visually and via the accessibility tree, in both themes.
- [x] 5.3 Rewrite product references across the 16 docs content pages — heaviest in `guides/self-hosting.mdx` (38), `reference/docker.mdx` (38), `guides/data-federation.mdx` (13), `getting-started/installation.mdx` (12), `contributing/development.mdx` (12). Cover the image name, `SEMANTICS_DATA_DIR`, the `mcpServers["archmax-semantics"]` key, and prose. Verify no `archmax` remains except the company name and `@archmax/*` package names.
- [x] 5.4 Add the "Upgrading from archmax" section to `reference/docker.mdx` covering the new image name, the deprecated `ARCHMAX_DATA_DIR`, and the statement that the MongoDB database name is unchanged so no data migration is needed. Verify the section renders and matches the deployment spec's scenario.
- [x] 5.5 Update the `archmax_website` comment in `apps/docs/src/styles/custom.css` to name the company site without implying it is this product. Verify the docs build is unaffected.
- [x] 5.6 Update `README.md` (title `# archmax semantics`, docs and repo links, prose), `CONTRIBUTING.md`, `AGENTS.md`, and `CLAUDE.md`. Verify links resolve and no stale repo URL remains.
- [x] 5.7 Update the `context:` block in `openspec/config.yaml` to describe archmax semantics as the product and archmax as the company. Verify `openspec validate --strict` still passes for in-flight changes.

## 6. Verification

- [x] 6.1 Run `pnpm typecheck && pnpm lint && pnpm --filter @archmax/api build && npx vitest run` and confirm all four exit 0.
- [x] 6.2 Audit every surviving occurrence: run a repo-wide search for `archmax` (excluding `node_modules`, `.git`, `dist`, `coverage`, and `openspec/changes/archive`) and confirm each hit is one of — an `@archmax/*` package name, a retained state key (`cookiePrefix`, `admin@archmax.local`, the Mongo database names, `localStorage` keys), a retained deployment identifier (the Dockerfile/entrypoint `archmax` user, the `archmax-data` volume), the company name in prose, or the `archmax-ai` GitHub org. Record the count so review can check it.
- [x] 6.3 Confirm no occurrence of `ARCHMAX_DATA_DIR` remains outside the deprecation fallback in `bootstrap.ts` and its tests.
- [x] 6.4 Build `semantics:local`, start the E2E stack with `APP_IMAGE=semantics:local docker compose -f docker-compose.ci.yml --env-file /dev/null up -d --force-recreate app`, and run the Playwright suite. Verify the smoke test's `h1` assertion expects `archmax semantics`, the MCP `serverInfo.name` assertion expects `archmax-semantics`, and both pass.
- [x] 6.5 Upgrade rehearsal: start the previous archmax-named image against a fresh volume, create a project and a connection, sign in, then restart the same volume with `semantics:local` while still passing `ARCHMAX_DATA_DIR`. Verify the deprecation warning appears, the project and connection are intact, the session is still valid, and the data directory is writable with no ownership repair. Then roll back to the previous tag on the same volume and confirm it still starts cleanly.
- [x] 6.6 Compose upgrade rehearsal: bring up the previous release with `docker compose up -d`, create a project, then switch the image to `ghcr.io/archmax-ai/semantics` and `docker compose up -d` again. Verify the existing `archmax-data` volume is reattached, `docker volume ls` shows no new volume, and the project is still present.
