import type { ComponentProps, ReactNode } from "react";
import { cn } from "cn";
import { Card, CardHeader, CardMedia } from "@/ui/components/card";

type ListCardProps = Pick<ComponentProps<"div">, "className" | "ref"> & {
  name: string;
  image: ReactNode;
  imageOverlay?: ReactNode;
  titleLink: ReactNode;
  titleAs?: "h2" | "p";
  tags?: string | null;
};

export function ListCard({
  name,
  image,
  imageOverlay,
  titleLink,
  titleAs: Title = "h2",
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
        <Title
          className="min-w-0 truncate font-heading text-sm/snug font-medium [&>a]:outline-none [&>a]:after:absolute [&>a]:after:inset-0 [&>a]:after:rounded-xl [&>a:focus-visible]:after:z-20 [&>a:focus-visible]:after:inset-ring-2 [&>a:focus-visible]:after:inset-ring-ring"
          title={name}
        >
          {titleLink}
        </Title>
        {tags?.trim() ? (
          <p className="truncate text-xs text-muted-foreground" title={tags}>
            {tags}
          </p>
        ) : null}
      </CardHeader>
    </Card>
  );
}
