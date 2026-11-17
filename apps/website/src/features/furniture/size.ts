import type { ItemOf } from "@loomix/schema/catalog";

export function formatFurnitureSize(size: NonNullable<ItemOf<"furniture">["size"]>): string {
  return `${size.width.toFixed(1)}x${size.depth.toFixed(1)}`;
}
