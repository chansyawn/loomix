import { notFound } from "@tanstack/react-router";
import type { FurnitureData } from "./data";
import { loadFurniture } from "./data";
import { membershipIndex } from "./query";
import type { View } from "./search";

export function parseFurnitureId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) throw notFound();
  return id;
}

export function furnitureDetail(data: FurnitureData, view: View, id: number) {
  if (view === "items") {
    const item = data.items.find((row) => row.id === id);
    if (!item) throw notFound();
    return {
      kind: "item" as const,
      record: item,
      sets: membershipIndex(data.sets).get(id) ?? [],
      recipes:
        item.craftingRecipes?.map((recipe) => ({
          ...recipe,
          materials:
            recipe.materials?.map((material) => ({
              ...material,
              item: data.ingredientItemsById?.get(material.itemId) ?? null,
            })) ?? null,
        })) ?? null,
    };
  }
  const set = data.sets.find((row) => row.id === id);
  if (!set) throw notFound();
  const items = new Map(data.items.map((item) => [item.id, item]));
  return {
    kind: "set" as const,
    record: set,
    items: set.componentIds === null ? null : set.componentIds.map((id) => items.get(id)!),
  };
}

export type FurnitureDetail = ReturnType<typeof furnitureDetail>;

export async function loadFurnitureDetail(view: View, value: string): Promise<FurnitureDetail> {
  const id = parseFurnitureId(value);
  return furnitureDetail(await loadFurniture(), view, id);
}
