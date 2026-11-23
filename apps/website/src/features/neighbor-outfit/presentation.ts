import type { BodyType } from "@loomix/schema/catalog";

const bodyTypeNames = { small: "小型", medium: "中型", big: "大型" } as const;

export function formatNeighborOutfitBodyTypes(bodyTypes: readonly BodyType[]): string {
  return bodyTypes.map((type) => bodyTypeNames[type]).join("、");
}

export function formatNeighborOutfitPrice(price: number | null): string | null {
  return price === null ? null : `${price} 友邻服饰币`;
}
