import type { ComponentProps, ReactNode } from "react";
import { cn } from "cn";
import { Card, CardDescription, CardHeader, CardTitle } from "@/ui/components/card";
import { QualityBar } from "./quality";

type CollectionCardProps = Pick<ComponentProps<"div">, "className" | "ref"> & {
  name: string;
  image: ReactNode;
  quality: number | null;
  titleLink: ReactNode;
  description?: string | null;
  tags?: string | null;
};

export function CollectionCard({
  name,
  image,
  quality,
  titleLink,
  description,
  tags,
  className,
  ref,
}: CollectionCardProps) {
  return (
    <Card
      ref={ref}
      padding="flush"
      interactive
      role="article"
      className={cn("relative min-w-0", className)}
    >
      <div className="relative shrink-0">
        {image}
        <QualityBar quality={quality} />
      </div>
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
            // oxlint-disable-next-line shadcn/no-restyle -- 收藏卡片的描述固定预留两行空间。
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
