import { notFound } from "@tanstack/react-router";
import type { CreatureItem } from "../omnidex-view";
import type { CreaturesData } from "./data";
import { loadOmnidexView } from "../omnidex-loader";
import { buildIngredientsData, ingredientUsage } from "../ingredients/model";
import type { IngredientUsage } from "../ingredients/model";
import { indexMembership } from "../omnidex/membership";
import type { View } from "./search";

export function parseCreaturesId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) throw notFound();
  return id;
}

export function creaturesDetail(
  data: CreaturesData,
  view: View,
  id: number,
  cooking: IngredientUsage | null = null,
) {
  if (view === "items") {
    const item = data.items.find((row) => row.id === id);
    if (!item) throw notFound();
    return {
      kind: "item" as const,
      record: item,
      cooking,
      catalogItems: data.items,
      series: indexMembership(data.series, (group) => group.creatureIds).get(id) ?? [],
    };
  }
  const series = data.series.find((row) => row.id === id);
  if (!series) throw notFound();
  const items = new Map(data.items.map((item) => [item.id, item]));
  return {
    kind: "series" as const,
    record: series,
    items: series.creatureIds === null ? null : series.creatureIds.map((id) => items.get(id)!),
  };
}

export type CreaturesDetail = ReturnType<typeof creaturesDetail>;

type Condition = [label: string, value: string | null];

function pairedCondition(first: Condition, second: Condition): Condition {
  if (!first[1]) return second;
  if (!second[1]) return first;
  return [`${first[0]}与${second[0]}`, `${first[1]} · ${second[1]}`];
}

export function creatureEncounterFields(record: CreatureItem): Condition[] {
  return [
    pairedCondition(["地区", record.region], ["栖息地", record.habitat]),
    pairedCondition(["季节", record.activeSeasons], ["时段", record.activeTimes]),
    ["天气", record.activeWeather],
  ];
}

export async function loadCreaturesDetail(view: View, value: string): Promise<CreaturesDetail> {
  const id = parseCreaturesId(value);
  const collection = await loadOmnidexView();
  return creaturesDetail(
    collection.creatures,
    view,
    id,
    view === "items" ? ingredientUsage(buildIngredientsData(collection), id) : null,
  );
}
