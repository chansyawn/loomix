import { ArmchairIcon, LayersIcon } from "lucide-react";
import { ListCardSkeleton } from "../omnidex/card-skeleton";
import { compactGrid, wideGrid } from "../omnidex/grid-layout";
import type { ListTab } from "../omnidex/page";
import type { View } from "./search";

export const title = "家具";
export const tabs: ListTab<"items" | "sets">[] = [
  { value: "items", label: "家具单件", icon: <ArmchairIcon /> },
  { value: "sets", label: "家具套组", icon: <LayersIcon /> },
];
export function listPresentation(view: View) {
  const entry = {
    items: { unit: "件家具", searchLabel: "搜索家具名称", placeholder: "搜索家具名称或拼音…" },
    sets: { unit: "个套组", searchLabel: "搜索套组名称", placeholder: "搜索套组名称或拼音…" },
  }[view];
  return {
    ...entry,
    grid: view === "items" ? compactGrid(78) : wideGrid(124),
    card:
      view === "items" ? (
        <ListCardSkeleton tags />
      ) : (
        <ListCardSkeleton imageClassName="aspect-2/1" description tags />
      ),
  };
}
