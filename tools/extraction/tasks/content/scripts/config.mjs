import path from "node:path";
import crypto from "node:crypto";
import { parseArgs } from "node:util";
import { profile as itemProfile, repoRoot } from "../../items/scripts/config.mjs";

export { repoRoot };
export const profile = {
  ...itemProfile,
  roots: {
    ...itemProfile.roots,
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
    ...itemProfile.fields,
    content: { id: 0, appearanceFlag: 1, displayScale: 17 },
    ui: {
      ...itemProfile.fields.ui,
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
