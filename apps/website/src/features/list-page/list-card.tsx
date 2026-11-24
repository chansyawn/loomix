import type { ComponentProps, ReactNode } from "react";
import { cn } from "cn";
import { Card, CardDescription, CardHeader, CardMedia, CardTitle } from "@/ui/components/card";

type ListCardProps = Pick<ComponentProps<"div">, "className" | "ref"> & {
  name: string;
  image: ReactNode;
  imageOverlay?: ReactNode;
  titleLink: ReactNode;
  description?: string | null;
  tags?: string | null;
  children?: ReactNode;
};

export function ListCard({
  name,
  image,
  imageOverlay,
  titleLink,
  description,
  tags,
  children,
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
        {description?.trim() ? (
          <CardDescription
            // oxlint-disable-next-line shadcn/no-restyle -- 图鉴卡片的描述固定预留两行空间。
            className="line-clamp-2 min-h-10 leading-5"
            title={description}
          >
            {description}
          </CardDescription>
        ) : null}
        {tags?.trim() ? (
          <p className="truncate text-xs text-muted-foreground" title={tags}>
            {tags}
          </p>
        ) : null}
        {children}
      </CardHeader>
    </Card>
  );
}
