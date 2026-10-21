import { fileURLToPath } from "node:url";

export const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

// 各提取入口共用的客户端快照与资源路径。
export const profile = {
  gameVersion: "0.95.2",
  branch: "live_0.95",
  dataRevision: 1449213,
  resourceRevision: 1391927,
  manifestId: "5662883",
  animeGame: "HYG_CB1",
  paths: {
    gameRoot: "resources/game-client/PetitPlanet_Data",
    clientIni: "resources/game-client/config.ini",
    assetMap: "resources/temp/extraction/index/assets_map.xml",
  },
};
