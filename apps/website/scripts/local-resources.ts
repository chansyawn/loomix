import { cp } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite-plus";
import { validateWebsiteResources } from "@loomix/resources/website-resources";
import { localResourceMiddleware } from "./local-resource-server.ts";

export async function copyLocalResources(directory: string, output: string): Promise<void> {
  await validateWebsiteResources(directory);
  await cp(directory, path.join(output, "resources"), {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
}

export function localResources(directory: string): Plugin {
  return {
    name: "local-resources",
    configureServer(server) {
      server.middlewares.use(localResourceMiddleware(directory));
    },
    writeBundle: {
      sequential: true,
      async handler(options) {
        if (this.environment.name !== "client") return;
        if (!options.dir) throw new Error("Local resources require a client output directory");
        await copyLocalResources(directory, options.dir);
      },
    },
  };
}
