## Why

The `firebird` connection type is the only feature in archmax that requires DuckDB's unsigned-extension support: enabling it starts every project DuckDB instance with `allow_unsigned_extensions` and installs an archmax-hosted, unsigned extension that executes arbitrary native code inside the application process. That is a large security surface and a bespoke maintenance burden (a self-hosted extension repository, a capability env flag, a server capability endpoint field, and a Firebird-only branch in the attach path) for a connection type that is disabled by default. Removing Firebird lets the custom/unsigned-extension machinery go with it, so archmax loads only signed core and DuckDB community extensions.

## What Changes

- **BREAKING** Remove the `firebird` connection type. It is dropped from the `Connection` model's `type` enum, so `firebird` is no longer accepted on create/update, no longer attachable, and no longer testable.
- **BREAKING** Remove the `DUCKDB_ENABLE_CUSTOM_FIREBIRD` environment variable, along with the `customFirebirdEnabled()` and `firebirdExtensionRepository()` helpers.
- **BREAKING** Remove the `firebirdEnabled` field from the `GET /api/config` response. The endpoint keeps `agentConfigured`.
- Remove all custom/unsigned DuckDB extension support: project instances are always created via plain `DuckDBInstance.create()` (no `allow_unsigned_extensions`), and no code path issues `SET custom_extension_repository` or installs an extension from a custom repository. Only signed core extensions and the DuckDB community registry (`INSTALL mssql FROM community`) remain.
- Remove the Firebird-only `charset` field from `connectionConfig` (model, Zod schema, and connection form), and the Firebird-specific ATTACH option builder (`buildFirebirdAttachOptions`).
- Remove Firebird from the connection-management UI: the type dropdown no longer conditionally appends it, and the Firebird-specific Database hint and Charset input are dropped.
- Update `.env.example`, the Docker reference environment table, and the data-federation guide to drop Firebird and its unsigned-extension security notes.

Scope note: this change concerns **DuckDB custom/unsigned extensions** only. The OSI `custom_extensions` YAML field used by semantic models (field `data_type`/`example_data`/`distinct_values`, dataset `view_query`, `dataset_groups`) is an unrelated part of the semantic-model format and is untouched.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `data-connections`: remove the "Env-Gated Firebird Federation" requirement; modify "Connection Model" to drop `firebird` from the `type` enum, drop the `charset` field, and drop the Firebird `connectionConfig` rules and gating; add "No Custom or Unsigned DuckDB Extensions" to state positively that instances never allow unsigned extensions and that extensions come only from the core or community registries.
- `connection-management-ui`: remove the "Firebird Connection Form" requirement.
- `deployment`: remove the "Firebird Extension Configuration" requirement (the `DUCKDB_ENABLE_CUSTOM_FIREBIRD` variable and unsigned-extension allowance); modify "Agent Configuration Status in Config Endpoint" so `GET /api/config` no longer reports `firebirdEnabled`.

## Impact

Code:

- `packages/core/src/config/env.ts` — drop `DUCKDB_ENABLE_CUSTOM_FIREBIRD` from the schema plus both Firebird helpers; `packages/core/src/config/env.test.ts` loses the two Firebird cases.
- `packages/core/src/services/duckdb.ts` — simplify `createDuckDBInstance`, drop the `firebird` cases in the extension/attach-type mapping, `buildFirebirdAttachOptions`, the install-from-custom-repository branch, and the skip/gate helpers for disabled Firebird connections; `duckdb.test.ts` loses the Firebird describe blocks and the `env` mock entries.
- `packages/core/src/services/duckdb-console.ts` — drop the `firebird` case from `extensionTypeLabel`. `PREINSTALLED_EXTENSIONS` is unaffected.
- `packages/core/src/models/Connection.ts` — drop `firebird` from the enum and `charset` from the config interface/schema.
- `apps/api/src/app.ts` — drop `firebirdEnabled` from `/api/config`.
- `apps/api/src/routes/connections.ts` — drop `charset` from the Zod schema and the three Firebird capability gates.
- `apps/api/src/routes/connections-firebird.integration.test.ts` — delete.
- `apps/frontend/src/routes/_auth/$projectId/connections/index.tsx` — drop the conditional Firebird type, its URI/port placeholders, `charset` state and input, and the `isFirebird` branches.

API/contract: `GET /api/config` loses `firebirdEnabled` (the frontend is the only consumer); `POST`/`PUT /api/projects/:id/connections` reject `type: "firebird"` via schema validation (400) rather than the capability gate.

Docs: `apps/docs/src/content/docs/guides/data-federation.mdx`, `apps/docs/src/content/docs/reference/docker.mdx`, `.env.example`.

Data: any stored connection with `type: "firebird"` becomes invalid against the model enum. Firebird was disabled by default and never enabled in a shipped deployment, so no migration is planned; see design.md for how stale rows behave and the operator-facing note.
