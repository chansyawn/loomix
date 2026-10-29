import { CollectionCardSkeleton } from "../collection/card-skeleton";
import { compactGrid } from "../collection/grid-layout";

export const title = "杂物";
export function listPresentation() {
  const entry = {
    unit: "件杂物",
    searchLabel: "搜索杂物名称或描述",
    placeholder: "搜索名称或描述…",
  };
  return {
    ...entry,
    grid: compactGrid(56),
    card: <CollectionCardSkeleton />,
  };
}
