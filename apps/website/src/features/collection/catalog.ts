import { createImageResolver, type Assets } from "@loomix/schema/assets";
import {
  createRecordTagResolver,
  isListedItem,
  type Catalog,
  type Collection,
  type ListedItem,
} from "@loomix/schema/catalog";
import { createGameplayTagIndex, tagLabel } from "@loomix/schema/gameplay-tags";
import type { GameplayTags } from "@loomix/schema/gameplay-tags";
import { catalogCategory, toCollectionView } from "../collection-view";
import { acquisitionText } from "../collection/acquisition";
import { createCollectionTagFilter, type TagTreePolicy } from "./tags";

export const categoryNames = {
  furniture: "家具",
  clothing: "服饰",
  neighborClothing: "友邻服饰",
  creatures: "生物",
  plants: "植物",
  dishes: "烹饪",
  miscellaneous: "杂物",
};

export type ListedEntry = Exclude<ListedItem, { kind: "creationCard" }> | Collection;

export function createCollectionCatalog(
  catalog: Catalog,
  assets: Assets,
  gameplayTags: GameplayTags,
  options: { tagPolicy?: TagTreePolicy } = {},
) {
  const image = createImageResolver(assets);
  const tagIndex = createGameplayTagIndex(gameplayTags.tags);
  const tagsFor = createRecordTagResolver(tagIndex);
  const items = catalog.items.filter(isListedItem).filter((item) => item.kind !== "creationCard");
  const row = (record: ListedEntry) => {
    const tagIds = "tagIds" in record ? record : { tagIds: [] };
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      image: image(record.image),
      quality: record.quality,
      category: catalogCategory(record),
      colors: tagsFor(tagIds, "colors").map(tagLabel),
      materials: tagsFor(tagIds, "materials").map(tagLabel),
      styles: tagsFor(tagIds, "styles").map(tagLabel),
      acquisition: record.acquisition,
      acquisitionText: acquisitionText(record.acquisition),
      record,
    };
  };
  const rows = [...items, ...catalog.collections].map(row).sort((a, b) => a.id - b.id);
  return {
    catalog,
    tags: createCollectionTagFilter(gameplayTags.tags, tagIndex, items, options.tagPolicy),
    rows,
    byId: new Map(rows.map((entry) => [entry.id, entry])),
    view: toCollectionView(catalog, assets, tagIndex),
  };
}
export type CollectionCatalog = ReturnType<typeof createCollectionCatalog>;
export type OverviewRecord = CollectionCatalog["rows"][number];
export function recordFields(row: OverviewRecord): [string, string | null][] {
  return [
    ["编号", String(row.id)],
    ["类别", categoryNames[row.category]],
    ...(
      [
        ["颜色", row.colors],
        ["材质", row.materials],
        ["风格", row.styles],
      ] as const
    )
      .filter(([, values]) => values.length)
      .map(([label, values]): [string, string] => [label, values.join("，")]),
    ["获取来源", row.acquisitionText],
  ];
}
