import { createGameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { isNotFound } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { imageIndexFixture, catalogFixture, fixtureRequest } from "../omnidex-fixture.ts";
import { toOmnidexView } from "../omnidex-view.ts";
import type { FurnitureItem, MiscellaneousItem } from "../omnidex-view.ts";
import type { InspoCardView } from "../omnidex/inspo-card.ts";
import { plantItemFixture, plantsDataFixture } from "../plants/fixture";
import { categoryExpression, recipeFixture, recipeSlot } from "../ingredients/fixture";
import {
  buildMiscellaneousDetail,
  findMiscellaneousDetail,
  loadMiscellaneousDetail,
  parseMiscellaneousId,
} from "./detail";

const item: MiscellaneousItem = {
  id: 30031,
  name: "树胶",
  image: null,
  description: "良好的黏合剂。",
  quality: 1,
  acquisition: "沙滩拾取",
};
const data = [item];

function furnitureFixture(
  id: number,
  recipes: Pick<InspoCardView, "id" | "materials">[],
): FurnitureItem {
  return {
    id,
    name: `家具${id}`,
    image: null,
    description: null,
    quality: null,
    category: null,
    furnitureCategory: null,
    size: null,
    colors: null,
    materials: item.name,
    acquisition: null,
    inspoCards: recipes.map((recipe) => ({
      ...recipe,
      name: `创想卡 ${recipe.id}`,
      inspoBoxName: null,
      face: {
        background: { file: `assets/${"a".repeat(64)}.webp`, width: 390, height: 560 },
        foreground: `assets/${"b".repeat(64)}.webp`,
        quality: null,
      },
    })),
  };
}

function relatedCatalog() {
  const drop = { itemId: item.id, source: "fruit" as const };
  return catalogFixture({
    miscellaneous: [item, { ...item, id: 30032, name: "其他材料" }],
    plants: plantsDataFixture({
      items: [
        plantItemFixture({
          id: 2,
          name: "杉树",
          treeDrops: [drop, { ...drop, source: "felling" }],
        }),
        plantItemFixture({ id: 1, name: "银杏树", treeDrops: [drop] }),
        plantItemFixture({ id: 3, name: "无掉落树木" }),
      ],
      series: [],
    }),
    furniture: {
      items: [
        furnitureFixture(100, [
          { id: 11, materials: [{ itemId: 30032, quantity: 9 }] },
          { id: 12, materials: [{ itemId: item.id, quantity: 3 }] },
          { id: 13, materials: [{ itemId: item.id, quantity: 5 }] },
        ]),
        furnitureFixture(101, [
          { id: 14, materials: [{ itemId: item.id, quantity: 2 }] },
          { id: 15, materials: [{ itemId: item.id, quantity: 2 }] },
        ]),
        furnitureFixture(103, []),
        furnitureFixture(104, [{ id: 16, materials: null }]),
        furnitureFixture(105, [{ id: 17, materials: [{ itemId: 100, quantity: 1 }] }]),
      ],
      sets: [],
    },
    ingredientCategories: [
      { id: 10, name: "食材", tagName: "食材", parentId: null, itemIds: [item.id] },
      { id: 11, name: "原料", tagName: "食材_原料", parentId: 10, itemIds: [item.id] },
    ],
    dishes: {
      items: [recipeFixture(900, [recipeSlot(categoryExpression(11), [item.id])])],
      series: [],
    },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("miscellaneous details", () => {
  it("accepts positive safe integer IDs and rejects malformed addresses", () => {
    expect(parseMiscellaneousId("30031")).toBe(30031);
    for (const value of ["0", "-1", "1.5", "1e2", "01", "", "abc", "9007199254740992"]) {
      try {
        parseMiscellaneousId(value);
        throw new Error("Expected not found");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });

  it("loads matching records and treats unknown IDs as not found", () => {
    expect(findMiscellaneousDetail(data, "30031")).toEqual(item);
    try {
      findMiscellaneousDetail(data, "30032");
      throw new Error("Expected not found");
    } catch (error) {
      expect(isNotFound(error)).toBe(true);
    }
  });

  it("keeps resource and schema failures retryable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(fixtureRequest(catalogFixture({ miscellaneous: data }))),
    );
    expect(await loadMiscellaneousDetail("30031")).toEqual({
      record: item,
      sourceTrees: [],
      cooking: null,
      furnitureUses: [],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(loadMiscellaneousDetail("30031")).rejects.toThrow("503");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await expect(loadMiscellaneousDetail("30031")).rejects.toThrow();
  });

  it("resolves source trees in catalog order without repeating a tree for multiple drop groups", () => {
    const { catalog, gameplayTags } = relatedCatalog();
    const collection = toOmnidexView(
      catalog,
      imageIndexFixture(catalog),
      createGameplayTagIndex(gameplayTags.tags),
    );
    const detail = buildMiscellaneousDetail(collection, item.id);
    expect(detail.sourceTrees.map((tree) => [tree.id, tree.name])).toEqual([
      [2, "杉树"],
      [1, "银杏树"],
    ]);
    expect(detail.sourceTrees.every((tree) => tree.catalogCategory === "plants")).toBe(true);
    expect(buildMiscellaneousDetail(collection, 30032).sourceTrees).toEqual([]);
  });

  it("lists only direct furniture uses once and preserves every matching recipe's position and quantity", () => {
    const { catalog, gameplayTags } = relatedCatalog();
    const collection = toOmnidexView(
      catalog,
      imageIndexFixture(catalog),
      createGameplayTagIndex(gameplayTags.tags),
    );
    const detail = buildMiscellaneousDetail(collection, item.id);
    expect(
      detail.furnitureUses.map(({ furniture, recipes }) => ({ id: furniture.id, recipes })),
    ).toEqual([
      {
        id: 100,
        recipes: [
          { id: 12, position: 2, quantity: 3 },
          { id: 13, position: 3, quantity: 5 },
        ],
      },
      {
        id: 101,
        recipes: [
          { id: 14, position: 1, quantity: 2 },
          { id: 15, position: 2, quantity: 2 },
        ],
      },
    ]);
    expect(
      buildMiscellaneousDetail(collection, 30032).furnitureUses.map(
        ({ furniture }) => furniture.id,
      ),
    ).toEqual([100]);
    try {
      buildMiscellaneousDetail(collection, 999);
      throw new Error("Expected not found");
    } catch (error) {
      expect(isNotFound(error)).toBe(true);
    }
  });

  it("loads tree sources, furniture uses and cooking uses together from the existing resources", async () => {
    vi.stubGlobal("fetch", vi.fn(fixtureRequest(relatedCatalog())));
    const detail = await loadMiscellaneousDetail(String(item.id));
    expect(detail.record).toEqual(item);
    expect(detail.sourceTrees.map((tree) => tree.id)).toEqual([2, 1]);
    expect(detail.furnitureUses.map(({ furniture }) => furniture.id)).toEqual([100, 101]);
    expect(detail.cooking?.dishes.map(({ dish }) => dish.id)).toEqual([900]);
  });
});
