import { BeanIcon, LayersIcon, SproutIcon } from "lucide-react";
import { CollectionCardSkeleton } from "../collection/card-skeleton";
import { compactGrid } from "../collection/grid-layout";
import type { CollectionTab } from "../collection/page";
import type { View } from "./search";

export const title = "植物";
export const tabs: CollectionTab<"items" | "series" | "seeds">[] = [
  { value: "items", label: "植物单品", icon: <SproutIcon /> },
  { value: "series", label: "植物系列", icon: <LayersIcon /> },
  { value: "seeds", label: "种子", icon: <BeanIcon /> },
];
export function listPresentation(view: View) {
  const entry = {
    items: { unit: "种植物", searchLabel: "搜索植物名称", placeholder: "搜索植物名称…" },
    series: { unit: "个系列", searchLabel: "搜索系列名称", placeholder: "搜索系列名称…" },
    seeds: { unit: "颗种子", searchLabel: "搜索种子名称", placeholder: "搜索种子名称…" },
  }[view];
  return {
    ...entry,
    grid: compactGrid(view === "items" ? 78 : 124),
    card: <CollectionCardSkeleton description={view !== "items"} tags />,
  };
}
