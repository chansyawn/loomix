import { tagLabel, type GameplayTag } from "@loomix/schema/gameplay-tags";
import { catalogSearchForTag } from "../catalog/search";
import type { DetailField } from "../detail-page/field-model";
import { formatFurnitureSize, furnitureSizeTagName } from "../furniture/size";
import type { CatalogEntryRow, OmnidexCatalog } from "./catalog";

export type OverviewTag = { id: number | null; name: string; filterable: boolean };
type TagGroup = { label: string; tags: OverviewTag[] };
type DirectTag = { path: GameplayTag[]; tag: OverviewTag };
type ItemRecord = Exclude<CatalogEntryRow["record"], { memberKind: string }>;
type DetailTags = {
  origin: OverviewTag[];
  furnitureType: OverviewTag[];
  furnitureSize: OverviewTag[];
};

export function catalogTagField(label: string, tags: readonly OverviewTag[]): DetailField {
  return {
    kind: "tags",
    label,
    fullWidth: tags.length > 1,
    value: tags.map(({ id, name, filterable }) => ({
      key: id ?? name,
      name,
      destination:
        filterable && id !== null ? { to: "/catalog", search: catalogSearchForTag(id) } : undefined,
    })),
  };
}

function mostSpecific(candidates: DirectTag[]) {
  const tags = candidates.filter(({ tag }) => tag.filterable);
  const parents = new Set(tags.flatMap(({ path }) => path.slice(0, -1).map(({ id }) => id)));
  return tags.filter(({ path }) => !parents.has(path.at(-1)!.id)).map(({ tag }) => tag);
}

function primaryTags(record: ItemRecord, direct: DirectTag[]) {
  const branch = (root: string) => direct.filter(({ path }) => path[0].internalName === root);
  const tagGroups: TagGroup[] = [];
  const add = (label: string, tags: OverviewTag[]) => {
    if (tags.length) tagGroups.push({ label, tags });
  };

  let colors = branch("颜色").map(({ tag }) => tag);
  if (record.kind === "plant" && record.flowerColors?.length) {
    const names = new Set(record.flowerColors);
    add(
      "花色",
      [...names].flatMap<OverviewTag>((name) => {
        const matches = colors.filter((tag) => tag.name === name);
        return matches.length ? matches : [{ id: null, name, filterable: false }];
      }),
    );
    colors = colors.filter((tag) => !names.has(tag.name));
  }
  add("颜色", colors);
  add(
    "材质",
    branch("材质").map(({ tag }) => tag),
  );
  add(
    "风格",
    branch("艺术风格").map(({ tag }) => tag),
  );

  const detailTags: DetailTags = {
    origin:
      record.kind === "plant" || record.kind === "dish"
        ? branch("产区分类").map(({ tag }) => tag)
        : [],
    furnitureType: [],
    furnitureSize: [],
  };
  if (record.kind === "dish") {
    add(
      "食品分类",
      mostSpecific(
        branch("食物").filter(
          ({ path }) => path[1]?.internalName === "食品分类" && path.length > 2,
        ),
      ),
    );
    add("原料特征", mostSpecific(branch("烹饪原料").filter(({ path }) => path.length > 1)));
  }
  if (
    record.kind === "clothing" ||
    record.kind === "appearance" ||
    record.kind === "neighborOutfit"
  )
    add("服饰款式", mostSpecific(branch("服装").filter(({ path }) => path.length > 2)));
  if (record.kind === "creature")
    add("生物分类", mostSpecific(branch("生物").filter(({ path }) => path.length > 3)));
  if (record.kind === "furniture") {
    detailTags.furnitureType = mostSpecific(
      branch("家具").filter(({ path }) => path.length > 2 && path[1].internalName !== "放置方式"),
    );
    if (record.size) {
      const sizeName = furnitureSizeTagName(record.size.width, record.size.depth);
      const match = branch("尺寸").find(
        ({ tag, path }) => tag.filterable && path.at(-1)?.internalName === sizeName,
      );
      if (match)
        detailTags.furnitureSize.push({ ...match.tag, name: formatFurnitureSize(record.size) });
    }
  }
  return { tagGroups, detailTags };
}

export function overviewTags(data: OmnidexCatalog, record: ItemRecord) {
  const direct = [...new Set(record.tagIds)].map((id) => {
    const option = data.tags.visibleOption(id);
    return {
      path: data.tagIndex.ancestors(id).reverse(),
      tag: { id, name: option?.label ?? tagLabel(data.tagIndex.get(id)), filterable: !!option },
    };
  });
  return {
    ...primaryTags(record, direct),
    filterTags: direct.flatMap(({ tag }) => (tag.filterable ? [tag] : [])),
  };
}
