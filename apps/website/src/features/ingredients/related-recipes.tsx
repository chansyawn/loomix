import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { CatalogItemCard } from "../omnidex/catalog-item-card";
import { ExpandableGrid } from "../omnidex/expandable-grid";
import { effectSummary } from "../dishes/presentation";
import type { IngredientDishMatch } from "./model";

function RecipeMatch({ match }: { match: IngredientDishMatch }) {
  const { dish } = match;
  const description = [dish.difficulty, dish.cookware, effectSummary(dish)]
    .filter(Boolean)
    .join(" · ");
  return (
    <CatalogItemCard
      item={dish}
      itemId={dish.id}
      link={catalogEntryLocation(dish)}
      description={description || "菜肴信息未提供"}
    />
  );
}

export function RelatedRecipes({ matches }: { matches: IngredientDishMatch[] }) {
  if (matches.length === 0) return null;
  return (
    <section aria-label="关联菜肴">
      <ExpandableGrid
        items={matches}
        getKey={(match) => match.dish.id}
        renderItem={(match) => <RecipeMatch match={match} />}
        label="菜肴"
        unit="道"
      />
    </section>
  );
}
