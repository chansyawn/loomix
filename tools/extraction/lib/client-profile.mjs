import { fileURLToPath } from "node:url";

export const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

// 各提取入口共用的客户端快照与资源路径。
export const profile = {
  gameVersion: "0.95.2",
  branch: "live_0.95",
  dataRevision: 1379138,
  resourceRevision: 1359983,
  manifestId: "5662883",
  animeGame: "HYG_CB1",
  paths: {},
};

const clientDirectory = "resources/game-client";
Object.assign(profile.paths, {
  gameRoot: `${clientDirectory}/PetitPlanet_Data`,
  clientIni: `${clientDirectory}/config.ini`,
  assetMap: "resources/temp/extraction/index/assets_map.xml",
});
