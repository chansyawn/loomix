import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle } from "@/ui/components/card";
import { Skeleton } from "@/ui/components/skeleton";

export function CollectionCardSkeleton({
  imageClassName = "aspect-square",
  headerClassName,
  description,
  children,
  footer,
}: {
  imageClassName?: string;
  headerClassName?: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card size="sm" className="min-w-0 pt-0" aria-hidden="true">
      <Skeleton className={`${imageClassName} shrink-0`} />
      <CardHeader className={headerClassName}>
        <CardTitle>
          <Skeleton className="my-1 h-4 w-2/3" />
        </CardTitle>
        {description}
      </CardHeader>
      {children}
      {footer}
    </Card>
  );
}
