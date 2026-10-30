import { Card, CardHeader, CardTitle } from "@/ui/components/card";
import { Skeleton } from "@/ui/components/skeleton";

export function CollectionCardSkeleton({
  imageClassName = "aspect-square",
  description = false,
  tags = false,
}: {
  imageClassName?: string;
  description?: boolean;
  tags?: boolean;
}) {
  return (
    <Card padding="flush" className="min-w-0" aria-hidden="true">
      <Skeleton shape="square" className={`${imageClassName} shrink-0`} />
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
      </CardHeader>
    </Card>
  );
}
