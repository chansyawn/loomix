import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

export const repoRoot = fileURLToPath(new URL("../../../../../", import.meta.url));

// 此配置对应一个已验证的客户端快照；修改前需重新确认字段。
export const profile = {
  gameVersion: "0.95.2",
  branch: "live_0.95",
  dataRevision: 1379138,
  resourceRevision: 1359983,
  manifestId: "5662883",
  animeGame: "HYG_CB1",
  byteMask: 0x01350257,
  wordMask: 0x53020253,
  shortMask: 0x5555,
  assetPrefix: "assets/moleres/rel/sres/",
  roots: { textmap: 1, items: 318, ui: 325, types: 716, creatures: 186 },
  fields: {
    items: { id: 0, name: 1, type: 2, secondaryType: 3, category: 6, search: 7 },
    ui: { id: 0, smallIcon: 4, largeIcon: 5, description: 27 },
    types: { id: 0, name: 1 },
    creatures: { id: 0, name: 1, description: 6, galleryIcon: 11 },
    textmap: { wrapper: 0, count: 0, buckets: 3, values: 4, en: 0, zh: 1 },
  },
  paths: {},
  expected: {
    records: 6002,
    types: 101,
    textmap: 116673,
    tables: 724,
    icons: 3069,
    itemsWithIcon: 4564,
    iconBundles: 117,
    samples: {
      1101: "手工图桌",
      30130: "铁矿石",
      30225: "苹果树种子",
      41001: "三色锦鲤",
      44058: "蜜蜂",
      60772: "榴红背带裙",
      120086: "辣椒苗",
      2010044: "多果流彩捞饭",
    },
    oddStringItem: 4,
    oddString: "UISprite/Load/BigPic/DIYHandbook_TopicFurn/TopicFurn_Representative.png",
    longStringItem: 41001,
    longStringStart: "三色锦鲤是鲤鱼的变种。",
    longStringEnd: "“打回原形”。",
    prefixCollisionItem: 16,
    prefixCollisionName: "绵朵莉手作玩偶铺",
    prefixCollisionIcon: "UISprite/Load/BigPic/DIYHandbook_TopicFurn/TopicFurn_016.png",
  },
};

const clientDirectory = `resources/petit-planet-game/${profile.gameVersion}`;
const extractionDirectory = `resources/petit-planet-extraction/${profile.gameVersion}`;
Object.assign(profile.paths, {
  gameRoot: `${clientDirectory}/PetitPlanet_Data`,
  clientIni: `${clientDirectory}/config.ini`,
  assetMap: `${extractionDirectory}/index/assets_map.xml`,
  output: `${extractionDirectory}/items`,
});

// 命令行路径使用绝对路径或相对于仓库的路径，不以 process.cwd() 为基准。
export function getOptions(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: args[0] === "--" ? args.slice(1) : args,
    options: {
      help: { type: "boolean", short: "h" },
      step: { type: "string" },
      output: { type: "string" },
      baseline: { type: "string" },
    },
  });
  return {
    ...values,
    output: path.resolve(repoRoot, values.output ?? profile.paths.output),
    baseline: values.baseline ? path.resolve(repoRoot, values.baseline) : null,
  };
}

export function getPaths(options = getOptions()) {
  return {
    out: options.output,
    baseline: options.baseline,
    gameRoot: path.resolve(repoRoot, profile.paths.gameRoot),
    clientIni: path.resolve(repoRoot, profile.paths.clientIni),
    assetMap: path.resolve(repoRoot, profile.paths.assetMap),
  };
}
