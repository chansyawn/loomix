import { ShirtIcon, LayersIcon, SparklesIcon } from "lucide-react";
import { CollectionCardSkeleton } from "../collection/card-skeleton";
import { compactGrid } from "../collection/grid-layout";
import type { CollectionTab } from "../collection/page";
import type { View } from "./search";

export const title = "服饰";
export const tabs: CollectionTab<"items" | "sets" | "appearances">[] = [
  { value: "items", label: "服装", icon: <ShirtIcon /> },
  { value: "sets", label: "套装", icon: <LayersIcon /> },
  { value: "appearances", label: "外观", icon: <SparklesIcon /> },
];
export function listPresentation(view: View) {
  const entry = {
    items: { unit: "件服装", searchLabel: "搜索服装名称", placeholder: "搜索服装名称…" },
    sets: { unit: "个套装", searchLabel: "搜索套装名称", placeholder: "搜索套装名称…" },
    appearances: { unit: "项外观", searchLabel: "搜索外观名称", placeholder: "搜索外观名称…" },
  }[view];
  return {
    ...entry,
    grid: compactGrid(view === "sets" ? 124 : 78),
    card: <CollectionCardSkeleton description={view === "sets"} tags />,
  };
}
