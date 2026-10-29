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
      media="flush"
      interactive
      role="article"
      className={cn("relative min-w-0", className)}
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
      {footer && <CardFooter className="mt-auto">{footer}</CardFooter>}
    </Card>
  );
}
