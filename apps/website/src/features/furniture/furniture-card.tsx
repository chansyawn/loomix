import { ImageOffIcon, LayersIcon } from "lucide-react";
import { useState } from "react";
import type { FurnitureItem, FurnitureSet } from "@petit-orbit/content-schema";
import { Badge } from "@/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { qualityNames } from "./query";

const qualityColors = [
  "bg-stone-400",
  "bg-lime-600",
  "bg-sky-500",
  "bg-violet-400",
  "bg-amber-500",
];

function FurnitureImage({
  image,
  name,
  scene = false,
}: {
  image: string | null;
  name: string;
  scene?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-muted ${scene ? "aspect-2/1" : "aspect-square"}`}
    >
      {image && !failed ? (
        <img
          src={`/resources/${image}`}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={`h-full w-full ${scene ? "object-cover" : "object-contain p-5"}`}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageOffIcon className="size-7 opacity-40" />
          <span className="text-xs">暂无图片</span>
        </div>
      )}
    </div>
  );
}

export function QualityBadge({ quality }: { quality: number | null }) {
  if (quality === null) return null;
  return (
    <Badge variant="outline">
      <span className={`size-1.5 rounded-full ${qualityColors[quality]}`} />
      {qualityNames[quality]}
    </Badge>
  );
}

export function FurnitureCard({ item }: { item: FurnitureItem }) {
  return (
    <Card size="sm" role="article" className="min-w-0 pt-0">
      <FurnitureImage key={item.image} image={item.image} name={item.name} />
      <CardHeader>
        <CardTitle>
          <h2 className="truncate" title={item.name}>
            {item.name}
          </h2>
        </CardTitle>
        <CardDescription className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          {item.type && (
            <span className="min-w-0 truncate text-xs" title={item.type}>
              {item.type}
            </span>
          )}
          <QualityBadge quality={item.quality} />
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export function FurnitureSetCard({ set }: { set: FurnitureSet }) {
  return (
    <Card size="sm" role="article" className="min-w-0 pt-0">
      <FurnitureImage key={set.image} image={set.image} name={set.name} scene />
      <CardHeader>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <CardTitle className="min-w-0">
            <h2 className="truncate" title={set.name}>
              {set.name}
            </h2>
          </CardTitle>
          <QualityBadge quality={set.quality} />
        </div>
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
