## ADDED Requirements

### Requirement: Deprecated ARCHMAX_DATA_DIR Fallback

The system SHALL read its data directory from `SEMANTICS_DATA_DIR`. When `SEMANTICS_DATA_DIR` is unset and the deprecated `ARCHMAX_DATA_DIR` is set, the system SHALL use the `ARCHMAX_DATA_DIR` value and emit a single deprecation warning at startup naming the replacement variable. When both are set, `SEMANTICS_DATA_DIR` SHALL win and the same deprecation warning SHALL be emitted. When neither is set, the existing default SHALL apply (`data` relative to the repository root in development, `/data` in Docker).

The deprecated variable SHALL remain supported for at least one minor release so that existing self-hosted deployments continue to start without configuration changes.

#### Scenario: Only the deprecated variable is set

- **WHEN** the application starts with `ARCHMAX_DATA_DIR=/srv/data` and no `SEMANTICS_DATA_DIR`
- **THEN** the data directory resolves to `/srv/data`
- **AND** a deprecation warning is logged stating that `ARCHMAX_DATA_DIR` is deprecated and `SEMANTICS_DATA_DIR` should be used instead

#### Scenario: Both variables are set

- **WHEN** the application starts with `SEMANTICS_DATA_DIR=/srv/new` and `ARCHMAX_DATA_DIR=/srv/old`
- **THEN** the data directory resolves to `/srv/new`
- **AND** a deprecation warning is logged for `ARCHMAX_DATA_DIR`

#### Scenario: Neither variable is set

- **WHEN** the application starts with neither variable set
- **THEN** the data directory resolves to the existing default
- **AND** no deprecation warning is logged

#### Scenario: Docker image default does not override a legacy variable

- **WHEN** the container starts with `ARCHMAX_DATA_DIR=/data/projects` passed by the operator and `SEMANTICS_DATA_DIR` left at the image's baked default of `/data`
- **THEN** the entrypoint treats the image default as unset and resolves the data directory to `/data/projects`
- **AND** the application processes receive `SEMANTICS_DATA_DIR=/data/projects`
- **AND** a deprecation warning is logged

### Requirement: Container Image Coordinates

The published container image SHALL be `ghcr.io/archmax-ai/semantics`. All deployment documentation, the repo-root `docker-compose.yml`, and `docker-compose.ci.yml` SHALL reference this image.

#### Scenario: Compose file references the semantics image

- **WHEN** a user reads `docker-compose.yml`
- **THEN** the application service image is `ghcr.io/archmax-ai/semantics:latest`

#### Scenario: Documentation pull command

- **WHEN** a user follows the installation or Docker reference documentation
- **THEN** the documented pull command targets `ghcr.io/archmax-ai/semantics`

## MODIFIED Requirements

### Requirement: Single Docker Image Deployment

The Dockerfile SHALL create the `archmax` system user and a dedicated `/data` directory (owned by `archmax`) as the root of all persistent application data, with `HOME=/data`. The system user name is retained across the product rename: it determines file ownership on the persistent `/data` volume, and renaming it would risk leaving files written by an earlier image unreadable.

The entrypoint SHALL validate critical environment variables before starting application processes. When validation fails, the container stays running with a clear error message instead of crash-looping.

The API server SHALL await database connection, schema migrations, and admin seeding to complete before accepting HTTP traffic. The worker SHALL await database connection and schema migrations before processing jobs.

#### Scenario: Non-root process execution

- **WHEN** the container starts
- **THEN** the API server, worker, and nginx processes run as the non-root `archmax` user
- **AND** `SEMANTICS_DATA_DIR/projects` is writable by the `archmax` user
- **AND** `HOME` is set to `SEMANTICS_DATA_DIR` so DuckDB can write its extension cache to `~/.duckdb/` (i.e. `$SEMANTICS_DATA_DIR/.duckdb/`)

#### Scenario: Volume written by an earlier image stays usable

- **WHEN** the container starts with a `/data` volume populated by an archmax-named release
- **THEN** file ownership is unchanged because the system user is unchanged
- **AND** existing projects, semantic model files, and embedded MongoDB data remain readable and writable with no ownership repair step

#### Scenario: Container stays up on bad configuration

- **WHEN** the container starts with missing or invalid required environment variables
- **THEN** the container remains running (does not exit or crash-loop)
- **AND** `docker logs` shows a human-readable error with fix instructions
- **AND** no stack traces or raw JSON error output appear in the logs

#### Scenario: Migrations complete before traffic

- **WHEN** the API server starts
- **THEN** database connection, schema migrations, and admin seeding complete before the HTTP server begins accepting requests

### Requirement: Unified Data Directory

`SEMANTICS_DATA_DIR` SHALL be the root directory for all persistent application data (default `/data` in Docker). All persistent application data MUST reside under `SEMANTICS_DATA_DIR`. The directory layout SHALL be:

- `/data/projects/` — semantic model YAML files (`SEMANTICS_DATA_DIR/projects`)
- `/data/mongodb/` — embedded MongoDB data files (only when using embedded MongoDB; under `SEMANTICS_DATA_DIR/mongodb`)
- `/data/.duckdb/` — DuckDB extension cache (created automatically; under `SEMANTICS_DATA_DIR/.duckdb/` via `HOME=$SEMANTICS_DATA_DIR`)

Redis data SHALL be stored in `/tmp/redis` and is explicitly ephemeral (not backed up). When using an external MongoDB via `MONGODB_URI`, the `/data/mongodb/` directory is unused.

A single bind mount (`-v ~/.archmax:/data`) captures all persistent state: project files, embedded MongoDB data, and the DuckDB extension cache.

#### Scenario: Single volume mount captures all persistent data

- **WHEN** a user mounts a single host volume to `/data`
- **THEN** semantic model files, embedded MongoDB data, and DuckDB extension cache are persisted across container restarts

#### Scenario: Data directory is created on first run

- **WHEN** the container starts for the first time with a fresh volume
- **THEN** the entrypoint creates `$SEMANTICS_DATA_DIR/projects/` and `$SEMANTICS_DATA_DIR/mongodb/` if they do not exist

### Requirement: Docker Compose Production Configuration

The `docker-compose.yml` SHALL use `APP_BASE_URL` (interpolated from the host environment with a default of `http://localhost:8080`) instead of a hardcoded `CORS_ORIGINS` value. The compose file SHALL mount the named volume `archmax-data` to `/data` inside the `archmax` service container. The service name and the volume name are retained across the product rename: Docker Compose addresses named volumes by name, so renaming it would create a new empty volume and orphan an existing deployment's data.

#### Scenario: Compose stack starts successfully

- **WHEN** a user runs `docker compose up -d` with required environment variables set
- **THEN** the `archmax-data` volume is mounted at `/data` inside the application container

#### Scenario: Existing compose deployment keeps its data

- **WHEN** an operator upgrades an existing compose deployment to the semantics-named image without editing their volume configuration
- **THEN** the same `archmax-data` volume is reattached
- **AND** the `archmax` service container is recreated in place — no orphaned container and no port conflict
- **AND** projects, semantic model files, and embedded MongoDB data are preserved

#### Scenario: Compose stack behind a proxy

- **WHEN** a user sets `APP_BASE_URL=https://semantics.example.com` in the host environment and runs `docker compose up -d`
- **THEN** the application container receives `APP_BASE_URL=https://semantics.example.com`
- **AND** authentication and CORS work correctly for requests from `https://semantics.example.com`

### Requirement: Docker Reference Page

The documentation site SHALL include a dedicated Docker reference page (`reference/docker`) that serves as the canonical, in-depth resource for running archmax semantics via Docker. The page MUST cover:

- **Image contents**: what is bundled (API server, BullMQ worker, frontend SPA, nginx reverse proxy, embedded MongoDB, embedded Redis)
- **Exposed ports**: `8080` (nginx -> API + SPA)
- **Environment variables**: a complete table listing every variable the image accepts, its default value, whether it is required or optional, and Docker-specific behavior notes (e.g. `MONGODB_URI` — omit to use embedded MongoDB, `REDIS_URL` — omit to use embedded Redis). The table MUST list `SEMANTICS_DATA_DIR` and note that `ARCHMAX_DATA_DIR` is a deprecated alias
- **Volumes**: `/data` (persistent — `projects/`, `mongodb/`, `.duckdb/`), `/tmp/redis` (ephemeral)
- **Entrypoint behavior**: the decision tree for starting embedded MongoDB and/or Redis vs. using external, startup ordering (mongod -> redis-server -> worker -> API -> nginx), and how `MONGODB_URI` / `REDIS_URL` gate the embedded services
- **Docker Compose reference**: explanation of the repo-root `docker-compose.yml` services, volumes, and networking
- **Health checks**: recommended Docker `HEALTHCHECK` or liveness probe commands
- **Resource recommendations**: minimum RAM and disk for small and medium deployments
- **Troubleshooting**: common issues (port conflicts, volume permissions, MongoDB/Redis connection failures, log locations)
- **Upgrading from archmax**: the image name change, the `SEMANTICS_DATA_DIR` rename with its deprecated alias, and a note that the MongoDB database name, the `archmax-data` volume, and the `archmax` container user are all unchanged, so no data migration or ownership repair is required

The page MUST be linked in the documentation sidebar under "Reference".

#### Scenario: User looks up Docker volume configuration

- **WHEN** a user reads the Docker reference page
- **THEN** they find a volumes section listing `/data` as the persistent mount point
- **AND** the section explains that `projects/`, `mongodb/`, and `.duckdb/` live under `/data` and that `/tmp/redis` is ephemeral

#### Scenario: User looks up entrypoint behavior

- **WHEN** a user reads the Docker reference page
- **THEN** they find a section explaining the startup decision tree
- **AND** it documents that omitting `MONGODB_URI` triggers embedded `mongod` and omitting `REDIS_URL` triggers embedded `redis-server`

#### Scenario: User upgrades from an archmax-named release

- **WHEN** a user reads the Docker reference page after running an archmax-named release
- **THEN** they find an upgrade section naming the new image `ghcr.io/archmax-ai/semantics`
- **AND** it states that `ARCHMAX_DATA_DIR` still works but is deprecated in favour of `SEMANTICS_DATA_DIR`
- **AND** it states that the MongoDB database name, the `archmax-data` volume, and the `archmax` container user are unchanged, so existing projects and connections are retained and the upgrade is a tag change only

#### Scenario: User troubleshoots container startup failure

- **WHEN** a user's container fails to start and they consult the Docker reference
- **THEN** they find a troubleshooting section with common issues and remedies
- **AND** MongoDB connection errors are covered with guidance on verifying `MONGODB_URI` or checking embedded `mongod` logs

### Requirement: APP_BASE_URL Environment Variable

The system SHALL accept an optional `APP_BASE_URL` environment variable that specifies the public-facing URL of the archmax semantics instance (e.g. `https://semantics.example.com`). When `APP_BASE_URL` is set:

- `AUTH_BASE_URL` SHALL default to the value of `APP_BASE_URL` unless `AUTH_BASE_URL` is explicitly set
- `CORS_ORIGINS` SHALL default to the value of `APP_BASE_URL` unless `CORS_ORIGINS` is explicitly set

When `APP_BASE_URL` is not set, existing defaults SHALL be preserved (`AUTH_BASE_URL` defaults to `http://localhost:${PORT}`, `CORS_ORIGINS` defaults to `http://localhost:5173`).

#### Scenario: Cloud deployment with APP_BASE_URL only

- **WHEN** the application starts with `APP_BASE_URL=https://semantics.example.com` and neither `AUTH_BASE_URL` nor `CORS_ORIGINS` is set
- **THEN** Better Auth uses `https://semantics.example.com` as its base URL
- **AND** CORS allows requests from `https://semantics.example.com`
- **AND** Better Auth trusts `https://semantics.example.com` as an origin

#### Scenario: APP_BASE_URL with explicit CORS_ORIGINS override

- **WHEN** the application starts with `APP_BASE_URL=https://semantics.example.com` and `CORS_ORIGINS=https://semantics.example.com,https://other.example.com`
- **THEN** the explicit `CORS_ORIGINS` value is used (both origins allowed)
- **AND** `AUTH_BASE_URL` still derives from `APP_BASE_URL`

#### Scenario: APP_BASE_URL with explicit AUTH_BASE_URL override

- **WHEN** the application starts with `APP_BASE_URL=https://semantics.example.com` and `AUTH_BASE_URL=https://auth.internal:3000`
- **THEN** Better Auth uses `https://auth.internal:3000` as its base URL
- **AND** CORS still derives from `APP_BASE_URL`

#### Scenario: No APP_BASE_URL set (backward compatible)

- **WHEN** the application starts without `APP_BASE_URL` set
- **THEN** `AUTH_BASE_URL` defaults to `http://localhost:${PORT}`
- **AND** `CORS_ORIGINS` defaults to `http://localhost:5173`
- **AND** existing behavior is unchanged
