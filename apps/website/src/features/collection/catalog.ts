import { createImageResolver, type Assets } from "@loomix/schema/assets";
import {
  recordCategory,
  recordTarget,
  createRecordTagResolver,
  type Catalog,
  type CatalogRecord,
} from "@loomix/schema/catalog";
import { createGameplayTagIndex, tagLabel } from "@loomix/schema/gameplay-tags";
import type { GameplayTags } from "@loomix/schema/gameplay-tags";
import { toCollectionView } from "../collection-view";
import { acquisitionText } from "../collection/acquisition";
import { createCollectionTagFilter } from "./tags";

export const categoryNames = {
  furniture: "家具",
  clothing: "服饰",
  neighborClothing: "友邻服饰",
  creatures: "生物",
  plants: "植物",
  dishes: "烹饪",
  miscellaneous: "杂物",
};
export function createCollectionCatalog(
  catalog: Catalog,
  assets: Assets,
  gameplayTags: GameplayTags,
) {
  const image = createImageResolver(assets);
  if (
    gameplayTags.snapshotId !== catalog.snapshotId ||
    gameplayTags.locale !== catalog.locale ||
    gameplayTags.formatVersion !== catalog.formatVersion
  )
    throw new Error("Catalog tags context mismatch");
  const tagIndex = createGameplayTagIndex(gameplayTags.tags);
  const tagsFor = createRecordTagResolver(tagIndex);
  const rows = catalog.records.map((record) => {
    const target = recordTarget(catalog, record.id);
    if (!target) throw new Error(`Missing formal target ${record.id}`);
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      image: image(record.image),
      quality: record.quality,
      category: recordCategory(record),
      colors: tagsFor(record, "colors").map(tagLabel),
      materials: tagsFor(record, "materials").map(tagLabel),
      styles: tagsFor(record, "styles").map(tagLabel),
      acquisition: record.acquisition,
      acquisitionText: acquisitionText(record.acquisition),
      target,
      record,
    };
  });
  return {
    catalog,
    tags: createCollectionTagFilter(gameplayTags.tags, tagIndex, catalog.records),
    rows,
    byId: new Map(rows.map((row) => [row.id, row])),
    view: toCollectionView(catalog, assets, tagIndex),
  };
}
export type CollectionCatalog = ReturnType<typeof createCollectionCatalog>;
export type OverviewRecord = CollectionCatalog["rows"][number];
export function recordLocation(record: Pick<OverviewRecord, "target">) {
  return {
    to: "/collections/records/$id" as const,
    params: { id: String(record.target.recordId) },
    search: { focus: record.target.focus },
  };
}
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
export type FormalRecord = CatalogRecord;
