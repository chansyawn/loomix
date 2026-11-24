import type { ComponentProps, ReactNode } from "react";
import { cn } from "cn";
import { Card, CardHeader, CardMedia, CardTitle } from "@/ui/components/card";

type ListCardProps = Pick<ComponentProps<"div">, "className" | "ref"> & {
  name: string;
  image: ReactNode;
  imageOverlay?: ReactNode;
  titleLink: ReactNode;
  tags?: string | null;
};

export function ListCard({
  name,
  image,
  imageOverlay,
  titleLink,
  tags,
  className,
  ref,
}: ListCardProps) {
  return (
    <Card ref={ref} role="article" className={cn("relative min-w-0", className)}>
      <CardMedia>
        {image}
        {imageOverlay}
      </CardMedia>
      <CardHeader>
        <CardTitle className="min-w-0">
          <h2
            className="truncate [&>a]:outline-none [&>a]:after:absolute [&>a]:after:inset-0 [&>a]:after:rounded-xl [&>a:focus-visible]:after:z-20 [&>a:focus-visible]:after:inset-ring-2 [&>a:focus-visible]:after:inset-ring-ring"
            title={name}
          >
            {titleLink}
          </h2>
        </CardTitle>
        {tags?.trim() ? (
          <p className="truncate text-xs text-muted-foreground" title={tags}>
            {tags}
          </p>
        ) : null}
      </CardHeader>
    </Card>
  );
}
