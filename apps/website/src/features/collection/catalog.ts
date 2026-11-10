import { createImageResolver, type Assets } from "@loomix/schema/assets";
import {
  recordCategory,
  recordKind,
  recordTarget,
  createTagResolver,
  type Catalog,
  type CatalogRecord,
} from "@loomix/schema/catalog";
import { toCollectionView } from "../collection-view";
import { acquisitionText } from "../collection/acquisition";

export const categoryNames = {
  furniture: "家具",
  clothing: "服饰",
  creatures: "生物",
  plants: "植物",
  dishes: "烹饪",
  miscellaneous: "杂物",
};
export const kindNames = { item: "单品", group: "套组／系列", appearance: "外观", seed: "种子" };
export function createCollectionCatalog(catalog: Catalog, assets: Assets) {
  const image = createImageResolver(assets);
  const tagsFor = createTagResolver(catalog);
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
      kind: recordKind(record),
      colors: tagsFor(record, 9),
      materials: tagsFor(record, 11),
      styles: tagsFor(record, 12),
      acquisition: record.acquisition,
      acquisitionText: acquisitionText(record.acquisition),
      target,
      record,
    };
  });
  return {
    catalog,
    rows,
    byId: new Map(rows.map((row) => [row.id, row])),
    view: toCollectionView(catalog, assets),
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
    ["记录形式", kindNames[row.kind]],
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
