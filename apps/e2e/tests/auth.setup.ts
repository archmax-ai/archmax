import { test as setup, expect } from "@playwright/test";
import * as fs from "node:fs";
import { AUTH_DIR, USER_STATE, PRE_DISCLAIMER_STATE, PROJECT_STATE, PROJECT_NAME } from "./auth-state";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";
const USERNAME = process.env.E2E_USERNAME ?? "admin";
const PASSWORD = process.env.E2E_PASSWORD ?? "testpass123";

// Signs in exactly once for the whole run. The sign-in endpoint is rate-limited to
// 10 requests per minute per IP, and a full run used to spend all of them logging in
// from every spec — specs that are not about authentication reuse this state instead.
setup("authenticate", async ({ page, context }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  await page.goto("/login");
  await page.locator("#username").fill(USERNAME);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

  await context.storageState({ path: PRE_DISCLAIMER_STATE });

  // A fresh browser profile always gets the disclaimer; it renders after the session and
  // app config have loaded, which on a cold stack takes longer than a short optimistic
  // check. Wait for it deterministically — skipping it here silently breaks every spec
  // that reuses this state, because the dialog then blocks their first click.
  const disclaimer = page.getByRole("dialog");
  await expect(disclaimer).toBeVisible({ timeout: 15_000 });
  await disclaimer.locator("input[type='checkbox']").check();
  await disclaimer.getByRole("button", { name: "Continue" }).click();
  await expect(disclaimer).not.toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("archmax:disclaimer-accepted"))).toBeTruthy();

  await context.storageState({ path: USER_STATE });

  // Provision the shared project through the API from the signed-in context. The mcp and
  // data-federation specs both used to create it through the UI and raced each other under
  // parallel workers, leaving one of them stuck on a slug conflict.
  const headers = { "Content-Type": "application/json", Origin: BASE_URL };
  const list = await page.request.get(`${BASE_URL}/api/projects`, { headers });
  expect(list.ok()).toBe(true);
  let project = ((await list.json()) as Array<{ _id: string; slug: string; title: string }>).find(
    (p) => p.title === PROJECT_NAME,
  );
  if (!project) {
    const created = await page.request.post(`${BASE_URL}/api/projects`, {
      headers,
      data: { title: PROJECT_NAME },
    });
    expect(created.status()).toBe(201);
    project = await created.json();
  }
  fs.writeFileSync(PROJECT_STATE, JSON.stringify({ id: project!._id, slug: project!.slug }));
});
