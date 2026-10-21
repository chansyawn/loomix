import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
export const cacheRoot = path.join(repoRoot, "resources/extraction-tools/anime-studio");
export const patchFile = fileURLToPath(new URL("./macos.patch", import.meta.url));

export const version = {
  revision: "e616e3f824f47dd68cfbd44977bf8584756ac446",
  sdk: "10.0.402",
  runtime: "10.0.13",
  windows: {
    url: "https://nightly.link/Escartem/AnimeStudio/actions/runs/37934375851/AnimeStudio-net10.zip",
    sha256: "054edf40d6daee6cf0b5fdb725c249562a5ab26d4c45e563999a1988768420b1",
  },
};

export function runtimeIdentifier(platform, architecture) {
  if (platform === "win32" && architecture === "x64") return "win-x64";
  if (platform === "darwin" && ["arm64", "x64"].includes(architecture))
    return `osx-${architecture}`;
  throw new Error(`Unsupported AnimeStudio platform: ${platform}/${architecture}`);
}
