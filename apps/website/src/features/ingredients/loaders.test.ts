import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { CreatureItem, MiscellaneousItem } from "../collection-view";
import { catalogFixture, fixtureRequest } from "../collection-fixture";
import { plantItemFixture, plantsDataFixture } from "../plants/fixture";
import { loadPlantsDetail } from "../plants/detail";
import { loadCreaturesDetail } from "../creatures/detail";
import { loadMiscellanyDetail } from "../miscellany/detail";
import { loadDishes } from "../dishes/data";
import { loadIngredientCategoryDetail } from "./detail";
import { categoryExpression, recipeFixture, recipeSlot } from "./fixture";

function setupResources() {
  const plant = plantItemFixture({ id: 1, name: "番茄" });
  const creature: CreatureItem = {
    id: 2,
    name: "草鱼",
    image: null,
    description: null,
    quality: null,
    category: null,
    scientificName: null,
    sources: null,
    region: null,
    habitat: null,
    activeSeasons: null,
    activeTimes: null,
    activeWeather: null,
    sizeRange: null,
  };
  const material: MiscellaneousItem = {
    id: 3,
    name: "奶",
    image: null,
    description: null,
    quality: null,
    acquisition: null,
  };
  const catalog = catalogFixture({
    ingredientCategories: [
      { id: 10, name: "食材", tagName: "食材", parentId: null, itemIds: [1, 2, 3] },
      { id: 11, name: "测试食材类", tagName: "食材_测试", parentId: 10, itemIds: [1, 2, 3] },
    ],
    plants: plantsDataFixture({ items: [plant], series: [] }),
    creatures: { items: [creature], series: [] },
    miscellaneous: [material],
    dishes: {
      items: [recipeFixture(100, { slots: [recipeSlot(categoryExpression(11), [1, 2, 3])] })],
      series: [],
    },
  });
  const request = vi.fn(fixtureRequest(catalog));
  vi.stubGlobal("fetch", request);
  return request;
}

afterEach(() => vi.unstubAllGlobals());

describe("ingredient data loading", () => {
  it("shares one validated resource load with cooking list and category detail indexes", async () => {
    const request = setupResources();
    const dishes = await loadDishes();
    expect(dishes.ingredients.itemsById.size).toBe(3);
    expect(request).toHaveBeenCalledTimes(3);
    request.mockClear();
    const category = await loadIngredientCategoryDetail("11");
    expect(category.items.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(category.dishes.map((match) => match.dish.id)).toEqual([100]);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("adds cooking usage to existing plant, creature and miscellaneous detail routes without separate requests", async () => {
    const request = setupResources();
    const plant = await loadPlantsDetail("items", "1");
    expect(plant.kind === "item" && plant.cooking?.dishes[0].dish.id).toBe(100);
    expect(request).toHaveBeenCalledTimes(3);
    request.mockClear();
    const creature = await loadCreaturesDetail("items", "2");
    expect(creature.kind === "item" && creature.cooking?.dishes[0].dish.id).toBe(100);
    expect(request).toHaveBeenCalledTimes(3);
    request.mockClear();
    const material = await loadMiscellanyDetail("3");
    expect(material.record.id).toBe(3);
    expect(material.cooking?.dishes[0].dish.id).toBe(100);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("rejects invalid category addresses before fetching and keeps resource failures retryable", async () => {
    const request = setupResources();
    await expect(loadIngredientCategoryDetail("01")).rejects.toBeDefined();
    expect(request).not.toHaveBeenCalled();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(loadIngredientCategoryDetail("11")).rejects.toThrow("503");
  });
});
