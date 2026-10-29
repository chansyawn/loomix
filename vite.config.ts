import { defineConfig } from "vite-plus";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["apps/website/src/routeTree.gen.ts"],
  },
  lint: {
    ignorePatterns: ["apps/website/src/routeTree.gen.ts"],
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      "@shadcn/lint",
      "eslint-plugin-better-tailwindcss",
    ],
    settings: {
      "better-tailwindcss": {
        cwd: "apps/website",
        entryPoint: "src/styles.css",
      },
    },
    rules: {
      ...betterTailwindcss.configs.recommended.rules,
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
      "vite-plus/prefer-vite-plus-imports": "error",
      "shadcn/no-restyle": ["error", { allow: ["layout"] }],
      "shadcn/no-raw-colors": "warn",
      "shadcn/no-unknown-classes": "warn",
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
