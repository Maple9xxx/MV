import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Static, client-only build target for GitHub Pages (or any plain static
 * host). The game itself never used SSR, auth, or a database
 * (`.grok/app-env.json` has both off), so it mounts straight into a plain
 * HTML shell via `src/main.tsx` — this config skips TanStack Start / Nitro /
 * the Vercel serverless function entirely, none of which a static host can
 * run anyway.
 *
 * `base: "./"` keeps every emitted asset reference relative to wherever the
 * built files are served from, so the same build works unmodified whether it
 * lands at the root of a `username.github.io` site or nested under a project
 * path like `username.github.io/repo-name/`.
 */
export default defineConfig({
  base: "./",
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), viteReact()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
