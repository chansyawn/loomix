import { Link, type LinkProps } from "@tanstack/react-router";
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
}: {
  name: string;
  image: string | null;
  quantity?: number;
  note?: string;
  destination?: LinkProps;
}) {
  const origin = useOmnidexOrigin();
  return (
    <Item
      size="xs"
      variant="muted"
      render={destination ? <Link {...destination} state={{ omnidexOrigin: origin }} /> : undefined}
      className="grid min-h-11 grid-cols-[2rem_minmax(0,1fr)_auto]"
    >
      <ItemMedia aria-hidden="true" className="size-8">
        <RecordImage image={image} name="" inset="none" background="none" fallback="icon" />
      </ItemMedia>
      <span className="min-w-0 text-sm wrap-anywhere">
        {name}
        {note && <span className="block text-xs text-muted-foreground">{note}</span>}
      </span>
      <span className="flex items-center gap-1.5">
        {quantity !== undefined && (
          <span className="text-xs font-medium tabular-nums">×{quantity}</span>
        )}
        {destination && (
          <ArrowUpRightIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
        )}
      </span>
    </Item>
  );
}
