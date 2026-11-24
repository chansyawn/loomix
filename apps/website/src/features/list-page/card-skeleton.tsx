import { Card, CardHeader, CardMedia, CardTitle } from "@/ui/components/card";
import { Skeleton } from "@/ui/components/skeleton";
import type { ReactNode } from "react";

export function ListCardSkeleton({
  imageClassName = "aspect-square",
  description = false,
  tags = false,
  children,
}: {
  imageClassName?: string;
  description?: boolean;
  tags?: boolean;
  children?: ReactNode;
}) {
  return (
    <Card className="min-w-0" aria-hidden="true">
      <CardMedia>
        <Skeleton className={imageClassName} />
      </CardMedia>
      <CardHeader>
        <CardTitle>
          <Skeleton className="my-1 h-4 w-2/3" />
        </CardTitle>
        {description ? (
          <div className="space-y-1">
            <Skeleton className="my-1 h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : null}
        {tags ? <Skeleton className="h-4 w-1/2" /> : null}
        {children}
      </CardHeader>
    </Card>
  );
}
