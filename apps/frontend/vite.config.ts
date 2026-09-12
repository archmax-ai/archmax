import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

const repoRoot = path.resolve(import.meta.dirname, "../..");

export default defineConfig(({ mode }) => {
  // FRONTEND_PORT lives in the repo-root .env files so the API reads the same value
  // and trusts http://localhost:<port> as a browser origin; strictPort keeps the two
  // from drifting apart when the port is taken.
  const port = Number(loadEnv(mode, repoRoot, "").FRONTEND_PORT || 5173);

  return {
    plugins: [TanStackRouterVite(), react()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      port,
      strictPort: true,
      proxy: {
        // xfwd forwards the client IP so Better Auth's rate limiter can key per client.
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
          xfwd: true,
        },
        "/mcp": {
          target: "http://localhost:3000",
          changeOrigin: true,
          xfwd: true,
        },
      },
    },
  };
});
