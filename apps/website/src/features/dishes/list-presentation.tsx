import { CarrotIcon, CookingPotIcon, LayersIcon } from "lucide-react";
import { CollectionCardSkeleton } from "../collection/card-skeleton";
import { compactGrid } from "../collection/grid-layout";
import type { CollectionTab } from "../collection/page";
import type { DishView, View } from "./search";

export const title = "烹饪";
export const tabs: CollectionTab<View>[] = [
  { value: "items", label: "菜肴", icon: <CookingPotIcon /> },
  { value: "ingredients", label: "食材", icon: <CarrotIcon /> },
  { value: "series", label: "菜肴系列", icon: <LayersIcon /> },
];
export function listPresentation(view: DishView) {
  const entry = {
    items: { unit: "道菜肴", searchLabel: "搜索菜肴名称", placeholder: "搜索菜肴名称…" },
    series: { unit: "个系列", searchLabel: "搜索系列名称", placeholder: "搜索系列名称…" },
  }[view];
  return {
    ...entry,
    grid: compactGrid(view === "items" ? 78 : 124),
    card: <CollectionCardSkeleton description={view === "series"} tags />,
  };
}
