import type { IngredientUsage } from "./model";
import { IngredientTagLink } from "./tag-link";

export function ItemIngredientTags({ tags }: { tags: IngredientUsage["tags"] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((category) => (
        <IngredientTagLink key={category.id} category={category} />
      ))}
    </div>
  );
}
