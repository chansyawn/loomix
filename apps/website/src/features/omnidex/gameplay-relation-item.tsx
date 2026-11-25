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
  variant = "default",
}: {
  name: string;
  image: string | null;
  quantity?: number;
  note?: string;
  destination?: LinkProps;
  variant?: "default" | "inline";
}) {
  const origin = useOmnidexOrigin();
  const link = destination ? { ...destination, state: { omnidexOrigin: origin } } : undefined;
  const quantityLabel = quantity === undefined ? undefined : `×${quantity}`;
  const label = (
    <span className="min-w-0 flex-1 truncate" title={note ? `${name} ${note}` : name}>
      <span className="group-hover/relation-link:underline">{name}</span>
      {note && (
        <>
          {" "}
          <span className="text-xs text-muted-foreground">{note}</span>
        </>
      )}
    </span>
  );

  if (variant === "inline") {
    const className =
      "inline-flex max-w-full min-w-0 items-center gap-1.5 text-sm/5 whitespace-nowrap";
    const content = (
      <>
        <RecordImage
          image={image}
          name=""
          inset="none"
          background="none"
          fallback="icon"
          className="size-7 shrink-0 rounded-md"
        />
        {label}
        {quantityLabel && (
          <span className="shrink-0 text-xs font-medium tabular-nums">{quantityLabel}</span>
        )}
      </>
    );

    return link ? (
      <Link
        {...link}
        className={`${className} group/relation-link outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        {content}
      </Link>
    ) : (
      <div className={className}>{content}</div>
    );
  }

  return (
    <Item
      size="sm"
      variant="muted"
      render={link ? <Link {...link} /> : undefined}
      className="min-w-0 flex-nowrap"
    >
      <ItemMedia aria-hidden="true" className="size-8">
        <RecordImage image={image} name="" inset="none" background="none" fallback="icon" />
      </ItemMedia>
      {label}
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
