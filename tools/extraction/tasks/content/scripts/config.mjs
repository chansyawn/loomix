import path from "node:path";
import crypto from "node:crypto";
import { parseArgs } from "node:util";
import { profile as clientProfile, repoRoot } from "../../../lib/client-profile.mjs";

export { repoRoot };
export const profile = {
  ...clientProfile,
  // 解码布局和验收数量对应此客户端快照；更新版本时需重新核对。
  byteMask: 0x01350257,
  wordMask: 0x53020253,
  shortMask: 0x5555,
  assetPrefix: "assets/moleres/rel/sres/",
  roots: {
    textmap: 1,
    items: 318,
    ui: 325,
    types: 716,
    creatures: 186,
    content: 93,
    categories: 33,
    qualities: 83,
    recipeDifficulty: 121,
    recipes: 122,
    cookware: 126,
    creatureScale: 132,
    habits: 134,
    habitats: 135,
    crops: 144,
    furniture: 262,
    furnitureTypes: 265,
    clothing: 519,
    sources: 618,
  },
  fields: {
    items: { id: 0, name: 1, type: 2, secondaryType: 3, category: 6, search: 7 },
    types: { id: 0, name: 1 },
    creatures: { id: 0, name: 1, description: 6, galleryIcon: 11 },
    textmap: { wrapper: 0, count: 0, buckets: 3, values: 4, en: 0, zh: 1 },
    content: { id: 0, appearanceFlag: 1, displayScale: 17 },
    ui: {
      id: 0,
      smallIcon: 4,
      largeIcon: 5,
      description: 27,
      sources: 2,
      quality: 15,
      habitat: 30,
      region: 31,
      times: 32,
      weather: 33,
      seasons: 34,
      series: 35,
    },
    furniture: { id: 0, series: 9 },
    clothing: { id: 0, series: 9 },
    crops: { id: 0, name: 1, stages: 4, harvests: 5, products: 10 },
  },
  binData: { tags: "633e15d6", tagDisplay: "b429c67e", creatureDisplay: "15896ba2" },
  expected: { textmap: 116673, tables: 724 },
  expectedContent: {
    "furniture.sets": 42,
    "furniture.items": 887,
    "creatures.series": 27,
    "creatures.items": 317,
    "plants.series": 31,
    "plants.items": 202,
    "dishes.series": 9,
    "dishes.items": 121,
    "clothing.sets": 34,
    "clothing.items": 590,
    "clothing.appearances": 51,
    miscellaneous: 16,
  },
};

export const steps = ["prepare", "structure", "assets", "audit", "validate", "publish"];

export function getOptions(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: args[0] === "--" ? args.slice(1) : args,
    options: {
      help: { type: "boolean", short: "h" },
      step: { type: "string" },
      output: { type: "string" },
    },
  });
  const output = path.resolve(
    repoRoot,
    values.output ?? `resources/petit-planet-extraction/${profile.gameVersion}/content`,
  );
  const key = crypto.createHash("sha256").update(output.toLowerCase()).digest("hex").slice(0, 16);
  const work = path.resolve(repoRoot, `resources/temp/content/${profile.gameVersion}/${key}`);
  return { ...values, output, work };
}
