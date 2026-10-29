import { CookingPotIcon } from "lucide-react";
import { DishesReturnLink } from "../dishes/detail-navigation";
import type { IngredientUsage } from "./model";
import { IngredientTagLink } from "./tag-link";
import { RecipeAssociationNotice, RelatedRecipes } from "./related-recipes";

export function ItemCookingUsage({ usage }: { usage: IngredientUsage | null }) {
  if (!usage) return null;
  return (
    <section aria-labelledby="item-cooking-usage" className="space-y-4 border-t pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="item-cooking-usage" className="flex items-center gap-2 text-lg font-semibold">
          <CookingPotIcon aria-hidden="true" className="size-5" />
          烹饪用途
        </h2>
        <DishesReturnLink
          view="ingredients"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          返回烹饪图鉴
        </DishesReturnLink>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="食材标签">
        {usage.tags.map(({ category, filterKey }) => (
          <IngredientTagLink key={category.id} category={category} filterKey={filterKey} />
        ))}
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium">关联菜肴 · {usage.dishes.length} 道</h3>
        <RecipeAssociationNotice />
      </div>
      <RelatedRecipes matches={usage.dishes} preview />
    </section>
  );
}
