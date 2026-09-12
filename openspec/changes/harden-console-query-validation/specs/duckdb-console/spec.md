# duckdb-console (delta)

## MODIFIED Requirements

### Requirement: DuckDB Console Query API

The API SHALL expose an authenticated `POST /api/projects/:projectId/duckdb-console/query` endpoint that executes a single read-oriented SQL statement against the project's federated DuckDB instance (all active connections attached, same instance as the data browser).

The request body SHALL be `{ sql: string }`. The server SHALL reject empty SQL, multi-statement batches, and statements whose first keyword is not in the allowlist: `SELECT`, `WITH`, `SHOW`, `DESCRIBE`, `EXPLAIN`. The server SHALL reject statements whose first keyword is in a denylist including `INSERT`, `UPDATE`, `DELETE`, `COPY`, `ATTACH`, `DETACH`, `CREATE`, `DROP`, `INSTALL`, and `LOAD`.

In addition to the leading-keyword check, the server SHALL validate every submitted statement with the structural AST validator (`validateSqlAst`) using a dedicated `console` mode, and SHALL reject the query with 400 before it reaches DuckDB when validation fails. The `console` mode SHALL:

- Permit federation references — fully-qualified `catalog.schema.table` (raw connection slugs), `information_schema` exploration, and the read-only `SHOW` / `DESCRIBE` / `EXPLAIN` forms the keyword allowlist advertises.
- Reject, at every AST depth regardless of quoting/casing/comments: external file and directory readers (`read_csv`, `read_parquet`, `read_json`, `read_blob`, `read_text`, `read_*`, `pg_read_*`, `pg_ls_dir`, `glob`); DuckDB metadata in table or function form, including `duckdb_secrets` and any `duckdb_*` name; internal `_scope_*` schemas; sequence side-effects (`nextval`, `currval`); and `parse_sql` / `json_serialize_sql`.
- Reject `EXPLAIN ANALYZE` (including comment-evasion variants) and any non-read statement shape that survives the keyword check.

Legitimate console behaviour SHALL be preserved: valid federation `SELECT`/`WITH` over `slug.schema.table`, and `SHOW`/`DESCRIBE`/`EXPLAIN` statements, SHALL continue to execute.

Queries SHALL run with `readOnly: true` on the project instance (attached upstream catalogs remain `READ_ONLY`). The console connection SHALL apply `hardenConnection` resource limits (`SET threads`, `SET memory_limit`) before executing the query, matching the MCP and agent query paths. The console connection SHALL NOT set a `search_path` (the console addresses catalogs by raw slug) and SHALL NOT force `enable_external_access = false` per-connection (that flag is instance-scoped and must remain enabled for iceberg projects); the AST validator is the guard that prevents file-reader and secret access. Queries SHALL be subject to `QUERY_TIMEOUT_MS` with cancellation via `connection.interrupt()`. Error messages returned to the client SHALL have upstream credentials redacted.

The response body SHALL include `columns` (string array), `rows` (array of objects), `rowCount` (number), and `durationMs` (number). Bigint result values SHALL be JSON-serialized as numbers.

#### Scenario: Successful federation query

- **WHEN** an authenticated POST submits `SELECT 1 AS n`
- **THEN** the response status is 200
- **AND** `rows` contains `{ n: 1 }`
- **AND** `rowCount` is 1

#### Scenario: Fully-qualified federation reference is allowed

- **WHEN** an authenticated POST submits `SELECT * FROM shopify.public.orders LIMIT 5` against a project with a `shopify` connection
- **THEN** the query is not rejected by validation
- **AND** it executes against the attached catalog

#### Scenario: SHOW and DESCRIBE remain supported

- **WHEN** an authenticated POST submits `SHOW DATABASES` (or `DESCRIBE shopify.public.orders`)
- **THEN** the query is not rejected by validation
- **AND** the response status is 200

#### Scenario: Reject local file reader

- **WHEN** an authenticated POST submits `SELECT * FROM read_text('/etc/passwd')`
- **THEN** the response status is 400
- **AND** the query is rejected before reaching DuckDB
- **AND** the error message indicates the referenced function/table is not allowed

#### Scenario: Reject secret exfiltration

- **WHEN** an authenticated POST submits `SELECT * FROM duckdb_secrets()`
- **THEN** the response status is 400
- **AND** no upstream connection credentials are returned

#### Scenario: Reject DuckDB metadata reference

- **WHEN** an authenticated POST submits `SELECT * FROM duckdb_settings()` or `SELECT * FROM duckdb_columns`
- **THEN** the response status is 400

#### Scenario: Reject write statement

- **WHEN** an authenticated POST submits `INSERT INTO shopify.public.orders VALUES (1)`
- **THEN** the response status is 400
- **AND** the error message indicates the statement type is not allowed

#### Scenario: Reject multi-statement batch

- **WHEN** an authenticated POST submits `SELECT 1; SELECT 2`
- **THEN** the response status is 400

#### Scenario: Query timeout

- **WHEN** a query exceeds `QUERY_TIMEOUT_MS`
- **THEN** the response status is 504 or 500 with a timeout error message
- **AND** the in-flight query is interrupted
