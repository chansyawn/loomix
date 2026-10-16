import { ImageOffIcon, LayersIcon } from "lucide-react";
import { useState } from "react";
import type { FurnitureItem, FurnitureSet } from "@petit-orbit/content-schema";
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
      className={`relative flex items-center justify-center overflow-hidden bg-[#f6f5f1] dark:bg-muted ${scene ? "aspect-2/1" : "aspect-square"}`}
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
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className={`size-1.5 rounded-full ${qualityColors[quality]}`} />
      {qualityNames[quality]}
    </span>
  );
}

export function FurnitureCard({ item, sets }: { item: FurnitureItem; sets: FurnitureSet[] }) {
  const setNames = sets.map((set) => set.name).join("、");
  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card">
      <FurnitureImage key={item.image} image={item.image} name={item.name} />
      <div className="space-y-2.5 p-3.5">
        <h2 className="truncate text-sm font-semibold" title={item.name}>
          {item.name}
        </h2>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground" title={item.type ?? undefined}>
            {item.type ?? ""}
          </span>
          <QualityBadge quality={item.quality} />
        </div>
        <div className="min-h-10 space-y-1 border-t border-border/50 pt-2.5 text-[11px] leading-4 text-muted-foreground">
          {item.sources && (
            <p className="truncate" title={item.sources}>
              {item.sources}
            </p>
          )}
          {setNames && (
            <p className="flex items-center gap-1" title={setNames}>
              <LayersIcon className="size-3 shrink-0 opacity-60" />
              <span className="truncate">{setNames}</span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export function FurnitureSetCard({ set }: { set: FurnitureSet }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card">
      <FurnitureImage key={set.image} image={set.image} name={set.name} scene />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate font-semibold" title={set.name}>
            {set.name}
          </h2>
          <QualityBadge quality={set.quality} />
        </div>
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
          {set.description}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <LayersIcon className="size-3.5" />
          {set.componentIds === null ? "成员信息未提供" : `${set.componentIds.length} 件家具`}
        </p>
      </div>
    </article>
  );
}
