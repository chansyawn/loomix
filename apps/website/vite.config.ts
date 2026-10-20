import { defineConfig } from "vite-plus";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { lazyPlugins } from "vite-plus";
import { localResources } from "./scripts/local-resources.ts";
import { resolveResourceConfig } from "./scripts/resource-config.ts";

const config = defineConfig(({ mode }) => {
  const resources = resolveResourceConfig(mode);
  return {
    run: {
      tasks: {
        "verify-release": { command: "node scripts/verify-release.ts", cache: false },
        "verify-build": { command: "node scripts/verify-build.ts", cache: false },
        deploy: { command: "wrangler deploy --config dist/server/wrangler.json", cache: false },
        release: {
          command: [
            "vp run --no-cache website#verify-release",
            "vp check",
            "vp run --no-cache -r test",
            "vp run --no-cache website#build",
            "vp run --no-cache website#verify-build",
            "vp run --no-cache website#deploy:check",
            "vp run --no-cache website#deploy",
          ],
          cwd: "../..",
          cache: false,
        },
        "deploy:check": {
          command: "wrangler deploy --config dist/server/wrangler.json --dry-run",
          cache: false,
        },
      },
    },
    define: {
      "import.meta.env.VITE_RESOURCE_BASE_URL": JSON.stringify(resources.resourceBaseUrl),
    },
    resolve: { tsconfigPaths: true },
    plugins: lazyPlugins(() => [
      resources.source === "local" && localResources(resources.directory),
      tailwindcss(),
      mode !== "test" && cloudflare({ viteEnvironment: { name: "ssr" } }),
      tanstackStart(),
      viteReact({ compiler: true }),
    ]),
  };
});

export default config;
