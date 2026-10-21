import path from "node:path";
import { getOptions, profile, repoRoot } from "../config.mjs";

export { profile };

export function getPaths() {
  const options = getOptions();
  return {
    out: options.output,
    gameRoot: path.resolve(repoRoot, profile.paths.gameRoot),
    clientIni: path.resolve(repoRoot, profile.paths.clientIni),
    assetMap: path.resolve(repoRoot, profile.paths.assetMap),
  };
}
