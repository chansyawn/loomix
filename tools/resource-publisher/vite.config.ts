import { defineConfig } from "vite-plus";

export default defineConfig({
  run: { tasks: { publish: { command: "node src/cli.ts", cache: false } } },
});
