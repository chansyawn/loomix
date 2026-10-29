import type { ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import type { IngredientCategory } from "@loomix/schema/catalog";
import { buttonVariants } from "@/ui/components/button";
import { ingredientFiltersForTag } from "./search";

export function IngredientTagLink({
  category,
  className,
  children,
}: {
  category: Pick<IngredientCategory, "id" | "name">;
  className?: string;
  children?: ComponentProps<"a">["children"];
}) {
  return (
    <Link
      to="/collection/dishes"
      search={{
        view: "ingredients",
        ingredients: ingredientFiltersForTag(category.id),
      }}
      className={className ?? buttonVariants({ variant: "outline", size: "sm" })}
    >
      {children ?? category.name}
    </Link>
  );
}
