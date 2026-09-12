# Design — Harden Console Query Validation

## Context

`validateSqlAst(sql, { mode })` (in `sql-ast-validation.ts`) parses SQL with DuckDB's own parser (`json_serialize_sql`, parse-only, no binder, `enable_external_access=false`) and walks the AST applying allowlists/denylists at every depth. It has three modes today:

- `mcp` — strictest: bare table names only (no `catalog`/`schema` qualifier), no system catalogs.
- `agent` — permissive: allows `catalog.schema.table` and `information_schema` exploration; still applies the table-function allowlist and scalar-function denylist.
- `view_query` — for persisted view bodies: allows `catalog.schema.table`, denies system catalogs.

All three share the **universal denies**: `_scope_*` and `duckdb_*` base tables (`checkBaseTableUniversalDeny`), the `ALLOWED_TABLE_FUNCTIONS` allowlist (rejects `read_csv`, `read_parquet`, `read_blob`, `read_text`, `duckdb_*`, `glob`, `pg_*`, …), and `isForbiddenScalarFunction` (rejects `read_*`, `pg_read_*`, `pg_ls_dir`, `duckdb_*`, `nextval`, `currval`, `parse_sql`, `json_serialize_sql`). Those universal denies are exactly the guard the console is missing.

The console differs from the agent surface in one way that matters: it legitimately runs **`SHOW`** statements (`SHOW DATABASES`, `SHOW TABLES`) as well as `DESCRIBE`/`EXPLAIN`. The agent/mcp modes only accept `SHOW_REF` nodes whose `show_type` is `describe`/`summarize`; a bare `SHOW DATABASES` is rejected.

## Decision

Add a fourth mode, `console`, whose base-table rules match `agent` (allow `catalog.schema.table` and `information_schema`; no MCP catalog/schema restriction) and which **relaxes the `SHOW_REF` gate to permit the read-only `SHOW` variants** (`databases`, `tables`, `columns`, `all`, plus `describe`/`summarize`) while keeping every universal deny (file readers, `duckdb_*`, `_scope_*`, forbidden scalar functions) intact.

Statement dispatch stays layered:

1. **Keyword pre-gate** (`validateConsoleQuerySql`, unchanged): fast rejection of empty SQL, multi-statement batches, and any leading keyword outside `SELECT`/`WITH`/`SHOW`/`DESCRIBE`/`EXPLAIN`. Cheap, and preserves the existing dispatch contract.
2. **Structural AST gate** (new): `validateSqlAst(sql, { mode: "console" })`. Authoritative guard against file readers, `duckdb_secrets()`/`duckdb_*`, `_scope_*`, and non-read shapes that survive the keyword check.

If `validateSqlAst` returns a rejection string, `executeDuckdbConsoleQuery` throws `AppError.badRequest(message)` before touching DuckDB (parity with how MCP surfaces validator rejections).

### `SHOW` parsing caveat

`json_serialize_sql` "only accepts SELECT statements". `EXPLAIN` is already peeled off before parsing (`peelExplain`); `DESCRIBE`/`SUMMARIZE` parse as a `SHOW_REF` wrapped in a synthesized `SELECT_NODE`. Bare `SHOW DATABASES`/`SHOW TABLES` in DuckDB also lower to a `SHOW_REF`-backed select, so they serialize and are handled by the walker's `SHOW_REF` branch. The implementation MUST verify this against the pinned DuckDB version with a test for each `SHOW` variant the console advertises; if any variant fails to serialize, the `console` mode MUST fall back to accepting that specific `SHOW` statement via the keyword gate **without** bypassing the structural checks on its wrapped body. Preserving `SHOW`/`DESCRIBE`/`EXPLAIN` support is a hard requirement — this change must not regress legitimate console use.

## Connection hardening

`collectQueryRows` (the console query executor) currently does `instance.connect()` with no hardening. It SHALL call `hardenConnection(db)` (resource limits: `SET threads = 2`, `SET memory_limit = '512MB'`) — matching the MCP/agent paths.

It SHALL **not** pass a `searchPath` (the console addresses catalogs by raw slug, not scoped views) and SHALL **not** force `enable_external_access=false`: on iceberg projects that flag must stay on instance-wide for iceberg/httpfs, and toggling it per-connection is both ineffective (it is instance-scoped in DuckDB) and would break iceberg reads. The AST validator — not connection state — is the guarantee that file readers cannot be invoked. On non-iceberg projects `enable_external_access` is already off instance-wide from `setupProjectInstance`, so this is defence-in-depth there.

## Alternatives considered

- **Connection hardening alone (disable external access on the console connection).** Rejected: `enable_external_access` is instance-wide in DuckDB, so a per-connection toggle does not reliably help and would break iceberg. It also would not block `duckdb_secrets()`/`duckdb_*` metadata, which do not require external access.
- **Reuse `agent` mode as-is.** Rejected: it rejects `SHOW DATABASES`/`SHOW TABLES`, which the console legitimately supports — a behaviour regression.
- **Extend the keyword lexer to blocklist `duckdb_`/`read_` substrings.** Rejected: the whole reason the AST validator exists is that regex/keyword lexers are fooled by quoting, comments, and casing variants; a substring blocklist is exactly the bypass-prone approach we are replacing.
