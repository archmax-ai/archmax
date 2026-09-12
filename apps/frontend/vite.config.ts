import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // The API trusts only this origin (Better Auth trustedOrigins + CSRF); if the
    // port is taken, fail instead of silently moving to one the API rejects.
    port: 5173,
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
});
