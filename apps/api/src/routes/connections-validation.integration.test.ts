import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  projectFindById: vi.fn(),
  connectionFindOne: vi.fn(),
  connectionCreate: vi.fn(),
  connectionFindOneAndUpdate: vi.fn(),
}));

vi.mock("@archmax/core/infra/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@archmax/core/config/env", () => ({
  getEnv: vi.fn(() => ({ ENCRYPTION_KEY: "" })),
}));
vi.mock("@archmax/core/models/index", () => ({
  Connection: {
    findOne: mocks.connectionFindOne,
    create: mocks.connectionCreate,
    findOneAndUpdate: mocks.connectionFindOneAndUpdate,
  },
  Project: { findById: mocks.projectFindById },
  CONNECTION_TYPES: ["postgres", "mysql", "mssql", "sqlite", "duckdb", "iceberg"],
  SLUG_PATTERN: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
  slugifyConnectionName: (s: string) => s.toLowerCase(),
}));
vi.mock("@archmax/core/services/duckdb", () => ({
  deleteProjectDuckdbFile: vi.fn(),
  disposeProjectInstance: vi.fn(),
  getProjectInstance: vi.fn(),
  testSingleConnection: vi.fn(),
  withQueryTimeout: vi.fn(async (_db: unknown, op: () => Promise<unknown>) => op()),
  safeDisconnect: vi.fn((db: { disconnectSync?: () => void }) => db.disconnectSync?.()),
}));

import { createTestApp } from "../test-utils/api-client";
import connectionsRoute from "./connections";

const app = createTestApp("/api/projects/:projectId/connections", connectionsRoute);
const BASE = "/api/projects/proj1/connections";

function post(body: Record<string, unknown>) {
  return app.request(BASE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.projectFindById.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: "proj1" }) });
});

describe("connections route — connection type validation", () => {
  it("rejects creating a firebird connection with 400", async () => {
    const res = await post({
      name: "fb",
      type: "firebird",
      connectionConfig: { host: "h", database: "d", user: "u", password: "p" },
    });
    expect(res.status).toBe(400);
    expect(mocks.connectionCreate).not.toHaveBeenCalled();
  });

  it("rejects updating a connection to firebird with 400", async () => {
    mocks.connectionFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "c1", project: "proj1", connectionConfig: {} }),
    });
    const res = await app.request(`${BASE}/c1`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "firebird" }),
    });
    expect(res.status).toBe(400);
    expect(mocks.connectionFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("accepts a supported connection type", async () => {
    mocks.connectionCreate.mockResolvedValue({
      toObject: () => ({ _id: "c1", name: "pg", type: "postgres", connectionConfig: {} }),
    });
    const res = await post({
      name: "pg",
      type: "postgres",
      connectionConfig: { host: "h", database: "d", user: "u", password: "p" },
    });
    expect(res.status).toBe(201);
    expect(mocks.connectionCreate).toHaveBeenCalledTimes(1);
  });
});

describe("connections route — connectionConfig strictness", () => {
  it("rejects a charset field with 400", async () => {
    const res = await post({
      name: "pg",
      type: "postgres",
      connectionConfig: { host: "h", database: "d", user: "u", password: "p", charset: "UTF8" },
    });
    expect(res.status).toBe(400);
    expect(mocks.connectionCreate).not.toHaveBeenCalled();
  });

  it("rejects an unknown connectionConfig field with 400", async () => {
    const res = await post({
      name: "pg",
      type: "postgres",
      connectionConfig: { host: "h", injectedField: "malicious" },
    });
    expect(res.status).toBe(400);
    expect(mocks.connectionCreate).not.toHaveBeenCalled();
  });
});
