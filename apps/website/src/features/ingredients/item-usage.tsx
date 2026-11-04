import { CookingPotIcon } from "lucide-react";
import type { IngredientUsage } from "./model";
import { IngredientTagLink } from "./tag-link";
import { RelatedRecipes } from "./related-recipes";

export function ItemCookingUsage({ usage }: { usage: IngredientUsage | null }) {
  if (!usage) return null;
  return (
    <section aria-labelledby="item-cooking-usage" className="space-y-4">
      <h2 id="item-cooking-usage" className="flex items-center gap-2 text-lg font-semibold">
        <CookingPotIcon aria-hidden="true" className="size-5" />
        烹饪用途
      </h2>
      <div className="flex flex-wrap gap-2" aria-label="食材标签">
        {usage.tags.map((category) => (
          <IngredientTagLink key={category.id} category={category} />
        ))}
      </div>
      {usage.dishes.length > 0 && <RelatedRecipes matches={usage.dishes} />}
    </section>
  );
}
