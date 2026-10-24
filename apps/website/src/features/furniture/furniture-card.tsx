import { LayersIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { FurnitureImage } from "./furniture-image";
import { useFurnitureOrigin } from "./detail-navigation";
import type { FurnitureItem, FurnitureSet } from "../collection-view.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { QualityBar } from "@/ui/collection/quality";
export { QualityBadge } from "@/ui/collection/quality";

export function FurnitureCard({ item }: { item: FurnitureItem }) {
  const origin = useFurnitureOrigin();
  return (
    <Card
      size="sm"
      role="article"
      className="relative min-w-0 pt-0 transition-shadow hover:ring-2 hover:ring-primary/30 focus-within:ring-2 focus-within:ring-ring"
    >
      <div className="relative">
        <FurnitureImage key={item.image} image={item.image} name={item.name} />
        <QualityBar quality={item.quality} />
      </div>
      <CardHeader>
        <CardTitle>
          <h2 className="truncate" title={item.name}>
            <Link
              to="/collection/furniture/items/$id"
              params={{ id: String(item.id) }}
              state={{ furnitureOrigin: origin }}
              className="outline-none after:absolute after:inset-0 after:rounded-4xl"
            >
              {item.name}
            </Link>
          </h2>
        </CardTitle>
        <CardDescription className="min-w-0">
          {item.type && (
            <span className="min-w-0 truncate text-xs" title={item.type}>
              {item.type}
            </span>
          )}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export function FurnitureSetCard({ set }: { set: FurnitureSet }) {
  const origin = useFurnitureOrigin();
  return (
    <Card
      size="sm"
      role="article"
      className="relative min-w-0 pt-0 transition-shadow hover:ring-2 hover:ring-primary/30 focus-within:ring-2 focus-within:ring-ring"
    >
      <div className="relative">
        <FurnitureImage key={set.image} image={set.image} name={set.name} scene />
        <QualityBar quality={set.quality} />
      </div>
      <CardHeader>
        <CardTitle className="min-w-0">
          <h2 className="truncate" title={set.name}>
            <Link
              to="/collection/furniture/sets/$id"
              params={{ id: String(set.id) }}
              state={{ furnitureOrigin: origin }}
              className="outline-none after:absolute after:inset-0 after:rounded-4xl"
            >
              {set.name}
            </Link>
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="line-clamp-2 min-h-10">{set.description}</CardDescription>
      </CardContent>
      <CardFooter className="mt-auto gap-1.5 text-xs text-muted-foreground">
        <LayersIcon className="size-3.5" />
        {set.componentIds === null ? "成员信息未提供" : `${set.componentIds.length} 件家具`}
      </CardFooter>
    </Card>
  );
}
