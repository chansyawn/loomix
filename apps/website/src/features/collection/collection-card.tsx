import type { ComponentProps, ReactNode } from "react";
import { cn } from "cn";
import { Card, CardFooter, CardHeader, CardTitle } from "@/ui/components/card";
import { QualityBar } from "./quality";

type CollectionCardProps = Pick<ComponentProps<"div">, "className" | "ref"> & {
  name: string;
  image: ReactNode;
  quality: number | null;
  titleLink: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  headerClassName?: string;
};

export function CollectionCard({
  name,
  image,
  quality,
  titleLink,
  description,
  children,
  footer,
  headerClassName,
  className,
  ref,
}: CollectionCardProps) {
  return (
    <Card
      ref={ref}
      size="sm"
      role="article"
      className={cn(
        "relative min-w-0 pt-0 transition-[translate,box-shadow] duration-180 ease-out hover:shadow-md hover:ring-foreground/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-ring motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none dark:hover:ring-foreground/20",
        className,
      )}
    >
      <div className="relative shrink-0">
        {image}
        <QualityBar quality={quality} />
      </div>
      <CardHeader className={headerClassName}>
        <CardTitle className="min-w-0">
          <h2
            className="truncate [&>a]:outline-none [&>a]:after:absolute [&>a]:after:inset-0 [&>a]:after:rounded-xl"
            title={name}
          >
            {titleLink}
          </h2>
        </CardTitle>
        {description}
      </CardHeader>
      {children}
      {footer && (
        <CardFooter className="mt-auto gap-1.5 text-xs text-muted-foreground">{footer}</CardFooter>
      )}
    </Card>
  );
}
