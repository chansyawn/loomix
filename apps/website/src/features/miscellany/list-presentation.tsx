import { CardContent, CardDescription } from "@/ui/components/card";
import { Skeleton } from "@/ui/components/skeleton";
import { CollectionCardSkeleton } from "../collection/card-skeleton";
import type { GridLayout } from "../collection/grid-layout";

export const title = "杂物";
const miscellanyGrid: GridLayout = {
  breakpoints: [],
  minWidth: 176,
  className: "grid grid-cols-[repeat(auto-fill,minmax(min(100%,11rem),1fr))] gap-4",
  estimateHeight: (width) => width + 136,
};
export function listPresentation() {
  const entry = {
    unit: "件杂物",
    searchLabel: "搜索杂物名称或描述",
    placeholder: "搜索名称或描述…",
  };
  return {
    ...entry,
    grid: miscellanyGrid,
    card: (
      <CollectionCardSkeleton>
        <CardContent className="pt-0">
          {
            <CardDescription className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardDescription>
          }
          <Skeleton className="mt-2 h-4 w-16" />
        </CardContent>
      </CollectionCardSkeleton>
    ),
  };
}
