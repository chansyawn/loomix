import { createAnimeStudio } from "./tool.ts";

export type { ExportOptions, ExtractionOptions } from "./types.ts";

export const { ensureAnimeStudio, exportAssets, buildAssetMap } = createAnimeStudio();
