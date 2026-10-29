import { BugIcon, LayersIcon } from "lucide-react";
import { CollectionCardSkeleton } from "../collection/card-skeleton";
import { compactGrid, wideGrid } from "../collection/grid-layout";
import type { CollectionTab } from "../collection/page";
import type { View } from "./search";

export const title = "生物";
export const tabs: CollectionTab<"items" | "series">[] = [
  { value: "items", label: "生物", icon: <BugIcon /> },
  { value: "series", label: "生物系列", icon: <LayersIcon /> },
];
export function listPresentation(view: View) {
  const entry = {
    items: { unit: "种生物", searchLabel: "搜索生物名称", placeholder: "搜索生物名称…" },
    series: { unit: "个系列", searchLabel: "搜索系列名称", placeholder: "搜索系列名称…" },
  }[view];
  return {
    ...entry,
    grid: view === "items" ? compactGrid(78) : wideGrid(124),
    card: (
      <CollectionCardSkeleton
        imageClassName={view === "series" ? "aspect-2/1" : "aspect-square"}
        description={view === "series"}
        tags
      />
    ),
  };
}
