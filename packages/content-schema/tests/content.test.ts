import { expect, expectTypeOf, test } from "vite-plus/test";
import { z } from "zod";
import {
  ContentSchema,
  additionalFields,
  basicFields,
  contentGroups,
  emptyContent,
  groupAt,
  parseContent,
} from "../src/index.ts";
import type { Content, CreatureItem, FurnitureItem, FurnitureSet } from "../src/index.ts";

function fixture(): Content {
  const base = { name: " 名称 ", image: null, description: null, quality: 0 };
  return {
    furniture: {
      sets: [{ ...base, id: 1, seriesName: null, componentIds: [3, 2] }],
      items: [3, 2].map((id) => ({
        ...base,
        id,
        category: null,
        type: null,
        size: "2.0x1.0",
        colors: null,
        materials: "金属，木制",
        sources: null,
      })),
    },
    creatures: {
      series: [{ ...base, id: 4, seriesName: null, creatureIds: [5] }],
      items: [
        {
          ...base,
          id: 5,
          category: null,
          region: null,
          habitat: null,
          activeSeasons: "春季，夏季",
          activeTimes: null,
          activeWeather: null,
          sizeRange: null,
        },
      ],
    },
    plants: {
      series: [{ ...base, id: 6, seriesName: null, plantIds: [7] }],
      items: [
        {
          ...base,
          id: 7,
          category: null,
          originGalaxy: null,
          maturityPeriod: null,
          harvestCount: 0,
        },
      ],
    },
    dishes: {
      series: [{ ...base, id: 8, seriesName: null, dishIds: [9] }],
      items: [
        {
          ...base,
          id: 9,
          difficulty: null,
          galaxyFlavor: null,
          cookware: null,
          effects: "增加 30 力气",
        },
      ],
    },
    clothing: {
      sets: [{ ...base, id: 10, setName: null, componentIds: [11] }],
      items: [
        {
          ...base,
          id: 11,
          category: null,
          colors: null,
          materials: null,
          styles: null,
          sources: null,
        },
      ],
      appearances: [{ ...base, id: 12, category: null }],
    },
    miscellaneous: [{ ...base, id: 13, image: `assets/${"a".repeat(64)}.png` }],
  };
}

test("all groups preserve strings, nulls, zero values and input ordering", () => {
  const content = fixture();
  const before = fixture();
  expect(ContentSchema.parse(content)).toEqual(before);
  expect(parseContent(content)).toEqual(before);
  expect(content).toEqual(before);
  expect(contentGroups).toHaveLength(12);
  for (const group of contentGroups) expect(groupAt(content, group).length).toBeGreaterThan(0);
  expect(parseContent(emptyContent())).toEqual(emptyContent());
});

test("null and empty memberships are accepted without inventing members", () => {
  const content = fixture();
  content.furniture.sets[0].componentIds = null;
  content.creatures.series[0].creatureIds = [];
  content.plants.items[0].harvestCount = null;
  content.miscellaneous[0].quality = null;
  expect(parseContent(content)).toEqual(content);
});

const invalidCases: [string, (content: Content) => void, (string | number)[]][] = [
  [
    "missing root group",
    (c) => {
      Reflect.deleteProperty(c, "plants");
    },
    ["plants"],
  ],
  [
    "extra root field",
    (c) => {
      Reflect.set(c, "version", "0.95.2");
    },
    [],
  ],
  [
    "extra subgroup",
    (c) => {
      Reflect.set(c.furniture, "series", []);
    },
    ["furniture"],
  ],
  [
    "missing subgroup",
    (c) => {
      Reflect.deleteProperty(c.clothing, "appearances");
    },
    ["clothing", "appearances"],
  ],
  [
    "missing record field",
    (c) => {
      Reflect.deleteProperty(c.miscellaneous[0], "description");
    },
    ["miscellaneous", 0, "description"],
  ],
  [
    "extra record field",
    (c) => {
      Reflect.set(c.miscellaneous[0], "source", "extra");
    },
    ["miscellaneous", 0],
  ],
  [
    "invalid group type",
    (c) => {
      Reflect.set(c.furniture, "items", {});
    },
    ["furniture", "items"],
  ],
  [
    "empty name",
    (c) => {
      c.miscellaneous[0].name = "";
    },
    ["miscellaneous", 0, "name"],
  ],
  [
    "null name",
    (c) => {
      Reflect.set(c.miscellaneous[0], "name", null);
    },
    ["miscellaneous", 0, "name"],
  ],
  [
    "array display value",
    (c) => {
      Reflect.set(c.furniture.items[0], "materials", ["金属"]);
    },
    ["furniture", "items", 0, "materials"],
  ],
  [
    "negative ID",
    (c) => {
      c.miscellaneous[0].id = -1;
    },
    ["miscellaneous", 0, "id"],
  ],
  [
    "fractional ID",
    (c) => {
      c.miscellaneous[0].id = 1.5;
    },
    ["miscellaneous", 0, "id"],
  ],
  [
    "unsafe ID",
    (c) => {
      c.miscellaneous[0].id = Number.MAX_SAFE_INTEGER + 1;
    },
    ["miscellaneous", 0, "id"],
  ],
  [
    "invalid image",
    (c) => {
      c.miscellaneous[0].image = `assets/${"A".repeat(64)}.png`;
    },
    ["miscellaneous", 0, "image"],
  ],
  [
    "invalid quality",
    (c) => {
      c.miscellaneous[0].quality = 5;
    },
    ["miscellaneous", 0, "quality"],
  ],
  [
    "negative quality",
    (c) => {
      c.miscellaneous[0].quality = -1;
    },
    ["miscellaneous", 0, "quality"],
  ],
  [
    "fractional quality",
    (c) => {
      c.miscellaneous[0].quality = 1.5;
    },
    ["miscellaneous", 0, "quality"],
  ],
  [
    "negative harvest count",
    (c) => {
      c.plants.items[0].harvestCount = -1;
    },
    ["plants", "items", 0, "harvestCount"],
  ],
  [
    "fractional harvest count",
    (c) => {
      c.plants.items[0].harvestCount = 1.5;
    },
    ["plants", "items", 0, "harvestCount"],
  ],
  [
    "duplicate ID across groups",
    (c) => {
      c.miscellaneous[0].id = 2;
    },
    ["miscellaneous", 0, "id"],
  ],
  [
    "duplicate ID within group",
    (c) => {
      c.miscellaneous.push({ ...c.miscellaneous[0] });
    },
    ["miscellaneous", 1, "id"],
  ],
  [
    "duplicate member",
    (c) => {
      c.furniture.sets[0].componentIds = [2, 2];
    },
    ["furniture", "sets", 0, "componentIds", 1],
  ],
  [
    "missing member",
    (c) => {
      c.creatures.series[0].creatureIds = [999];
    },
    ["creatures", "series", 0, "creatureIds", 0],
  ],
  [
    "wrong member category",
    (c) => {
      c.plants.series[0].plantIds = [5];
    },
    ["plants", "series", 0, "plantIds", 0],
  ],
  [
    "dish member is a series",
    (c) => {
      c.dishes.series[0].dishIds = [8];
    },
    ["dishes", "series", 0, "dishIds", 0],
  ],
  [
    "clothing member is an appearance",
    (c) => {
      c.clothing.sets[0].componentIds = [12];
    },
    ["clothing", "sets", 0, "componentIds", 0],
  ],
  [
    "invalid member ID",
    (c) => {
      c.furniture.sets[0].componentIds = [0];
    },
    ["furniture", "sets", 0, "componentIds", 0],
  ],
];

test.each(invalidCases)("rejects %s with the offending path", (_name, mutate, path) => {
  const content = fixture();
  mutate(content);
  const result = ContentSchema.safeParse(content);
  expect(result.success).toBe(false);
  if (result.success) throw new Error("Invalid fixture accepted");
  expect(result.error.issues.map((issue) => issue.path)).toContainEqual(path);
  expect(() => parseContent(content)).toThrow(z.ZodError);
});

test("field lists and typed group access expose the existing contract", () => {
  const content = fixture();
  expect(basicFields).toEqual(["name", "image", "description", "id", "quality"]);
  expect(additionalFields["furniture.items"]).toEqual([
    "category",
    "type",
    "size",
    "colors",
    "materials",
    "sources",
  ]);
  expect(additionalFields.miscellaneous).toEqual([]);
  expectTypeOf(groupAt(content, "furniture.items")).toEqualTypeOf<FurnitureItem[]>();
  expectTypeOf(groupAt(content, "furniture.sets")).toEqualTypeOf<FurnitureSet[]>();
  expectTypeOf(groupAt(content, "creatures.items")).toEqualTypeOf<CreatureItem[]>();
  expectTypeOf(parseContent(content)).toEqualTypeOf<Content>();
});
