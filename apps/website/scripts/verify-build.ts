import { existsSync } from "node:fs";
import { builtResourceFile } from "./built-resource.ts";

const client = new URL("../dist/client/", import.meta.url);
if (!existsSync(new URL("logo.png", client))) {
  throw new Error("Website logo is missing from the client build");
}
if (existsSync(new URL("resources/", client))) {
  throw new Error("Production deployment must not include local resources");
}
if (!existsSync(new URL(builtResourceFile, client))) {
  throw new Error("Resource version file is missing from the client build");
}
if (!existsSync(new URL("../server/wrangler.json", client))) {
  throw new Error("Worker build configuration is missing");
}
console.log("Verified production static assets and Worker build configuration");
