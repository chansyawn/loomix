import { Link } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/ui/components/card";
import { cn } from "@/ui/lib/utils";
import type { CatalogEntrySummary } from "../omnidex-view";
import { RecordImage } from "./record-image";
import { useOmnidexOrigin } from "./navigation";

export function CatalogItemCard({
  item,
  itemId,
  thumbnail,
  quantity,
  description,
  link,
  fullDescription = false,
  fallbackName = "未知物品",
}: {
  item: Pick<CatalogEntrySummary, "name" | "image"> | null;
  itemId: number;
  thumbnail?: ReactNode;
  quantity?: number;
  description?: string;
  link?: LinkProps;
  fullDescription?: boolean;
  fallbackName?: string;
}) {
  const origin = useOmnidexOrigin();
  const name = item?.name ?? `${fallbackName} #${itemId}`;
  const content = (
    <div className="flex items-center gap-3">
      <div className="size-20 shrink-0 overflow-hidden rounded-lg border bg-muted/30">
        {thumbnail ?? (
          <RecordImage image={item?.image ?? null} name={name} inset="sm" fallback="icon" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn("text-base font-semibold", link && "group-hover/card:underline")}>
          {name}
        </span>
        {quantity !== undefined && (
          <span className="block text-sm text-muted-foreground tabular-nums">× {quantity}</span>
        )}
        {description && (
          <span
            className={cn(
              "text-xs/5 whitespace-pre-line text-muted-foreground",
              !fullDescription && "line-clamp-2",
            )}
          >
            {description}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Card size="sm" className="relative h-full max-w-full min-w-50">
      <CardContent>
        {link ? (
          <Link
            {...link}
            state={link.state ?? { omnidexOrigin: origin }}
            className="block outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:inset-ring-2 focus-visible:after:inset-ring-ring"
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
