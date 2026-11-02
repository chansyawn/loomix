import type { LinkProps } from "@tanstack/react-router";
import { Card, CardContent } from "@/ui/components/card";
import type { IngredientItem } from "../collection-view";
import { CollectionItemLink } from "./item-link";
import { RecordImage } from "./record-image";

export function CollectionItemCard({
  item,
  itemId,
  quantity,
  state,
  fallbackName = "未知物品",
}: {
  item: IngredientItem | null;
  itemId: number;
  quantity?: number;
  state?: LinkProps["state"];
  fallbackName?: string;
}) {
  const name = item?.name ?? `${fallbackName} #${itemId}`;
  const isLinked = item !== null && item.listed !== false;
  const content = (
    <div className="flex items-center gap-3">
      <div className="size-16 shrink-0 overflow-hidden rounded-lg border bg-muted/30">
        <RecordImage image={item?.image ?? null} name={name} compact />
      </div>
      <div className="min-w-0 space-y-1">
        <span className="block truncate text-base font-semibold group-hover/card:underline">
          {name}
        </span>
        {quantity !== undefined && (
          <span className="block text-sm text-muted-foreground tabular-nums">× {quantity}</span>
        )}
      </div>
    </div>
  );

  return (
    <Card size="sm" interactive={isLinked} className="relative max-w-full min-w-40">
      <CardContent>
        {isLinked ? (
          <CollectionItemLink
            item={item}
            state={state}
            className="flex items-center gap-3 outline-none after:absolute after:inset-0 after:rounded-xl"
          >
            {content}
          </CollectionItemLink>
        ) : (
          content
        )}
      </CardContent>
    </Card>
  );
}
