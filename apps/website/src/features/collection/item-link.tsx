import { Link } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { IngredientItem } from "../collection-view";
import { recordLocation } from "./item-route";
import { useCollectionOrigin } from "./navigation";

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
  const origin = useCollectionOrigin();
  if (item.browsable === false) return <span className={className}>{children ?? item.name}</span>;
  return (
    <Link
      {...recordLocation(item)}
      state={state ?? { collectionOrigin: origin }}
      className={
        className ??
        "rounded-sm text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      }
    >
      {children ?? item.name}
    </Link>
  );
}
