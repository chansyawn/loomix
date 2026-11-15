import type { ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import type { IngredientTag } from "./tag-source";
import { buttonVariants } from "@/ui/components/button";
import { ingredientFiltersForTag } from "./search";

export function IngredientTagLink({
  category,
  className,
  children,
}: {
  category: Pick<IngredientTag, "id" | "name" | "group">;
  className?: string;
  children?: ComponentProps<"a">["children"];
}) {
  return (
    <Link
      to="/collections/dishes"
      search={{
        view: "ingredients",
        ingredients: ingredientFiltersForTag(category),
      }}
      className={className ?? buttonVariants({ variant: "secondary", size: "sm" })}
    >
      {children ?? category.name}
    </Link>
  );
}
