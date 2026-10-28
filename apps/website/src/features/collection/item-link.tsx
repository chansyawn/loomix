import { Link } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { IngredientItem } from "../collection-view";
import { collectionItemLocation } from "./item-route";

export function CollectionItemLink({
  item,
  state,
  children,
  className,
}: {
  item: IngredientItem;
  state?: LinkProps["state"];
  children?: ReactNode;
  className?: string;
}) {
  if (item.listed === false) return <span className={className}>{children ?? item.name}</span>;
  return (
    <Link
      {...collectionItemLocation(item)}
      state={state}
      className={
        className ??
        "rounded-sm text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      }
    >
      {children ?? item.name}
    </Link>
  );
}
