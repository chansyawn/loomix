import { CarrotIcon, CookingPotIcon, LayersIcon } from "lucide-react";
import { ListCardSkeleton } from "../omnidex/card-skeleton";
import { compactGrid, wideGrid } from "../omnidex/grid-layout";
import type { ListTab } from "../omnidex/page";
import type { DishView, View } from "./search";

export const title = "烹饪";
export const tabs: ListTab<View>[] = [
  { value: "items", label: "菜肴", icon: <CookingPotIcon /> },
  { value: "ingredients", label: "食材", icon: <CarrotIcon /> },
  { value: "series", label: "菜肴系列", icon: <LayersIcon /> },
];
export function listPresentation(view: DishView) {
  const entry = {
    items: { unit: "道菜肴", searchLabel: "搜索菜肴名称", placeholder: "搜索菜肴名称或拼音…" },
    series: { unit: "个系列", searchLabel: "搜索系列名称", placeholder: "搜索系列名称或拼音…" },
  }[view];
  return {
    ...entry,
    grid: view === "items" ? compactGrid(78) : wideGrid(124),
    card: (
      <ListCardSkeleton
        imageClassName={view === "series" ? "aspect-2/1" : "aspect-square"}
        description={view === "series"}
        tags
      />
    ),
  };
}
