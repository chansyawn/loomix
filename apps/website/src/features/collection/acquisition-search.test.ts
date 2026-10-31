import { expect, test } from "vite-plus/test";
import { furnitureSearchSchema } from "../furniture/search";
import { clothingSearchSchema } from "../clothing/search";
import { plantsSearchSchema } from "../plants/search";

test("URL filters round trip acquisition without accepting the removed sources key", () => {
  for (const schema of [furnitureSearchSchema, clothingSearchSchema, plantsSearchSchema]) {
    const state = schema.parse({
      items: { acquisition: ["星屿探索（完成探索）"], sources: ["旧来源"] },
    });
    expect(state.items.acquisition).toEqual(["星屿探索（完成探索）"]);
    expect(state.items).not.toHaveProperty("sources");
    expect(schema.parse(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(schema.parse({ items: { sources: ["旧来源"] } }).items.acquisition).toEqual([]);
  }
});
