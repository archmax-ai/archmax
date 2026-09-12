## MODIFIED Requirements

### Requirement: Fixed Commit Author

All Git commits created by the system SHALL use the fixed author identity `archmax semantics <semantics@localhost>` for both the author and committer fields. This identity is not configurable. Commits created before the rename retain their original author identity; the system SHALL NOT rewrite existing history.

#### Scenario: Commit uses fixed author

- **WHEN** a Git commit is created (via publish, sync merge commit, or initial commit)
- **THEN** the commit's author and committer are both `archmax semantics <semantics@localhost>`

#### Scenario: Pre-rename history is preserved

- **WHEN** a project repository contains commits authored before the rename
- **THEN** those commits retain their original author identity
- **AND** the history listing renders them without error

### Requirement: Automatic Repository Initialization

Each project's data directory (`<SEMANTICS_DATA_DIR>/projects/<projectId>/`) SHALL be a Git repository. If the `.git` directory does not exist when a Git operation is attempted, the system SHALL initialize it with `git init`, create a `.gitignore` (excluding `build/` and temp files), and create an initial commit with all existing files.

#### Scenario: New project gets a Git repo

- **WHEN** a new project is created
- **THEN** the project directory is initialized as a Git repository
- **AND** a `.gitignore` file is created excluding `build/` and `.*tmp` patterns
- **AND** an initial commit is created if any files exist

#### Scenario: Existing project without Git repo (migration)

- **WHEN** a publish or sync is attempted on a project that lacks a `.git` directory
- **THEN** the system initializes the repository with all existing files as an initial commit
- **AND** subsequent operations proceed normally
