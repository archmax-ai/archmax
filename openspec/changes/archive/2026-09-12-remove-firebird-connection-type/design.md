## Context

See proposal.md — Why. The relevant current state is that Firebird is not an isolated connection type: it is the anchor for a whole capability-gating mechanism that threads through config, the DuckDB service, the API, and the UI.

- `packages/core/src/config/env.ts` holds `DUCKDB_ENABLE_CUSTOM_FIREBIRD`, `customFirebirdEnabled()`, and `firebirdExtensionRepository()`.
- `packages/core/src/services/duckdb.ts` consumes the gate in four distinct places: `createDuckDBInstance` (the `allow_unsigned_extensions` branch), `extensionForType`/the attach-type mapping, the install-from-custom-repository branch in the extension loader, and `isConnectionSkipped` — a predicate that lets an active-but-unusable Firebird connection be skipped during setup without tearing down the cached project instance. That last one is load-bearing for cache stability: `isReady` and the `needsNewExtension` probe apply the same predicate, and the comments explain that getting it wrong causes a rebuild-and-reattach on every federated query.
- `apps/api/src/app.ts` publishes the gate as `firebirdEnabled` on `GET /api/config`; `apps/api/src/routes/connections.ts` re-checks it on create, update, and test; the connections page reads it to decide whether to append `firebird` to the type dropdown.

The `charset` field is Firebird-only across the stack: it exists in the `Connection` interface/schema, the route Zod schema, the ATTACH option builder, and the form. Nothing else reads it.

Two naming collisions are worth stating so implementation does not overreach: the OSI `custom_extensions` YAML field in semantic models is unrelated to DuckDB custom extensions and is out of scope, and DuckDB *community* extensions (`INSTALL mssql FROM community`) are signed and stay.

## Goals / Non-Goals

**Goals:**

- Delete Firebird and the unsigned/custom-extension machinery together, leaving no gate, flag, or dead branch behind.
- Leave the DuckDB instance lifecycle demonstrably simpler: one unconditional `DuckDBInstance.create()`, no capability-dependent configuration.
- Keep the spec's positive guarantee explicit (extensions come only from core/community) rather than merely deleting the requirement that permitted otherwise.

**Non-Goals:**

- Providing a replacement Firebird integration or a migration path for Firebird data.
- Touching the OSI `custom_extensions` semantic-model field.
- Changing `PREINSTALLED_EXTENSIONS` or the federation console's existing statement allow/deny lists, which already reject `INSTALL … FROM '<source>'`.
- Writing a data migration for stored `firebird` connection documents (see Migration Plan).

## Decisions

**Delete `isConnectionSkipped` entirely rather than keeping it as a no-op.** Once `firebird` is gone, the predicate is unconditionally `false`. The alternative — keeping the hook "in case another gated type appears" — leaves three call sites (`setupProjectInstance`, `isReady`, `needsNewExtension`) coordinating around a predicate that can never fire, and its subtle contract is exactly the kind of thing that rots. The comments documenting the cache-churn hazard go with it. If a gated connection type is ever reintroduced, reinstating the predicate is a small, well-understood change and the archived Firebird proposal records how it worked.

**Reject `firebird` through the type enum, not a dedicated error.** Today the three route-level gates return `AppError.badRequest("Firebird connections are not enabled on this server")`. After removal, dropping `firebird` from the `Connection` model enum and the route Zod schema makes the request fail validation with a 400 on its own. Adding a bespoke "Firebird was removed" error would mean retaining Firebird-aware code in the routes to say Firebird no longer exists — the opposite of the change's purpose. A generic invalid-type 400 is the correct contract, and it matches how every other unsupported type behaves.

**Remove `firebirdEnabled` from `GET /api/config` outright rather than deprecating it to `false`.** This is a single-user, self-hosted system whose only consumer of the field is the connections page in the same repo, shipped from the same image; there is no independent client to break. Leaving a permanently-`false` field would preserve the UI's capability-lookup shape for no benefit. The connections page drops its `useAppConfig` call (the import goes with it, since nothing else on that page uses it) and lists the supported types unconditionally.

**Drop `charset` rather than generalising it.** MySQL and Postgres both accept a charset/encoding concept, so `charset` could arguably be retained as a general connection option. It would be untested and unwired dead configuration — the ATTACH builders for those types never read it. Removing it keeps the `.strict()` schema honest; it can be added back deliberately, with behavior, if a type needs it.

**Delete `connections-firebird.integration.test.ts` rather than inverting it into a rejection test.** The generic "unknown type is rejected" behavior belongs with the other connection-model validation tests, not in a Firebird-named file; the delta spec's "Firebird type rejected" and "Charset config field rejected" scenarios are covered by adding cases alongside the existing connection CRUD validation tests.

## Risks / Trade-offs

**A deployment has a stored `firebird` connection and the enum removal makes it invalid** → Firebird shipped disabled by default and was never enabled in a released deployment, so the realistic blast radius is nil. Behaviorally, Mongoose enum validation runs on write, not read: a stale document still loads and lists, and it will not attach (there is no `firebird` extension mapping), which the federation path already handles per-connection rather than aborting the project instance.

Note the sharp edge this creates: `softDelete()` sets the flags and calls `this.save()`, and Mongoose validates the whole document on save by default, so deleting a stale `firebird` connection **through the UI would fail** with a validation error on `type`. Rather than keep `firebird` in the enum purely to permit its own deletion, or widen the plugin to `validateModifiedOnly`, the migration note directs operators to remove such documents with a query-level delete (`db.connections.deleteMany({ type: "firebird" })`), which bypasses document validation. No startup cleanup code is added for a state that effectively cannot exist.

**An operator still sets `DUCKDB_ENABLE_CUSTOM_FIREBIRD`** → The env schema uses a permissive Zod object, so an unrecognised variable is ignored rather than failing startup. The variable silently does nothing, which is the intended outcome; both removal notes instruct operators to delete it.

**Removing the `allow_unsigned_extensions` branch changes DuckDB instance configuration for anyone who had the flag on** → That is the point of the change, and it strictly narrows what can be loaded. No supported connection type needs an unsigned extension.

**Missed references leave the build green but the docs wrong** → Docs and `.env.example` are not covered by `typecheck`/`lint`. The task list ends with a repo-wide case-insensitive `firebird` sweep (excluding `node_modules`, `.git`, `apps/e2e/playwright-report`, and `openspec/changes/archive/`) so prose references cannot survive the change.

## Migration Plan

No schema migration or data backfill. Deployment is a normal image roll:

1. Ship the change; the variable becomes inert and the type disappears from the UI.
2. Operators who set `DUCKDB_ENABLE_CUSTOM_FIREBIRD` remove it from their environment or compose file at their convenience.
3. Any stored `firebird` connection is removed directly in MongoDB with `db.connections.deleteMany({ type: "firebird" })`. Deleting it from the connections page does not work, because the UI's soft delete saves the document and trips enum validation on the now-unsupported `type`.

Rollback is reverting the commit and redeploying; because nothing is migrated, no state has to be restored. The archived `add-firebird-connection-type` change remains in `openspec/changes/archive/` as the record of the original design if Firebird is ever revisited.
