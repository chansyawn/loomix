import path from "node:path";
import { parseArgs } from "node:util";
import { buildAssetMap } from "../lib/anime-studio/index.mjs";
import { profile, repoRoot } from "../tasks/items/scripts/config.mjs";

try {
  const args = process.argv.slice(2);
  const { values } = parseArgs({
    args: args[0] === "--" ? args.slice(1) : args,
    options: {
      help: { type: "boolean", short: "h" },
      input: { type: "string" },
      output: { type: "string" },
      game: { type: "string" },
    },
  });
  if (values.help) {
    console.log(
      "Generate XML Asset Map: node scripts/build-index.mjs [--input PATH] [--output DIR] [--game NAME]\nPaths are relative to the repository root. Defaults to the configured client and index directory.",
    );
  } else {
    const output = path.resolve(repoRoot, values.output ?? path.dirname(profile.paths.assetMap));
    const file = await buildAssetMap({
      input: values.input ?? profile.paths.gameRoot,
      output,
      game: values.game ?? profile.animeGame,
      logFile: path.join(output, "build-index.log"),
    });
    console.log(`Asset Map: ${file}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
