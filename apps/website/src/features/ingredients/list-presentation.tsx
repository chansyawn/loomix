import { ListCardSkeleton } from "../list-page/card-skeleton";
import { compactGrid } from "../list-page/grid-layout";

export const ingredientListPresentation = {
  toolbar: { title: "食材", searchLabel: "搜索食材名称", placeholder: "搜索食材名称或拼音…" },
  grid: compactGrid(78),
  card: <ListCardSkeleton tags />,
};
