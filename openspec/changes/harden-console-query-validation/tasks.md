# Tasks — Harden Console Query Validation

## 1. Add the `console` validation mode
- [ ] 1.1 Extend `SqlAstValidationMode` in `packages/core/src/services/sql-ast-validation.ts` with `"console"`.
- [ ] 1.2 In `walk`, apply the same BASE_TABLE rules as `agent` mode for `console` (universal denies only — allow `catalog.schema.table` and `information_schema`; no MCP catalog/schema restriction).
- [ ] 1.3 Relax the `SHOW_REF` gate for `console` mode to permit read-only `SHOW` variants (`databases`, `tables`, `columns`, `all`) in addition to `describe`/`summarize`, while still walking the wrapped query so denied functions/tables inside it are caught.
- [ ] 1.4 Confirm the universal denies (file readers, `duckdb_*`/`duckdb_secrets`, `_scope_*`, `nextval`/`currval`, `parse_sql`/`json_serialize_sql`) apply in `console` mode.

## 2. Wire validation + hardening into the console executor
- [ ] 2.1 In `packages/core/src/services/duckdb-console.ts`, call `validateSqlAst(sql, { mode: "console" })` inside `executeDuckdbConsoleQuery` after the existing `validateConsoleQuerySql` keyword gate; throw `AppError.badRequest(message)` (or the service's existing error type) on a non-null rejection, before connecting.
- [ ] 2.2 In `collectQueryRows`, call `hardenConnection(db)` (resource limits only — no `searchPath`, no forced `enable_external_access`) before running the query.
- [ ] 2.3 Ensure error redaction (`redactConnectionSecrets`) and the timeout/interrupt path are unchanged.

## 3. Tests
- [ ] 3.1 Unit tests for `validateSqlAst(..., { mode: "console" })`: allow `SELECT 1`, `SELECT * FROM slug.schema.table`, `SELECT * FROM information_schema.tables`, `SHOW DATABASES`, `SHOW TABLES`, `DESCRIBE ...`, `EXPLAIN SELECT ...`; reject `read_text('/etc/passwd')`, `read_csv(...)`, `read_blob(...)`, `duckdb_secrets()`, `duckdb_settings()`, bare `duckdb_columns`, `_scope_*` refs, `nextval(...)`, `EXPLAIN ANALYZE ...`, and multi-statement input.
- [ ] 3.2 Verify against the pinned DuckDB version that each advertised `SHOW`/`DESCRIBE`/`EXPLAIN` form serializes/validates; if a `SHOW` variant does not serialize via `json_serialize_sql`, implement the documented keyword fallback (design.md) and cover it with a test.
- [ ] 3.3 Service/integration test for `executeDuckdbConsoleQuery`: a blocked query surfaces a 400-equivalent rejection and never opens a query connection; a legitimate query still returns rows.

## 4. Docs
- [ ] 4.1 Update `apps/docs/src/content/docs/guides/data-federation.mdx` (Federation Console section) to state that the console blocks external file readers, `duckdb_secrets()`, and DuckDB metadata, while continuing to allow federation `SELECT`/`WITH`/`SHOW`/`DESCRIBE`/`EXPLAIN`.

## 5. Validation
- [ ] 5.1 `pnpm typecheck && npx vitest run` pass.
- [ ] 5.2 `pnpm --filter @archmax/api build` passes.
- [ ] 5.3 `openspec validate harden-console-query-validation --strict` passes.
