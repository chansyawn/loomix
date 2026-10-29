import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["apps/website/src/routeTree.gen.ts"],
  },
  lint: {
    ignorePatterns: ["apps/website/src/routeTree.gen.ts"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }, "@shadcn/lint"],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "shadcn/no-restyle": ["warn", { allow: ["layout", "spacing"] }],
    },
    overrides: [
      {
        files: ["apps/website/src/ui/components/**"],
        rules: { "shadcn/no-restyle": "off" },
      },
    ],
    options: { typeAware: true, typeCheck: true },
  },
  run: {
    cache: {
      tasks: true,
      scripts: false,
    },
  },
});
