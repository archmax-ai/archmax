# Harden DuckDB Federation Console Query Validation

## Why

The federation console (`POST /api/projects/:projectId/duckdb-console/query`) validates SQL with a **keyword lexer** (`validateConsoleQuerySql`: check the first keyword against an allow/deny list) rather than the structural AST validator (`validateSqlAst`) that gates every other query surface (MCP `execute_query`, the agent tools). It also connects a raw DuckDB connection **without `hardenConnection`**.

Because the keyword gate only inspects the leading statement type, a permitted `SELECT` can reference things the AST validator forbids everywhere else:

- **Local file readers** — `read_text('/etc/passwd')`, `read_blob(...)`, `read_csv(...)`. On a project that has an **iceberg** connection, `setupProjectInstance` leaves `enable_external_access` **on instance-wide** (iceberg/httpfs need it), so these succeed and return arbitrary server files.
- **Secret exfiltration** — `SELECT * FROM duckdb_secrets()` exposes the decrypted credentials of *every* attached upstream connection.
- **Host catalog metadata** — other `duckdb_*` metadata views/functions that leak instance-wide state.

This is a privilege-escalation surface: a caller who can reach the console (admin-session-authed today, but the trust boundary should not depend on that) can read the server filesystem and other connections' secrets through an ostensibly read-only console. The connection also runs without the resource limits (`threads`, `memory_limit`) every other query path applies.

## What Changes

- **Route console queries through the structural AST validator** using a new, dedicated `console` validation mode that is permissive about *federation* (fully-qualified `catalog.schema.table` references, `information_schema` exploration, `SHOW`/`DESCRIBE`/`EXPLAIN`) but rejects, at every AST depth: external file readers (`read_*`, `pg_read_*`, `pg_ls_dir`, …), `duckdb_*` metadata/`duckdb_secrets` (table and function forms), internal `_scope_*` schemas, sequence side-effects (`nextval`/`currval`), and `parse_sql`/`json_serialize_sql`. Non-read statement shapes remain rejected.
- **Apply connection hardening** (`hardenConnection` resource limits — `threads`, `memory_limit`) to the console connection, matching the MCP/agent code paths. External access is **not** force-disabled on the connection because iceberg projects legitimately need it instance-wide; the AST validator is the file-reader/secret guard.
- **Keep the existing cheap keyword allow/deny gate** as a first-pass, defence-in-depth check (fast rejection, preserves the current `SELECT`/`WITH`/`SHOW`/`DESCRIBE`/`EXPLAIN` dispatch). The AST validator becomes the authoritative guard.
- **Preserve all currently-legitimate console behaviour**: valid federation `SELECT`/`WITH` over `slug.schema.table`, `SHOW`/`DESCRIBE`/`EXPLAIN`, single-statement enforcement, query timeout + interrupt, and credential redaction in errors.

This is a **security-tightening** change: some queries that the console accepts today (file readers, `duckdb_secrets()`, `duckdb_*` metadata) will now be rejected with a 400. That is the intended outcome.

## Impact

- Affected spec: `duckdb-console` (MODIFIED: *DuckDB Console Query API*).
- Affected code: `packages/core/src/services/sql-ast-validation.ts` (new `console` mode), `packages/core/src/services/duckdb-console.ts` (`executeDuckdbConsoleQuery` / `collectQueryRows` — add AST validation + `hardenConnection`).
- Affected docs: `apps/docs/src/content/docs/guides/data-federation.mdx` (document that the console blocks file readers, secrets, and DuckDB metadata).
- User-visible: previously-accepted dangerous queries now return a 400 with a clear "not allowed" message; all legitimate federation queries continue to work.
