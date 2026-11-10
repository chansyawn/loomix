import { CollectionItemCard } from "../collection/collection-item-card";
import { CollectionExpandableGrid } from "../collection/expandable-grid";
import { useCollectionOrigin } from "@/features/collection/navigation";
import { effectSummary } from "../dishes/presentation";
import type { IngredientDishMatch } from "./model";

function RecipeMatch({ match }: { match: IngredientDishMatch }) {
  const origin = useCollectionOrigin();
  const { dish } = match;
  const description = [dish.difficulty, dish.cookware, effectSummary(dish)]
    .filter(Boolean)
    .join(" · ");
  return (
    <CollectionItemCard
      item={dish}
      itemId={dish.id}
      link={{
        to: "/collections/records/$id",
        params: { id: String(dish.id) },
        state: { collectionOrigin: origin },
      }}
      description={description || "菜肴信息未提供"}
    />
  );
}

export function RelatedRecipes({ matches }: { matches: IngredientDishMatch[] }) {
  if (matches.length === 0) return null;
  return (
    <section aria-label="关联菜肴">
      <CollectionExpandableGrid
        items={matches}
        getKey={(match) => match.dish.id}
        renderItem={(match) => <RecipeMatch match={match} />}
        label="菜肴"
        unit="道"
      />
    </section>
  );
}
