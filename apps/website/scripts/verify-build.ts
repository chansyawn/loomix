import { existsSync, readFileSync } from "node:fs";
import { builtResourceFile } from "./built-resource.ts";

const client = new URL("../dist/client/", import.meta.url);
if (!existsSync(new URL("logo.png", client))) {
  throw new Error("Website logo is missing from the client build");
}
JSON.parse(readFileSync(new URL("manifest.webmanifest", client), "utf8"));
for (const icon of ["icons/app-192.png", "icons/app-512.png", "icons/apple-touch-icon.png"]) {
  if (!existsSync(new URL(icon, client))) {
    throw new Error(`Website app icon is missing from the client build: ${icon}`);
  }
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
