## MODIFIED Requirements

### Requirement: Document Storage

The system SHALL store uploaded documents on the local filesystem at `<SEMANTICS_DATA_DIR>/projects/<projectId>/uploads/<filename>`. The `uploads/` directory SHALL be created automatically on first upload. Filenames SHALL be sanitized to alphanumeric characters, hyphens, underscores, and dots. Uploading a file with the same name as an existing file SHALL overwrite the previous file.

#### Scenario: First upload creates directory
- **WHEN** a document is uploaded to a project that has no prior uploads
- **THEN** the `uploads/` directory is created under the project's data directory
- **AND** the file is stored at `<SEMANTICS_DATA_DIR>/projects/<projectId>/uploads/<sanitized-filename>`

#### Scenario: Filename sanitization
- **WHEN** a document is uploaded with a filename containing spaces or special characters
- **THEN** unsafe characters are replaced with hyphens
- **AND** the sanitized filename is returned in the API response

#### Scenario: Overwrite existing file
- **WHEN** a document is uploaded with the same name as an existing uploaded document
- **THEN** the existing file is replaced with the new content
