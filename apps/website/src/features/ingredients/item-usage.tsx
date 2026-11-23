import type { IngredientUsage } from "./model";
import { IngredientTagLink } from "./tag-link";

export function ItemIngredientTags({ tags }: { tags: IngredientUsage["tags"] }) {
  return (
    <section aria-labelledby="item-ingredient-tags" className="flex flex-col gap-3">
      <h2 id="item-ingredient-tags" className="text-lg font-semibold">
        食材标签
      </h2>
      <div className="flex flex-wrap gap-2">
        {tags.map((category) => (
          <IngredientTagLink key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}
