## MODIFIED Requirements

### Requirement: Agent Configuration Status in Config Endpoint

The `/api/config` endpoint SHALL include an `agentConfigured` boolean field that indicates whether the agent API key is set. The endpoint MUST NOT expose the actual key value or any secret material. The field SHALL be `true` when `AGENT_API_KEY` is a non-empty string, and `false` otherwise.

The endpoint SHALL NOT report a Firebird capability flag; `firebirdEnabled` is no longer part of the response.

#### Scenario: Agent is configured

- **WHEN** `AGENT_API_KEY` is set to a non-empty value
- **AND** a client requests `GET /api/config`
- **THEN** the response includes `"agentConfigured": true`

#### Scenario: Agent is not configured

- **WHEN** `AGENT_API_KEY` is not set or is empty
- **AND** a client requests `GET /api/config`
- **THEN** the response includes `"agentConfigured": false`
- **AND** no secret values are leaked in the response

#### Scenario: No Firebird capability flag

- **WHEN** a client requests `GET /api/config`
- **THEN** the response does not include a `firebirdEnabled` field

## REMOVED Requirements

### Requirement: Firebird Extension Configuration

**Reason**: The `firebird` connection type has been removed, and with it the only reason to support custom, unsigned DuckDB extensions. `DUCKDB_ENABLE_CUSTOM_FIREBIRD` was the single switch that started project DuckDB instances with `allow_unsigned_extensions`, allowing an unsigned extension to execute arbitrary native code inside the application process. Removing it means the image loads only signed core and DuckDB community extensions (see `data-connections` → "No Custom or Unsigned DuckDB Extensions").

**Migration**: Operators who set `DUCKDB_ENABLE_CUSTOM_FIREBIRD` SHALL remove it from their environment or compose file; the variable is no longer recognised and setting it has no effect. The variable and its security note are removed from `.env.example`, the Docker reference page environment-variable table, and the data-federation guide. Any stored `firebird` connection SHALL be removed directly in MongoDB (`db.connections.deleteMany({ type: "firebird" })`), as the type is rejected by the connection model.
