import { describe, it, expect } from "vitest";
import { resolveDataDirEnv } from "./data-dir";

describe("resolveDataDirEnv", () => {
  it("uses SEMANTICS_DATA_DIR without warning when only it is set", () => {
    const result = resolveDataDirEnv({ SEMANTICS_DATA_DIR: "/srv/new" });
    expect(result).toEqual({ dataDir: "/srv/new" });
  });

  it("falls back to ARCHMAX_DATA_DIR with a deprecation warning", () => {
    const result = resolveDataDirEnv({ ARCHMAX_DATA_DIR: "/srv/old" });
    expect(result.dataDir).toBe("/srv/old");
    expect(result.deprecationWarning).toContain("ARCHMAX_DATA_DIR is deprecated");
    expect(result.deprecationWarning).toContain("SEMANTICS_DATA_DIR");
  });

  it("prefers SEMANTICS_DATA_DIR when both are set and still warns", () => {
    const result = resolveDataDirEnv({
      SEMANTICS_DATA_DIR: "/srv/new",
      ARCHMAX_DATA_DIR: "/srv/old",
    });
    expect(result.dataDir).toBe("/srv/new");
    expect(result.deprecationWarning).toContain("ignored because SEMANTICS_DATA_DIR is set to a different value");
  });

  it("warns without claiming to ignore when both are set to the same value", () => {
    const result = resolveDataDirEnv({
      SEMANTICS_DATA_DIR: "/data",
      ARCHMAX_DATA_DIR: "/data",
    });
    expect(result.dataDir).toBe("/data");
    expect(result.deprecationWarning).toContain("redundant");
    expect(result.deprecationWarning).not.toContain("ignored");
  });

  it("returns undefined and no warning when neither is set", () => {
    expect(resolveDataDirEnv({})).toEqual({ dataDir: undefined });
  });
});
