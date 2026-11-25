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
  conditions: { hash: string; summary: string; linkLabel: string }[];
};

export const gameplayUseLabels = { crafting: "制作", cooking: "烹饪", vignette: "小栖地" };
export type GameplayUseCategory = keyof typeof gameplayUseLabels;

export function catalogGameplayUses(data: OmnidexCatalog, id: number) {
  const materialName = data.byId.get(id)?.name ?? "此材料";
  const crafting: GameplayUse[] = (data.view.furnitureUsesByMaterialId.get(id) ?? []).map(
    ({ furniture, recipes }) => ({
      id: furniture.id,
      name: furniture.name,
      image: furniture.image,
      destination: catalogEntryLocation(furniture),
      conditions: recipes.map(({ id: recipeId, name, quantity }) => ({
        hash: gameplayAnchor("recipe", recipeId),
        summary: `需要${materialName} ×${quantity}`,
        linkLabel: furniture.inspoCards.length === 1 ? "查看制作配方" : `查看配方 · ${name}`,
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
        summary: `可用作第 ${position} 个食材`,
        linkLabel: `查看食材 ${position} · ${label}`,
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
    conditions: conditions.map(({ position, role, target, label, quantity }) => {
      const isSupport = role === "承载物";
      const isSpecified = "itemId" in target;
      const usage = isSpecified ? `指定${role}` : `可作为${role}`;
      const destination = `查看第 ${position} 条布景要求${isSupport ? "的承载物" : ""}`;
      const tags = isSpecified
        ? ""
        : target.allTagIds.map((id) => tagLabel(data.tagIndex.get(id))).join(" 且 ");
      return {
        hash: gameplayAnchor(isSupport ? "vignette-support" : "requirement", position),
        summary: isSupport ? usage : `${usage} ×${quantity.displayed}`,
        linkLabel: [destination, label, tags].filter(Boolean).join(" · "),
      };
    }),
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
