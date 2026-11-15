import type { FilterGroup, FilterOption } from "../collection/filter-types";
import {
  INGREDIENT_USAGE_EXCLUDED,
  INGREDIENT_TAG_GROUPS,
  type IngredientTagGroupKey,
} from "./tag-filter-policy";
import type { IngredientTag, IngredientTagSource } from "./tag-source";

export type IngredientTagSelection = Record<IngredientTagGroupKey, string[]>;
export type IngredientTagCounts = ReadonlyMap<number, number>;

function excludedFromUsage(tag: IngredientTag): boolean {
  return (INGREDIENT_USAGE_EXCLUDED as readonly string[]).includes(tag.internalName);
}

export function ingredientTagCounts(
  source: IngredientTagSource,
  items: Iterable<{ id: number }>,
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const item of items)
    for (const tagId of source.tagIdsByItemId.get(item.id) ?? [])
      counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
  return counts;
}

export function dishIngredientTagCounts(
  source: IngredientTagSource,
  candidatesByDishId: ReadonlyMap<number, readonly number[]>,
  dishes: Iterable<{ id: number }>,
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const dish of dishes) {
    const matched = new Set<number>();
    for (const itemId of candidatesByDishId.get(dish.id) ?? [])
      for (const tagId of source.tagIdsByItemId.get(itemId) ?? []) matched.add(tagId);
    for (const tagId of matched) counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
  }
  return counts;
}

function buildOption(
  source: IngredientTagSource,
  tag: IngredientTag,
  counts: IngredientTagCounts,
  groupLabel: string,
  path: readonly string[],
): FilterOption {
  const namePath = [...path, tag.name];
  const count = counts.get(tag.id) ?? 0;
  return {
    value: String(tag.id),
    label: tag.name,
    chipLabel: `${groupLabel}：${namePath.join(" / ")}`,
    count,
    disabled: count === 0,
    children: (source.childrenByParentId.get(tag.id) ?? [])
      .filter((id) => source.visibleIds.has(id))
      .map((id) => buildOption(source, source.byId.get(id)!, counts, groupLabel, namePath)),
  };
}

export function ingredientFilterGroups(
  source: IngredientTagSource,
  counts: IngredientTagCounts,
): FilterGroup<IngredientTagGroupKey>[] {
  return INGREDIENT_TAG_GROUPS.map((config, index) => ({
    key: config.key,
    label: config.label,
    tree: true,
    selectionMode: "independent",
    ...(index === 0 ? { description: "父级包含子级；同组内满足任一，不同组同时满足。" } : {}),
    options: source.groupRootIds[config.key].map((id) =>
      buildOption(source, source.byId.get(id)!, counts, config.label, []),
    ),
  }));
}

function acceptedIds(
  source: IngredientTagSource,
  key: IngredientTagGroupKey,
  ids: readonly string[],
): number[] {
  const accepted = new Set<number>();
  for (const value of ids) {
    const id = Number(value);
    const tag = source.byId.get(id);
    if (!tag || tag.group !== key || !source.visibleIds.has(id)) continue;
    accepted.add(id);
  }
  return [...accepted];
}

export function acceptIngredientTagIds(
  source: IngredientTagSource,
  key: IngredientTagGroupKey,
  ids: readonly string[],
): string[] {
  return acceptedIds(source, key, ids).map(String);
}

export function normalizeIngredientSelection(
  source: IngredientTagSource,
  selection: IngredientTagSelection,
): IngredientTagSelection {
  return {
    ingredientCategories: acceptIngredientTagIds(
      source,
      "ingredientCategories",
      selection.ingredientCategories,
    ),
    ingredientColors: acceptIngredientTagIds(
      source,
      "ingredientColors",
      selection.ingredientColors,
    ),
    ingredientQualities: acceptIngredientTagIds(
      source,
      "ingredientQualities",
      selection.ingredientQualities,
    ),
  };
}

export function ingredientSelectedIds(selection: IngredientTagSelection): number[] {
  return [
    ...new Set(
      INGREDIENT_TAG_GROUPS.flatMap((config) => selection[config.key]).map((value) =>
        Number(value),
      ),
    ),
  ];
}

export function ingredientTagMatcher(
  source: IngredientTagSource,
  selection: IngredientTagSelection,
): (itemId: number) => boolean {
  const groups = INGREDIENT_TAG_GROUPS.map((config) =>
    acceptedIds(source, config.key, selection[config.key]),
  ).filter((ids) => ids.length > 0);
  if (groups.length === 0) return () => true;
  return (itemId) => {
    const closure = source.tagIdsByItemId.get(itemId);
    return Boolean(closure) && groups.every((ids) => ids.some((id) => closure!.has(id)));
  };
}

export function ingredientUsageTags(source: IngredientTagSource, itemId: number): IngredientTag[] {
  const closure = source.tagIdsByItemId.get(itemId);
  if (!closure) return [];
  return source.tags.filter((tag) => closure.has(tag.id) && !excludedFromUsage(tag));
}

export function ingredientLeafTags(source: IngredientTagSource, itemId: number): IngredientTag[] {
  return ingredientUsageTags(source, itemId).filter(
    (tag) => !source.childrenByParentId.has(tag.id),
  );
}
