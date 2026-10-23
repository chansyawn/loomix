import path from "node:path";
import { parseArgs } from "node:util";
import { profile } from "../../profile.ts";
import { repoRoot } from "../../paths.ts";

export { repoRoot, profile };

export function getOptions(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: { output: { type: "string" } } });
  if (!values.output) throw new Error("Internal preparation output is required");
  return { output: path.resolve(repoRoot, values.output) };
}
