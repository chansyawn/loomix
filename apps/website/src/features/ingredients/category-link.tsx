import type { ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import type { IngredientCategory } from "@loomix/schema/catalog";
import { useDishesOrigin } from "../dishes/detail-navigation";
import { buttonVariants } from "@/ui/components/button";

export function IngredientCategoryLink({
  category,
  className,
  children,
}: {
  category: Pick<IngredientCategory, "id" | "name">;
  className?: string;
  children?: ComponentProps<"a">["children"];
}) {
  const origin = useDishesOrigin();
  return (
    <Link
      to="/collection/dishes/ingredients/$id"
      params={{ id: String(category.id) }}
      state={{ dishesOrigin: origin }}
      className={className ?? buttonVariants({ variant: "outline", size: "sm" })}
    >
      {children ?? category.name}
    </Link>
  );
}
