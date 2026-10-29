import type { DishItem, DishSeries } from "../collection-view.ts";
import type { FilterGroup as CollectionFilterGroup } from "@/features/collection/filter-panel";
import { qualityNames } from "@/features/collection/quality";
import { ingredientCategoryOptions } from "../ingredients/query";
import type { DishesBrowserData } from "./data";
import { difficultyRequirementLabel, effectValues } from "./presentation";
import { missing, ungrouped } from "./search";
import type { FilterKey, DishView as View, ViewQuery } from "./search";

export type FilterGroup = CollectionFilterGroup<FilterKey>;

export function splitValues(value: string | null): string[] {
  return value
    ? value
        .split("，")
        .map((part) => part.trim())
        .filter(Boolean)
    : [missing];
}

export function membershipIndex(series: DishSeries[]): Map<number, DishSeries[]> {
  const index = new Map<number, DishSeries[]>();
  for (const group of series)
    for (const id of group.dishIds ?? []) index.set(id, [...(index.get(id) ?? []), group]);
  return index;
}

function optionList(normalized: string[]) {
  return [...new Set(normalized)]
    .sort((a, b) => (a === missing ? 1 : b === missing ? -1 : a.localeCompare(b, "zh-CN")))
    .map((value) => ({ value, label: value === missing ? "未提供" : value }));
}

function options(values: (string | null)[], split = false) {
  return optionList(values.flatMap((value) => (split ? splitValues(value) : [value || missing])));
}

function multiOptions(values: (string[] | null)[]) {
  return optionList(values.flatMap((value) => (value?.length ? value : [missing])));
}

export function filterGroups(data: DishesBrowserData, view: View = "items"): FilterGroup[] {
  const rows = view === "items" ? data.items : data.series;
  const missingQuality = rows.some((row) => row.quality === null);
  const qualities = qualityNames
    .map((label, value) => ({ value: String(value), label }))
    .concat(missingQuality ? [{ value: missing, label: "未提供" }] : []);
  if (view === "series") return [{ key: "qualities", label: "品阶", options: qualities }];

  return [
    {
      key: "ingredientCategories",
      label: "所需食材",
      options: ingredientCategoryOptions(data.ingredients),
    },
    {
      key: "difficulties",
      label: "难度",
      options: options(data.items.map((row) => row.difficulty)),
    },
    {
      key: "difficultyRequirements",
      label: "解锁条件",
      options: options(
        data.items.map((row) => difficultyRequirementLabel(row.difficultyRequirement)),
      ),
      fullWidth: true,
    },
    {
      key: "tastes",
      label: "口味",
      options: multiOptions(data.items.map((row) => row.tastes)),
    },
    {
      key: "galaxyFlavors",
      label: "星系风味",
      options: options(
        data.items.map((row) => row.galaxyFlavor),
        true,
      ),
      fullWidth: true,
    },
    { key: "cookwares", label: "炊具", options: options(data.items.map((row) => row.cookware)) },
    {
      key: "effects",
      label: "效果",
      options: multiOptions(
        data.items.map((row) => {
          const values = effectValues(row);
          return values.length > 0 ? values : null;
        }),
      ),
      fullWidth: true,
    },
    { key: "qualities", label: "品阶", options: qualities },
    {
      key: "series",
      label: "所属系列",
      options: data.series
        .filter((group) => group.dishIds !== null)
        .map((group) => ({ value: String(group.id), label: group.name }))
        .concat(
          data.series.every((group) => group.dishIds !== null)
            ? [{ value: ungrouped, label: "未归入系列" }]
            : [],
        ),
      fullWidth: true,
    },
  ];
}

function matches(selected: string[], values: string[]): boolean {
  return selected.length === 0 || selected.some((value) => values.includes(value));
}

export function queryDishes(data: DishesBrowserData, view: View, query: ViewQuery) {
  const memberships = membershipIndex(data.series);
  const membershipDataComplete = data.series.every((group) => group.dishIds !== null);
  const term = query.q.trim().toLocaleLowerCase("zh-CN");
  const ingredientCategoryDishIds = new Set(
    query.ingredientCategories.flatMap((categoryId) =>
      (data.ingredients.dishesByCategoryId.get(Number(categoryId)) ?? []).map(
        (match) => match.dish.id,
      ),
    ),
  );
  const rows: (DishItem | DishSeries)[] = view === "items" ? data.items : data.series;
  const filtered = rows.filter((row) => {
    if (
      !row.name.toLocaleLowerCase("zh-CN").includes(term) ||
      !matches(query.qualities, [row.quality === null ? missing : String(row.quality)])
    )
      return false;
    if (!("difficulty" in row)) return true;
    if (query.ingredientCategories.length > 0 && !ingredientCategoryDishIds.has(row.id))
      return false;
    const effects = effectValues(row);
    return (
      matches(query.difficulties, [row.difficulty || missing]) &&
      matches(query.difficultyRequirements, [
        difficultyRequirementLabel(row.difficultyRequirement),
      ]) &&
      matches(query.tastes, row.tastes?.length ? row.tastes : [missing]) &&
      matches(query.galaxyFlavors, splitValues(row.galaxyFlavor)) &&
      matches(query.cookwares, [row.cookware || missing]) &&
      matches(query.effects, effects.length > 0 ? effects : [missing]) &&
      matches(
        query.series,
        memberships.get(row.id)?.map((group) => String(group.id)) ??
          (membershipDataComplete ? [ungrouped] : []),
      )
    );
  });

  if (query.sort !== "original")
    filtered.sort((a, b) => {
      const direction = query.sort.endsWith("desc") ? -1 : 1;
      if (query.sort.startsWith("name")) return direction * a.name.localeCompare(b.name, "zh-CN");
      if (a.quality === null) return b.quality === null ? 0 : 1;
      if (b.quality === null) return -1;
      return direction * (a.quality - b.quality);
    });

  return { rows: filtered, total: filtered.length, memberships };
}
