import { ShirtIcon, LayersIcon, SparklesIcon, UsersIcon } from "lucide-react";
import { ListCardSkeleton } from "../omnidex/card-skeleton";
import { compactGrid } from "../omnidex/grid-layout";
import type { ListTab } from "../omnidex/page";
import type { View } from "./search";

export const title = "服饰";
export const tabs: ListTab<View>[] = [
  { value: "items", label: "服装", icon: <ShirtIcon /> },
  { value: "outfits", label: "套装", icon: <LayersIcon /> },
  { value: "appearances", label: "外观", icon: <SparklesIcon /> },
  { value: "neighborOutfit", label: "友邻服饰", icon: <UsersIcon /> },
];
export function listPresentation(view: View) {
  const entry = {
    items: { unit: "件服装", searchLabel: "搜索服装名称", placeholder: "搜索服装名称或拼音…" },
    outfits: { unit: "个套装", searchLabel: "搜索套装名称", placeholder: "搜索套装名称或拼音…" },
    appearances: {
      unit: "项外观",
      searchLabel: "搜索外观名称",
      placeholder: "搜索外观名称或拼音…",
    },
    neighborOutfit: {
      unit: "件友邻服饰",
      searchLabel: "搜索友邻服饰名称",
      placeholder: "搜索友邻服饰名称或拼音…",
    },
  }[view];
  return {
    ...entry,
    grid: compactGrid(view === "outfits" ? 124 : 78),
    card: <ListCardSkeleton description={view === "outfits"} tags />,
  };
}
