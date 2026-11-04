import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Button } from "@/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/components/collapsible";
import { CollectionItemCard } from "../collection/collection-item-card";
import { useDishesOrigin } from "../dishes/detail-navigation";
import { effectSummary } from "../dishes/presentation";
import type { IngredientDishMatch } from "./model";

function RecipeMatch({ match, hidden }: { match: IngredientDishMatch; hidden: boolean }) {
  const origin = useDishesOrigin();
  const { dish } = match;
  const description = [dish.difficulty, dish.cookware, effectSummary(dish)]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="min-w-0" role="listitem" hidden={hidden}>
      <CollectionItemCard
        item={dish}
        itemId={dish.id}
        state={{ dishesOrigin: origin }}
        description={description || "菜肴信息未提供"}
      />
    </div>
  );
}

export function RelatedRecipes({ matches }: { matches: IngredientDishMatch[] }) {
  const [expanded, setExpanded] = useState(false);
  const [columnCount, setColumnCount] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateColumns = () => {
      setColumnCount(getComputedStyle(grid).gridTemplateColumns.split(" ").length);
    };

    updateColumns();
    const observer = new ResizeObserver(updateColumns);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [matches.length]);

  if (matches.length === 0) return null;
  const visibleCount = columnCount * 3;
  const hasMoreThanThreeRows = matches.length > visibleCount;
  return (
    <section aria-label="关联菜肴">
      <Collapsible open={expanded} onOpenChange={(open) => setExpanded(open)}>
        <div className="space-y-2">
          <div
            ref={gridRef}
            className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-4"
            role="list"
          >
            {matches.slice(0, visibleCount).map((match) => (
              <RecipeMatch key={match.dish.id} match={match} hidden={false} />
            ))}
            {hasMoreThanThreeRows && (
              <CollapsibleContent className="contents data-closed:hidden">
                {matches.slice(visibleCount).map((match) => (
                  <RecipeMatch key={match.dish.id} match={match} hidden={false} />
                ))}
              </CollapsibleContent>
            )}
          </div>
          {hasMoreThanThreeRows && (
            <CollapsibleTrigger className="mt-2" render={<Button variant="ghost" size="lg" />}>
              {expanded ? (
                <>
                  <ChevronUpIcon aria-hidden="true" className="size-5" />
                  收起菜肴 · 共 {matches.length} 道
                </>
              ) : (
                <>
                  <ChevronDownIcon aria-hidden="true" className="size-5" />
                  展开全部菜肴 · 共 {matches.length} 道
                </>
              )}
            </CollapsibleTrigger>
          )}
        </div>
      </Collapsible>
    </section>
  );
}
