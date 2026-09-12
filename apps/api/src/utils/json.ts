import type { Context } from "hono";

/**
 * Serialise a JSON response, coercing `bigint` values to `number`. DuckDB
 * returns 64-bit counts/ids as `bigint`, which `JSON.stringify` refuses to
 * serialise — the data-browser and console query results both flow through
 * here so a single replacer keeps their wire shape consistent.
 */
export function safeJson(c: Context, data: unknown): Response {
  const body = JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v));
  return c.newResponse(body, 200, { "Content-Type": "application/json" });
}
