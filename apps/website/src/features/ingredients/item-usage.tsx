import type { IngredientUsage } from "./model";
import { IngredientTagLink } from "./tag-link";
import { badgeVariants } from "@/ui/components/badge";

export function ItemIngredientTags({ tags }: { tags: IngredientUsage["tags"] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((category) => (
        <IngredientTagLink
          key={category.id}
          category={category}
          className={badgeVariants({ variant: "secondary" })}
        />
      ))}
    </div>
  );
}
