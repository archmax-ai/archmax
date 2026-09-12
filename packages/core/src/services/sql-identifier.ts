/**
 * A bare, unquoted SQL identifier: a leading letter/underscore followed by
 * letters, digits, or underscores. This is the single source of truth for the
 * identifier-safety gate used everywhere a caller-supplied name (connection
 * slug, model name, dataset/schema/table) is interpolated UNQUOTED into DDL,
 * a search_path, or a scoped schema prefix. Validating against one shared
 * pattern keeps this security-sensitive check from drifting across call sites.
 */
export const SIMPLE_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
