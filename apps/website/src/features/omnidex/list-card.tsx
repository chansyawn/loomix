import type { ComponentProps, ReactNode } from "react";
import { cn } from "cn";
import { Card, CardDescription, CardHeader, CardMedia, CardTitle } from "@/ui/components/card";
import { QualityBar } from "./quality";

type ListCardProps = Pick<ComponentProps<"div">, "className" | "ref"> & {
  name: string;
  image: ReactNode;
  quality: number | null;
  titleLink: ReactNode;
  description?: string | null;
  tags?: string | null;
};

export function ListCard({
  name,
  image,
  quality,
  titleLink,
  description,
  tags,
  className,
  ref,
}: ListCardProps) {
  return (
    <Card ref={ref} role="article" className={cn("relative min-w-0", className)}>
      <CardMedia>
        {image}
        <QualityBar quality={quality} />
      </CardMedia>
      <CardHeader>
        <CardTitle className="min-w-0">
          <h2
            className="truncate [&>a]:outline-none [&>a]:after:absolute [&>a]:after:inset-0 [&>a]:after:rounded-xl"
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
      </CardHeader>
    </Card>
  );
}
