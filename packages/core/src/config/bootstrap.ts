import { config } from "dotenv";
import { isAbsolute, resolve } from "node:path";
import { DATA_DIR_ENV, resolveDataDirEnv } from "./data-dir.js";

const root = resolve(import.meta.dirname, "../../../..");
config({ path: resolve(root, ".env.local") });
config({ path: resolve(root, ".env") });

const { dataDir, deprecationWarning } = resolveDataDirEnv(process.env);
if (deprecationWarning) {
  console.error(`\x1b[33m\x1b[1m  WARNING:\x1b[0m\x1b[33m ${deprecationWarning}\x1b[0m`);
}

if (!dataDir) {
  process.env[DATA_DIR_ENV] = resolve(root, "data");
} else if (!isAbsolute(dataDir)) {
  process.env[DATA_DIR_ENV] = resolve(root, dataDir);
} else {
  process.env[DATA_DIR_ENV] = dataDir;
}
