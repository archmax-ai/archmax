## MODIFIED Requirements

### Requirement: Deep Agent Backend

The API SHALL expose a streaming endpoint for the semantic model agent. The agent uses LangChain Deep Agents with `FilesystemBackend({ rootDir: "<SEMANTICS_DATA_DIR>/projects/<projectId>", virtualMode: true })`, giving it sandboxed filesystem access to the project's YAML files. The agent system prompt SHALL document the OSI-compliant YAML schema including: snake_case keys (`ai_context`, `primary_key`, `unique_keys`, `from_columns`, `to_columns`), the OSI Expression object format (`{ dialects: [{ dialect: ANSI_SQL, expression: "..." }] }`), `custom_extensions` for project-specific field metadata (`data_type`, `example_data`, `distinct_values` under `vendor_name: COMMON`), and the `dimension` property with `is_time` for temporal fields. The agent SHALL also have access to a `read_document` tool that reads uploaded documents from the project's `uploads/` directory and returns their content as markdown, enabling the agent to reference data dictionaries, ERDs, business glossaries, and other supplementary documentation when building semantic models.

#### Scenario: Agent lists semantic models
- **WHEN** the user asks "What semantic models exist?"
- **THEN** the agent uses the `ls` filesystem tool to list YAML files in the project directory
- **AND** returns a summary to the user

#### Scenario: Agent creates a new semantic model
- **WHEN** the user asks "Create a model for the orders schema"
- **THEN** the agent uses `write_file` to create a new YAML file conforming to the OSI schema with snake_case keys and Expression objects
- **AND** the file is written to `<SEMANTICS_DATA_DIR>/projects/<projectId>/<model-name>.yaml`

#### Scenario: Agent writes fields with extensions
- **WHEN** the agent creates a dataset with fields that have data types and example data
- **THEN** the field's `data_type`, `example_data`, and `distinct_values` are placed in `custom_extensions` with `vendor_name: COMMON`
- **AND** timestamp/date fields include `dimension: { is_time: true }`

#### Scenario: Agent reads an uploaded document
- **WHEN** the user says "Use the data dictionary PDF to create the model"
- **THEN** the agent invokes `read_document` with the PDF filename
- **AND** receives the document content as markdown
- **AND** uses the extracted information to inform semantic model creation

### Requirement: Semantic Model Visualization Tabs

When a semantic model is selected, the visualization view SHALL display three tabs: YAML Code, Tree, and Graph. The user can switch between tabs freely. The selected tab SHALL persist across model re-selections within the same session.

#### Scenario: YAML Code tab displays model source

- **WHEN** the YAML Code tab is active
- **THEN** the full YAML source of the selected semantic model (root file plus all dataset files assembled) is displayed with syntax highlighting
- **AND** the YAML is read-only (no in-place editing)

#### Scenario: Tree tab displays hierarchical structure

- **WHEN** the Tree tab is active
- **THEN** the complete semantic model is displayed as an expandable tree: model root → datasets (with nested fields), metrics, and relationships
- **AND** hovering over a leaf-level item (field, metric, relationship) displays a tooltip or popover with all properties (expression, data_type, example_data, description, etc.)

#### Scenario: Graph tab displays dataset relationships

- **WHEN** the Graph tab is active
- **THEN** each dataset is rendered as a node in an interactive graph
- **AND** relationships are rendered as directed edges between dataset nodes
- **AND** the user can drag nodes to reposition them
- **AND** the graph supports zoom and pan

#### Scenario: Graph node positions are persisted

- **WHEN** the user drags a dataset node to a new position in the graph
- **THEN** the new x/y coordinates are saved to the dataset's `custom_extensions` array (vendor_name: "COMMON") via the API
- **AND** reopening the graph restores nodes to their saved positions

#### Scenario: Graph auto-layout for new models

- **WHEN** a model is opened in the Graph tab and datasets have no saved positions
- **THEN** an automatic layout algorithm positions the nodes
- **AND** the auto-generated positions are saved as custom_extensions

### Requirement: Project Custom Instructions via AGENTS.md

The semantic-model authoring agent SHALL support an optional `AGENTS.md` file located at the project root (`<SEMANTICS_DATA_DIR>/projects/<projectId>/AGENTS.md`). The agent SHALL load this file using the Deep Agents library's built-in `memory` option (the path `AGENTS.md`, relative to the agent's project-scoped filesystem backend) rather than any bespoke file-reading code. When the file exists, its contents SHALL be injected into the agent's system prompt as project-specific instructions. When the file is absent, the agent SHALL start normally with no error. The agent's base system prompt SHALL include guidance describing the optional `AGENTS.md` and instructing the agent to follow any project-specific instructions found there.

#### Scenario: AGENTS.md present is loaded into instructions

- **WHEN** a project root contains an `AGENTS.md` file and the authoring agent is created for that project
- **THEN** the agent is configured with the Deep Agents `memory` source `AGENTS.md`
- **AND** the file's contents are present in the agent's composed system prompt

#### Scenario: AGENTS.md absent does not error

- **WHEN** a project root does not contain an `AGENTS.md` file and the authoring agent is created for that project
- **THEN** the agent is created successfully without throwing
- **AND** no project-instruction content is injected beyond the base system prompt guidance

#### Scenario: System prompt describes the AGENTS.md convention

- **WHEN** the authoring agent's base system prompt is composed
- **THEN** it includes guidance stating that an optional project-root `AGENTS.md` may contain project-specific instructions the agent must follow

