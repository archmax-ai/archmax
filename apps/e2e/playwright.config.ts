import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "html",
  use: {
    baseURL: BASE_URL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testIgnore: [/data-federation\.spec\.ts/, /mcp\.spec\.ts/],
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    // data-federation and mcp both provision the same connections in the shared project,
    // so they must not run concurrently: mcp runs after federation has finished.
    {
      name: "federation",
      testMatch: /data-federation\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      name: "mcp",
      testMatch: /mcp\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["federation"],
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "docker compose -f ../../docker-compose.ci.yml --env-file /dev/null up",
        url: `${BASE_URL}/api/health`,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
