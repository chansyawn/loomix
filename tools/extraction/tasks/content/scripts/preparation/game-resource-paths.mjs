import fs from "node:fs";
import path from "node:path";
import { getPaths, profile } from "./config.mjs";

export function activeConfigSource() {
  const { out } = getPaths();
  const file = path.join(out, "active-config-source.json");
  if (!fs.existsSync(file))
    throw new Error("Missing active-config-source.json; run select-config-source first");
  const source = JSON.parse(fs.readFileSync(file));
  if (
    source.dataRevision !== profile.dataRevision ||
    !source.files.every((f) => f.matchesManifest)
  ) {
    throw new Error("Config selection does not match the current verified profile");
  }
  return source;
}

export function getConfigFile(name) {
  return path.join(getPaths().gameRoot, activeConfigSource().relativeDirectory, name);
}
