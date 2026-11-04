import { Link } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import { Card, CardContent } from "@/ui/components/card";
import type { DishItem, IngredientItem } from "../collection-view";
import { CollectionItemLink } from "./item-link";
import { RecordImage } from "./record-image";

export function CollectionItemCard({
  item,
  itemId,
  quantity,
  description,
  state,
  fallbackName = "未知物品",
}: {
  item: IngredientItem | DishItem | null;
  itemId: number;
  quantity?: number;
  description?: string;
  state?: LinkProps["state"];
  fallbackName?: string;
}) {
  const name = item?.name ?? `${fallbackName} #${itemId}`;
  const isIngredientItem = item !== null && "catalogCategory" in item;
  const isLinked = item !== null && (!isIngredientItem || item.listed !== false);
  const content = (
    <div className="flex items-center gap-3">
      <div className="size-20 shrink-0 overflow-hidden rounded-lg border bg-muted/30">
        <RecordImage image={item?.image ?? null} name={name} compact />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <span className="block truncate text-base font-semibold group-hover/card:underline">
          {name}
        </span>
        {quantity !== undefined && (
          <span className="block text-sm text-muted-foreground tabular-nums">× {quantity}</span>
        )}
        {description && (
          <span className="line-clamp-2 block text-xs/4 text-muted-foreground">{description}</span>
        )}
      </div>
    </div>
  );

  return (
    <Card size="sm" interactive={isLinked} className="relative h-full max-w-full min-w-50">
      <CardContent>
        {isLinked && item && isIngredientItem ? (
          <CollectionItemLink
            item={item}
            state={state}
            className="flex items-center gap-3 outline-none after:absolute after:inset-0 after:rounded-xl"
          >
            {content}
          </CollectionItemLink>
        ) : isLinked && item ? (
          <Link
            to="/collection/dishes/items/$id"
            params={{ id: String(item.id) }}
            state={state}
            className="flex items-center gap-3 outline-none after:absolute after:inset-0 after:rounded-xl"
          >
            {content}
          </Link>
        ) : (
          content
        )}
      </CardContent>
    </Card>
  );
}
