## REMOVED Requirements

### Requirement: Firebird Connection Form

**Reason**: The `firebird` connection type has been removed from the platform (see `data-connections` → "Env-Gated Firebird Federation" removal), so the form no longer needs a conditionally surfaced Firebird type, its Firebird-specific Database hint, or the Firebird-only Charset field. The `firebirdEnabled` server capability flag that gated the dropdown entry no longer exists.

**Migration**: None required for users — Firebird was hidden from the dropdown unless an operator explicitly enabled the capability. The type dropdown now lists the supported types unconditionally, with no capability lookup.
