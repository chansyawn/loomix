import { createImageResolver, type ImageIndex } from "@loomix/schema/assets";
import {
  createRecordTagResolver,
  isListedItem,
  type Catalog,
  type Collection,
  type Item,
  type ListedItem,
} from "@loomix/schema/catalog";
import { createGameplayTagIndex, tagLabel } from "@loomix/schema/gameplay-tags";
import type { GameplayTags } from "@loomix/schema/gameplay-tags";
import { catalogCategory, toOmnidexView } from "../omnidex-view";
import { acquisitionText } from "../omnidex/acquisition";
import { createOmnidexTagFilter, type TagTreePolicy } from "./tags";
import { buildIngredientsData, type IngredientsData } from "../ingredients/model";

export const categoryNames = {
  furniture: "家具",
  clothing: "服饰",
  neighborOutfit: "友邻服饰",
  creatures: "生物",
  plants: "植物",
  dishes: "烹饪",
  miscellaneous: "杂物",
};

export type ListedEntry = Exclude<ListedItem, { kind: "inspoCard" }> | Collection;

export function hasCatalogItemDetail(
  item: Item,
): item is Exclude<ListedItem, { kind: "inspoCard" }> {
  return isListedItem(item) && item.kind !== "inspoCard";
}

export function createOmnidexCatalog(
  catalog: Catalog,
  imageIndex: ImageIndex,
  gameplayTags: GameplayTags,
  options: { tagPolicy?: TagTreePolicy } = {},
) {
  const image = createImageResolver(imageIndex);
  const tagIndex = createGameplayTagIndex(gameplayTags.tags);
  const tagsFor = createRecordTagResolver(tagIndex);
  const items = catalog.items.filter(hasCatalogItemDetail);
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
  const view = toOmnidexView(catalog, imageIndex, tagIndex);
  let ingredients: IngredientsData | undefined;
  return {
    catalog,
    tagIndex,
    image,
    tags: createOmnidexTagFilter(gameplayTags.tags, tagIndex, items, options.tagPolicy),
    rows,
    byId: new Map(rows.map((entry) => [entry.id, entry])),
    view,
    get ingredients() {
      return (ingredients ??= buildIngredientsData(view));
    },
  };
}
export type OmnidexCatalog = ReturnType<typeof createOmnidexCatalog>;
export type CatalogEntryRow = OmnidexCatalog["rows"][number];
export function recordFields(row: CatalogEntryRow): [string, string | null][] {
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
