import { tagLabel } from "@loomix/schema/gameplay-tags";
import type { Vignettes } from "@loomix/schema/vignettes";
import { findVignetteUses } from "../vignettes/requirement-matching";
import { catalogEntryLocation } from "./entry-location";
import type { CatalogEntryRow, OmnidexCatalog } from "./catalog";
import { gameplayAnchor } from "./gameplay-anchors";

const vignetteLocation = (id: number) => ({
  to: "/vignettes/$id" as const,
  params: { id: String(id) },
});

export type GameplayUse = {
  id: number;
  name: string;
  image: string | null;
  destination: ReturnType<typeof catalogEntryLocation> | ReturnType<typeof vignetteLocation>;
  conditions: { hash: string; label: string; reason: string }[];
};

export const gameplayUseLabels = { crafting: "制作", cooking: "烹饪", vignette: "小栖地" };
export type GameplayUseCategory = keyof typeof gameplayUseLabels;

export function catalogGameplayUses(data: OmnidexCatalog, id: number) {
  const crafting: GameplayUse[] = (data.view.furnitureUsesByMaterialId.get(id) ?? []).map(
    ({ furniture, recipes }) => ({
      id: furniture.id,
      name: furniture.name,
      image: furniture.image,
      destination: catalogEntryLocation(furniture),
      conditions: recipes.map(({ id: recipeId, position, quantity }) => ({
        hash: gameplayAnchor("recipe", recipeId),
        label: `配方 ${position}`,
        reason: `指定材料 ×${quantity}`,
      })),
    }),
  );
  const cooking: GameplayUse[] = (data.ingredients.dishesByItemId.get(id) ?? []).map(
    ({ dish, conditions }) => ({
      id: dish.id,
      name: dish.name,
      image: dish.image,
      destination: catalogEntryLocation(dish),
      conditions: conditions.map(({ position, label }) => ({
        hash: gameplayAnchor("slot", position),
        label: `食材 ${position}`,
        reason: `候选食材 · ${label}`,
      })),
    }),
  );
  return { crafting, cooking };
}

export function vignetteGameplayUses(
  data: OmnidexCatalog,
  item: Extract<CatalogEntryRow["record"], { kind: string }>,
  { templates }: Vignettes,
): GameplayUse[] {
  return findVignetteUses(templates, item, data.tagIndex).map(({ template, conditions }) => ({
    id: template.id,
    name: template.name.zh,
    image: data.image(template.illustration),
    destination: vignetteLocation(template.id),
    conditions: conditions.map(({ position, role, target, label, quantity }) => ({
      hash: gameplayAnchor("requirement", position),
      label: `要求 ${position} · ${label}`,
      reason: [
        role === "摆放物" ? `${role} ×${quantity.displayed}` : role,
        "itemId" in target
          ? "指定物品"
          : target.allTagIds.map((id) => tagLabel(data.tagIndex.get(id))).join(" 且 "),
      ].join(" · "),
    })),
  }));
}

export function visibleGameplayUseCategories(
  uses: Record<GameplayUseCategory, readonly GameplayUse[]>,
) {
  const order: GameplayUseCategory[] = ["crafting", "cooking", "vignette"];
  return order.filter((category) => uses[category].length > 0);
}

export function activeGameplayUseCategory(
  categories: readonly GameplayUseCategory[],
  saved: GameplayUseCategory | undefined,
) {
  return saved && categories.includes(saved) ? saved : categories[0];
}
