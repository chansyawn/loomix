import { ListCardSkeleton } from "../list-page/card-skeleton";
import { compactGrid } from "../list-page/grid-layout";

export const title = "杂物";
export function listPresentation() {
  const entry = {
    unit: "件杂物",
    searchLabel: "搜索杂物名称",
    placeholder: "搜索杂物名称或拼音…",
  };
  return {
    ...entry,
    grid: compactGrid(56),
    card: <ListCardSkeleton />,
  };
}
