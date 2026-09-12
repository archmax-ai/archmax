## Context

See `proposal.md` — Why. The rename spans ~90 files and four categories of identifier that behave very differently under change:

1. **Prose and brand strings** — free to change; no runtime consequence.
2. **Build-time identifiers** — package names, file names, exported symbols. Changing them is safe but must be atomic with their references or the build breaks.
3. **Deployment-surface identifiers** — env vars, image name, docs domain. Changing them breaks running installations unless a compatibility path exists.
4. **State keys** — MongoDB database name, auth cookie prefix, seeded admin email, `localStorage` keys. Changing them silently discards or orphans data that already exists.

The sibling `pangea` repo already resolved the naming question: root package `archmax-<product>`, workspace scope kept at `@archmax/*`, env vars prefixed `<PRODUCT>_`, brand lowercase. That precedent is adopted rather than re-litigated.

## Goals / Non-Goals

**Goals:**

- A single atomic rename that leaves `pnpm typecheck`, `pnpm lint`, the API build, the unit suite, and the E2E suite green.
- Zero data loss and zero forced reconfiguration for an existing self-hosted deployment upgrading to the first semantics-named image.
- Category 4 identifiers provably untouched, so an upgrade keeps projects, connections, sessions, and user preferences.

**Non-Goals:**

- Renaming the `@archmax/*` workspace scope. It is the company namespace and `pangea` uses the same one.
- Migrating the MongoDB database name, cookie prefix, admin email, `localStorage` keys, Docker system user, or Compose volume name — all deliberately retained (see D3 and D4).
- Performing the GitHub org/repo rename, DNS for `semantics.archmax.ai`, or the first `ghcr.io/archmax-ai/semantics` publish. These are maintainer actions outside the repository.
- Drawing new logo artwork. The docs `logo-light.svg` / `logo-dark.svg` are the **archmax** wordmark (paths spelling "archmax", `aria-label="archmax"`). Because the product name now starts with the company name, the mark stays valid: the header renders the wordmark followed by the text "semantics". No new SVG is needed.

## Decisions

### D1: Keep `@archmax/*`, rename the root package only

`@archmax/*` is the company scope; `pangea` publishes the same package names in its own repo. Both are private workspace packages, so there is no registry collision. The root package becomes `archmax-semantics`.

*Alternative rejected:* renaming to `@semantics/*`. It would touch ~780 import sites for no functional gain and would diverge from the sibling repo.

### D2: `SEMANTICS_DATA_DIR` with a deprecating fallback, resolved once in `bootstrap.ts`

`packages/core/src/config/bootstrap.ts` already normalises the data directory before `getEnv()` reads it. The fallback belongs there, not in the Zod schema: bootstrap runs first, so it can read the deprecated variable, assign it to `SEMANTICS_DATA_DIR`, warn once, and leave `env.ts` with a single clean `SEMANTICS_DATA_DIR` field. Everything downstream (`getEnv().projectsDir`, health checks, the migration script) then sees one name.

The warning fires once at startup, not per read, so a long-running deployment does not spam logs. It fires once *per process*: in the Docker image the API server and the BullMQ worker each bootstrap, so `docker logs` shows the line twice (plus one shell-level line from the entrypoint, printed on the post-`gosu` pass only). Three lines total, all at startup.

**Docker nuance.** The Dockerfile bakes `ENV SEMANTICS_DATA_DIR=/data` so that `docker exec`-run tooling (the migration script) and the health check see the variable without going through the entrypoint. That default would otherwise beat an operator's `-e ARCHMAX_DATA_DIR=/data/projects` (the documented Railway setup) under the "both set → new wins" rule and silently relocate their data. The entrypoint therefore treats a `SEMANTICS_DATA_DIR` equal to the image default as *unset* when a legacy variable is present and adopts the legacy value; an explicitly passed, different `SEMANTICS_DATA_DIR` is left alone. The upgrade rehearsal surfaced this — the first run logged "ignored because SEMANTICS_DATA_DIR is set" for a plain `-e ARCHMAX_DATA_DIR=/data`. The released April image already used the same idea (`ARCHMAX_DATA_DIR ← ARCHSEM_DATA_DIR ← SEMLAYER_DATA_DIR`), so this is not new ground.

*Alternative rejected:* a hard rename. Every existing self-hosted install sets `ARCHMAX_DATA_DIR`; a hard break means silent data-directory relocation to the default and an apparently empty instance — the worst possible failure mode for a rename.

### D3: Retain every state key

- **MongoDB `archmax`** (`packages/core/src/infra/db.ts`) — the database holds all projects and connections. A rename points the app at an empty database while the old one sits unreferenced on disk.
- **Cookie prefix `archmax`** (`apps/api/src/lib/auth.ts`) — a rename invalidates every live session with no error message, just a silent logout.
- **Admin email `admin@archmax.local`** (`apps/api/src/lib/seed-admin.ts`) — the seeder reconciles the admin *by this address* on every boot. Changing it creates a second admin and orphans the first, including its password.
- **`localStorage` keys** — theme, disclaimer acknowledgement, last project, and five panel widths. A rename re-shows the disclaimer and resets layout for every user.

These are invisible to users precisely because they are internal. Renaming them buys consistency nobody observes at the cost of breakage everybody observes.

*Alternative rejected:* rename with migration code. A `localStorage` copy-forward shim plus documented `mongodump`/restore steps is real code and real user risk to change strings no user sees. If it is ever wanted, it is a separate change with its own proposal.

### D4: Keep the Docker system user and the named volume

The `archmax` system user is created with `useradd -r`, which assigns the next free system UID — so a rename preserves the UID only by luck, and not reliably across base-image updates. `entrypoint.sh` chowns `$DATA_DIR`, `projects/`, and `mongodb/` non-recursively, so files already inside `projects/<id>/` would keep the old owner and become unwritable. The user is therefore retained.

The Compose named volume `archmax-data` is retained for the same class of reason but a sharper failure: Compose resolves volumes by name, so a renamed volume is simply a different, empty volume. An operator who pulls the new image without editing their compose file would get a working but empty instance, with their data intact yet unreferenced — a failure that looks like data loss and invites a panicked restore.

Together with D3 this makes the upgrade a pure image-tag change: same database, same volume, same file ownership, same sessions. Nothing to migrate, and a rollback that needs only the old tag.

The compose *service* name also stays `archmax`. It was first planned as a cosmetic rename, but the upgrade rehearsal (task 6.6) showed why not: Compose identifies containers by service name, so after pulling a compose file with a renamed service, a plain `docker compose up -d` creates a new `semantics` container while the old `archmax` one keeps running as an orphan — and the new one cannot bind port 8080. Only `--remove-orphans` or a manual `down` recovers. Keeping the name means `docker compose pull && docker compose up -d` recreates the container in place, exactly as the self-hosting guide has always instructed.

*Alternatives rejected:* renaming the user with a recursive `chown` self-heal in the entrypoint — it works, but it adds a privileged recursive filesystem walk on every container start to fix a problem that only exists because of a cosmetic rename. Pinning an explicit UID would make a rename safe, but it changes the security-relevant part of the Dockerfile for no user-visible benefit.

### D5: Rename the MCP-layer files and their exported symbol

`apps/api/src/mcp/archmax-server.ts`, `archmax-route.ts`, and `archmax-server.test.ts` become `semantics-*`, `registerArchmaxTools` becomes `registerSemanticsTools`, and the `@archmax/api` subpath export `./mcp/archmax-server` becomes `./mcp/semantics-server`. The subpath export is consumed inside this repo only, so no external consumer breaks.

The MCP *server name* (advertised in the initialize handshake) changes from `"archmax"` to `"archmax-semantics"`. This is safe: bearer tokens, project slugs, and endpoint paths are untouched, so a configured client keeps working — only the display name it shows changes. The `mcpServers["archmax-semantics"]` key in documentation is a suggestion to users, not a protocol value.

### D6: Fix the `vendor_name` spec drift rather than rename it

The specs claim graph positions are stored under `vendor_name: "archmax"`; the code writes `"COMMON"`. The deltas correct the specs. This is a documentation fix surfaced by the audit, not part of the rename — it is called out separately so it is not mistaken for a behavioural change.

### D7: Order the work so the tree is never broken

Renames land in dependency order — core config first (it defines `SEMANTICS_DATA_DIR`), then its consumers, then infra, then docs. The OpenSpec archived-change history under `openspec/changes/archive/` is left untouched: it is a record of what was proposed at the time, and rewriting it would falsify history.

## Risks / Trade-offs

- **A blanket `sed` over `archmax` corrupts `@archmax/*` imports and state keys** → No global replace. Each category is handled by an explicitly scoped command, and a verification step greps for surviving `archmax` occurrences and asserts that every one is either an `@archmax/*` import, a retained state key, the company name in prose, or archived OpenSpec history.

- **Docs domain cutover** → `docs.archmax.ai` stops serving once `CNAME` changes. Existing links break unless a redirect is kept. Flagged as a maintainer action; the change itself only updates references.

- **Mixed identity after upgrade** — a semantics-branded UI reading an `archmax`-named MongoDB database, running as the `archmax` container user on an `archmax-data` volume, with `archmax.session_token` cookies → Accepted deliberately (D3, D4). Documented in the Docker reference upgrade section so an operator inspecting the database, the volume list, or `ps` output is not confused. The cost is cosmetic inconsistency in places only an operator sees; the benefit is that no upgrade path can lose data.

- **The docs header currently hides the title behind the wordmark** → Starlight has `replacesTitle: true`, so today only the "archmax" wordmark shows and the product name would be invisible. The custom `SiteTitle` override (already present for the version badge) is extended to render the wordmark, then "semantics", then the badge. The wordmark's `aria-label` stays "archmax" and the "semantics" text is real DOM text, so the accessible name reads "archmax semantics" without editing the SVG.

- **Stale `dist/` and `coverage/` artefacts still contain old names** → Both are build output, git-ignored, and regenerated. Not touched; a clean build clears them.

## Migration Plan

1. Land the rename on a branch; verify `pnpm typecheck`, `pnpm lint`, `pnpm --filter @archmax/api build`, `npx vitest run` all pass.
2. Build `semantics:local` and run the E2E stack against it, then start it against a volume seeded by the previous image to confirm the retained user and volume need no intervention.
3. Rename the GitHub org and repo; point `semantics.archmax.ai` DNS at GitHub Pages.
4. Publish `ghcr.io/archmax-ai/semantics`. Keep the previous archmax-named tag published but frozen so existing `docker pull` references do not 404 mid-upgrade.
5. Release notes state: image name changed, `ARCHMAX_DATA_DIR` deprecated but working, no data migration required.

**Rollback:** the previous image tag remains pullable and reads the same MongoDB database, the same `archmax-data` volume with the same file ownership, and the same `ARCHMAX_DATA_DIR`. Because no state key, volume name, or UID changed, rolling back is a tag change with no data restore and no ownership repair.
