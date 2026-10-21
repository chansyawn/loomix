import { errorMessage } from "../lib/errors.ts";
import { ensureAnimeStudio } from "../lib/anime-studio/index.ts";
import { parseArgs } from "node:util";

try {
  const args = process.argv.slice(2);
  const { values } = parseArgs({
    args: args[0] === "--" ? args.slice(1) : args,
    options: { help: { type: "boolean", short: "h" } },
  });
  if (values.help)
    console.log(
      "Prepare the pinned AnimeStudio CLI and local runtime for the current platform: node scripts/init-tools.ts",
    );
  else {
    await ensureAnimeStudio();
    console.log("AnimeStudio is ready.");
  }
} catch (error) {
  console.error(errorMessage(error));
  process.exitCode = 1;
}
