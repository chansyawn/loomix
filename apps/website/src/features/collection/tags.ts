import { tagLabel, type GameplayTagIndex, type GameplayTags } from "@loomix/schema/gameplay-tags";
import type { CatalogRecord } from "@loomix/schema/catalog";
import type { FilterOption } from "./filter-types";

export type TagMatchMode = "and" | "or";

export function createCollectionTagFilter(
  tags: GameplayTags["tags"],
  index: GameplayTagIndex,
  records: readonly Pick<CatalogRecord, "id" | "tagIds">[],
) {
  const optionsById = new Map<number, FilterOption>();
  for (const tag of tags) {
    const path = index.ancestors(tag.id).reverse().map(tagLabel);
    optionsById.set(tag.id, {
      value: String(tag.id),
      label: tagLabel(tag),
      chipLabel: `标签：${path.join(" / ")}`,
      children: [],
    });
  }
  const roots: FilterOption[] = [];
  for (const tag of tags) {
    const option = optionsById.get(tag.id)!;
    if (tag.parentId === null) roots.push(option);
    else optionsById.get(tag.parentId)!.children!.push(option);
  }
  const ancestryByRecord = new Map(
    records.map((record) => [
      record.id,
      new Set(record.tagIds.flatMap((id) => index.ancestors(id).map((tag) => String(tag.id)))),
    ]),
  );
  return {
    options(selectedIds: readonly string[] = []): FilterOption[] {
      const unknown = selectedIds.filter((id) => !optionsById.has(Number(id)));
      return [
        ...roots,
        ...unknown.map((id) => ({
          value: id,
          label: `未知标签（${id}）`,
          chipLabel: `未知标签（${id}）`,
        })),
      ];
    },
    matches(recordId: number, selectedIds: readonly string[], mode: TagMatchMode): boolean {
      if (selectedIds.length === 0) return true;
      const ancestry = ancestryByRecord.get(recordId);
      const matches = (id: string) => ancestry?.has(id) ?? false;
      return mode === "and" ? selectedIds.every(matches) : selectedIds.some(matches);
    },
  };
}
