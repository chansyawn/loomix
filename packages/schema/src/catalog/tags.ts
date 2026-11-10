import type { GameplayTagIndex } from "../gameplay-tags/index.ts";
import type { CatalogRecord } from "./index.ts";

const facets = {
  colors: "颜色",
  materials: "材质",
  styles: "艺术风格",
  size: "尺寸",
  origins: "产区分类",
} as const;

export function createRecordTagResolver(index: GameplayTagIndex) {
  return (record: Pick<CatalogRecord, "tagIds">, facet: keyof typeof facets) => {
    const root = index.findByName(facets[facet]);
    return root ? index.select(record.tagIds, root.id) : [];
  };
}
