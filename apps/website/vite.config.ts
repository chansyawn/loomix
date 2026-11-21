import { defineConfig } from "vite-plus";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";
import { lazyPlugins } from "vite-plus";
import { localResources } from "./scripts/local-resources.ts";
import { repoRoot, resolveResourceConfig } from "./scripts/resource-config.ts";
import { builtResourceFile } from "./scripts/built-resource.ts";

const config = defineConfig(({ mode }) => {
  const resources = resolveResourceConfig(mode);
  return {
    envDir: repoRoot,
    run: {
      tasks: {
        "verify-release": { command: "node scripts/verify-release.ts", cache: false },
        "verify-build": { command: "node scripts/verify-build.ts", cache: false },
        "verify-contracts": { command: "node scripts/verify-contracts.ts", cache: false },
        deploy: {
          command:
            "node scripts/built-resource.ts && wrangler deploy --cwd ../.. --config apps/website/dist/server/wrangler.json",
          cache: false,
        },
        verify: {
          command: [
            "vp run website#verify-release",
            "vp check",
            "vp run test",
            "vp run website#build",
            "vp run website#verify-build",
            "vp run website#deploy:check",
          ],
          cwd: "../..",
          cache: false,
        },
        release: {
          command: ["vp run website#verify", "vp run website#deploy"],
          cwd: "../..",
          cache: false,
        },
        "deploy:check": {
          command:
            "wrangler deploy --cwd ../.. --config apps/website/dist/server/wrangler.json --dry-run",
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
      resources.source === "remote" && {
        name: "website-resource-version",
        apply: "build",
        generateBundle() {
          if (this.environment.name !== "client") return;
          this.emitFile({
            type: "asset",
            fileName: builtResourceFile,
            source: JSON.stringify({ resourceBaseUrl: resources.resourceBaseUrl }),
          });
        },
      },
      tailwindcss(),
      mode !== "test" && cloudflare({ viteEnvironment: { name: "ssr" } }),
      tanstackStart(),
      svgr(),
      viteReact({ compiler: true }),
    ]),
  };
});

export default config;
