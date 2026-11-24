import { Link, type LinkProps } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowUpRightIcon } from "lucide-react";
import { Item, ItemMedia } from "@/ui/components/item";
import { useOmnidexOrigin } from "./navigation";
import { RecordImage } from "./record-image";

export function GameplayRelationItem({
  name,
  image,
  quantity,
  note,
  destination,
  variant = "default",
}: {
  name: string;
  image: string | null;
  quantity?: number;
  note?: string;
  destination?: LinkProps;
  variant?: "default" | "compact";
}) {
  const origin = useOmnidexOrigin();
  const compact = variant === "compact";
  const quantityLabel = quantity === undefined ? undefined : `×${quantity}`;
  return (
    <Item
      size={compact ? "xs" : "sm"}
      variant={compact ? "default" : "muted"}
      render={destination ? <Link {...destination} state={{ omnidexOrigin: origin }} /> : undefined}
      className={cn("min-w-0 flex-nowrap")}
    >
      <ItemMedia aria-hidden="true" className={compact ? "size-5" : "size-8"}>
        <RecordImage image={image} name="" inset="none" background="none" fallback="icon" />
      </ItemMedia>
      <span className="min-w-0 flex-1 truncate" title={note ? `${name} ${note}` : name}>
        {name}
        {note && (
          <>
            {" "}
            <span className="text-xs text-muted-foreground">{note}</span>
          </>
        )}
      </span>
      {(quantityLabel || destination) && (
        <span className="flex max-w-1/2 min-w-0 shrink-0 items-center gap-1.5">
          {quantityLabel && (
            <span className="truncate text-xs font-medium tabular-nums" title={quantityLabel}>
              {quantityLabel}
            </span>
          )}
          {destination && (
            <ArrowUpRightIcon
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground"
            />
          )}
        </span>
      )}
    </Item>
  );
}
