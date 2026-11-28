import { notFound } from "@tanstack/react-router";
import type { ItemOf } from "@loomix/schema/catalog";
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

export function simpleEncounterSummary({
  region,
  habitat,
  activeSeasons,
  activeTimes,
  activeWeather,
}: Pick<
  ItemOf<"creature">,
  "region" | "habitat" | "activeSeasons" | "activeTimes" | "activeWeather"
>) {
  if (
    habitat?.length === 1 &&
    region?.length === 1 &&
    region[0] === "全地区" &&
    activeSeasons?.length === 1 &&
    activeSeasons[0] === "全年" &&
    activeTimes?.length === 1 &&
    activeTimes[0] === "全天" &&
    activeWeather?.length === 1 &&
    activeWeather[0] === "任意天气"
  ) {
    return `全地区的${habitat[0]}，全年全天，任意天气`;
  }
  return null;
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
