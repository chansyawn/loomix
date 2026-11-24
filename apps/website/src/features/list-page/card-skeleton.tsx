import { Card, CardHeader, CardMedia, CardTitle } from "@/ui/components/card";
import { Skeleton } from "@/ui/components/skeleton";

export function ListCardSkeleton({
  imageClassName = "aspect-square",
  tags = false,
}: {
  imageClassName?: string;
  tags?: boolean;
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
        {tags ? <Skeleton className="h-4 w-1/2" /> : null}
      </CardHeader>
    </Card>
  );
}
