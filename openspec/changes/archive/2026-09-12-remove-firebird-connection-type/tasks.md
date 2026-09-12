## 1. Core config

- [x] 1.1 Remove `DUCKDB_ENABLE_CUSTOM_FIREBIRD` from the `envSchema` in `packages/core/src/config/env.ts`, along with the `FIREBIRD_EXTENSION_REPOSITORY` constant and the exported `customFirebirdEnabled()` and `firebirdExtensionRepository()` helpers; verify `pnpm typecheck` surfaces every remaining importer (expected: `duckdb.ts`, `app.ts`, `connections.ts`).
- [x] 1.2 Delete the `customFirebirdEnabled`/`firebirdExtensionRepository` cases from `packages/core/src/config/env.test.ts` (including the `delete process.env.DUCKDB_ENABLE_CUSTOM_FIREBIRD` reset) and verify `pnpm vitest run --project core packages/core/src/config/env.test.ts` passes.

## 2. DuckDB service

- [x] 2.1 Simplify `createDuckDBInstance` in `packages/core/src/services/duckdb.ts` to an unconditional `DuckDBInstance.create()` and rewrite its doc comment so it no longer references unsigned extensions or Firebird; verify no `allow_unsigned_extensions` reference remains in the file.
- [x] 2.2 Remove the `firebird` cases from `extensionForType` and the ATTACH-type mapping, delete `buildFirebirdAttachOptions` and its `extraOptions` call sites (both the attach path and `testSingleConnection`), and delete the `SET custom_extension_repository` / `INSTALL firebird` / `LOAD firebird` branch in the extension loader; verify `grep -ri firebird packages/core/src/services/duckdb.ts` returns nothing.
- [x] 2.3 Delete `isConnectionSkipped`, its three call sites (`setupProjectInstance`'s skip-and-warn, `isReady`, and the `needsNewExtension` probe), and the explanatory comments, per design.md — "Delete `isConnectionSkipped` entirely"; verify every remaining connection is attached unconditionally and `pnpm typecheck` is clean.
- [x] 2.4 Remove the `firebird` case from `extensionTypeLabel` in `packages/core/src/services/duckdb-console.ts`, leaving `PREINSTALLED_EXTENSIONS` untouched; verify `pnpm vitest run --project core packages/core/src/services/duckdb-console.test.ts` passes.
- [x] 2.5 Delete the `buildAttachString — firebird`, `buildFirebirdAttachOptions`, and `getProjectInstance — skipped firebird connection` describe blocks plus the `customFirebirdEnabled`/`firebirdExtensionRepository` entries in the `env` mock at the top of `packages/core/src/services/duckdb.test.ts`; verify `pnpm vitest run --project core packages/core/src/services/duckdb.ts` passes with no unused-mock errors.

## 3. Connection model

- [x] 3.1 Remove `"firebird"` from the `type` enum and the `charset` field from both the TypeScript interface and the Mongoose schema in `packages/core/src/models/Connection.ts`; verify `pnpm typecheck` is clean.
- [x] 3.2 Add a test covering the delta spec's "Firebird type accepted only when active" (now a rejection) and "Charset config field rejected" scenarios alongside the existing connection-model validation tests (not in a Firebird-named file, per design.md), asserting a 400 for `type: "firebird"` and for `connectionConfig.charset`; verify the new cases pass.

## 4. API

- [x] 4.1 Remove `charset` from the `connectionConfig` Zod schema in `apps/api/src/routes/connections.ts` and delete all three `customFirebirdEnabled()` gates (create, update, test) plus the now-unused `customFirebirdEnabled` import; verify no `AppError.badRequest("Firebird…")` string remains in the file.
- [x] 4.2 Remove `firebirdEnabled` from the `GET /api/config` handler in `apps/api/src/app.ts` and its `customFirebirdEnabled` import, leaving `agentConfigured` intact; verify the response shape matches the `deployment` delta's "No Firebird capability flag" scenario.
- [x] 4.3 Delete `apps/api/src/routes/connections-firebird.integration.test.ts` and verify `pnpm vitest run --project api` passes.
- [x] 4.4 Run `pnpm --filter @archmax/api build` and verify it exits 0 (required by CLAUDE.md whenever `apps/api` changes).

## 5. Frontend

- [x] 5.1 In `apps/frontend/src/routes/_auth/$projectId/connections/index.tsx`, drop the `firebirdEnabled` lookup and the conditional `[...CONNECTION_TYPES, "firebird"]` so the dropdown renders `CONNECTION_TYPES` directly, and remove the now-unused `useAppConfig` import and call; verify the type dropdown no longer depends on server config.
- [x] 5.2 Remove the `firebird` entries from the URI-placeholder and default-port maps, the `charset` state and its `initialEditing` hydration, the `config.charset` assignment in submit, the `isFirebird` constant, and every `isFirebird` branch (Database placeholder/font, the host-machine hint, and the Charset form field); verify `grep -i firebird` and `grep -i charset` on the file return nothing.
- [x] 5.3 Remove `charset` from the connection-config type declaration at the top of the same file; verify `pnpm typecheck` is clean.

## 6. Docs and environment

- [x] 6.1 Remove the `DUCKDB_ENABLE_CUSTOM_FIREBIRD` block and its security note from `.env.example`; verify no Firebird or unsigned-extension text remains.
- [x] 6.2 Remove the Firebird row from the connection-type table, the "Firebird Connections" section, and the unsigned-extension security callout in `apps/docs/src/content/docs/guides/data-federation.mdx`; verify the remaining table lists only supported types.
- [x] 6.3 Remove the `DUCKDB_ENABLE_CUSTOM_FIREBIRD` row from the environment-variable table and the Firebird security warning in `apps/docs/src/content/docs/reference/docker.mdx`, and add a short note that operators upgrading from a build that set the variable should delete it and remove any stored `firebird` connection with `db.connections.deleteMany({ type: "firebird" })` (per design.md — Migration Plan); verify the docs build passes.

## 7. Verification

- [x] 7.1 Run a repo-wide case-insensitive sweep for `firebird`, `allow_unsigned_extensions`, and `custom_extension_repository`, excluding `node_modules`, `.git`, `apps/e2e/playwright-report`, and `openspec/changes/archive/`; verify the only remaining hits are this change's own artifacts under `openspec/changes/remove-firebird-connection-type/`.
- [x] 7.2 Confirm the OSI `custom_extensions` semantic-model field is untouched: verify `packages/core/prompts/semantic-model-agent.md` and `packages/core/src/services/semantic-model-files.ts` are unmodified in the diff.
- [x] 7.3 Run `pnpm typecheck && pnpm lint` and verify both exit 0.
- [x] 7.4 Run `npx vitest run` and verify the full suite passes.
- [x] 7.5 Run `openspec validate remove-firebird-connection-type --strict` and verify it passes.
