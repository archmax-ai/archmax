import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const AUTH_DIR = path.join(__dirname, ".auth");
/** Signed in, disclaimer acknowledged — what most specs want. */
export const USER_STATE = path.join(AUTH_DIR, "user.json");
/** Signed in, disclaimer not yet acknowledged — for the disclaimer spec itself. */
export const PRE_DISCLAIMER_STATE = path.join(AUTH_DIR, "pre-disclaimer.json");
/** The shared "E2E Federation" project, provisioned once so specs never race to create it. */
export const PROJECT_STATE = path.join(AUTH_DIR, "project.json");

export const PROJECT_NAME = "E2E Federation";

export interface ProjectState {
  id: string;
  slug: string;
}

export function readProjectState(): ProjectState {
  return JSON.parse(fs.readFileSync(PROJECT_STATE, "utf-8")) as ProjectState;
}
