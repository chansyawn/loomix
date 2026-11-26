import { cn } from "cn";
import { useId, useState, type ComponentProps, type CSSProperties, type PointerEvent } from "react";
import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { GameplayRelationItem } from "@/features/omnidex/gameplay-relation-item";
import {
  flowerCardHeight,
  flowerCardMaxWidth,
  flowerHybridizationLayout,
} from "./flower-hybridization-layout";
import { FlowerHybridizationViewport } from "./flower-hybridization-viewport";
import type { FlowerHybridizationSeries } from "./model";

export const flowerHybridizationSectionId = "flower-hybridization";

function FlowerHybridizationCard({
  name,
  image,
  destination,
  style,
  highlighted,
  reference = false,
}: Pick<ComponentProps<typeof GameplayRelationItem>, "name" | "image" | "destination"> & {
  style: CSSProperties;
  highlighted?: boolean;
  reference?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute w-max rounded-lg focus-within:z-10",
        reference
          ? "outline-1 -outline-offset-1 outline-border outline-dashed"
          : "-translate-x-1/2",
        highlighted && "outline-2 outline-ring",
      )}
      style={{ ...style, maxWidth: flowerCardMaxWidth }}
    >
      <GameplayRelationItem name={name} image={image} destination={destination} />
    </div>
  );
}

export function FlowerHybridization({
  series,
  currentId,
}: {
  series: FlowerHybridizationSeries[];
  currentId?: number;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {series.map((group) => (
        <FlowerHybridizationGraph
          key={`${group.id}:${currentId}`}
          group={group}
          layout={flowerHybridizationLayout(group)}
          currentId={currentId}
        />
      ))}
    </div>
  );
}

function FlowerHybridizationGraph({
  group,
  layout,
  currentId,
}: {
  group: FlowerHybridizationSeries;
  layout: ReturnType<typeof flowerHybridizationLayout>;
  currentId?: number;
}) {
  const markerId = useId();
  const [hoveredId, setHoveredId] = useState<number>();
  if (!layout) return <p className="text-sm text-muted-foreground">暂时无法显示杂交谱系。</p>;

  const parentIds = new Set(
    group.recipes
      .filter(({ productItemId }) => productItemId === hoveredId)
      .flatMap(({ parentItemIds }) => parentItemIds),
  );
  const members = new Map(group.members.map((flower) => [flower.id, flower]));

  function destinationFor(id: number) {
    return {
      ...catalogEntryLocation({ id }),
      onPointerEnter: (event: PointerEvent<HTMLAnchorElement>) => {
        if (event.pointerType !== "touch") setHoveredId(id);
      },
      onPointerLeave: () => setHoveredId(undefined),
    };
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border bg-background p-2">
      <FlowerHybridizationViewport
        width={layout.width}
        height={layout.height}
        label={`${group.name}杂交谱系`}
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          width={layout.width}
          height={layout.height}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 2 1 L 6 4 L 2 7" stroke="currentColor" className="text-border" />
            </marker>
          </defs>
          {layout.links.map(({ junction, inputs, referenceStem, outputPath }) => (
            <g
              key={`${junction.x}:${junction.y}`}
              className="text-border opacity-65"
              stroke="currentColor"
              strokeWidth={1.3}
            >
              {inputs.map(({ id, path }) => (
                <path key={id} d={path} />
              ))}
              {referenceStem && <path d={referenceStem} strokeDasharray="2 2" />}
              <path d={outputPath} markerEnd={`url(#${markerId})`} />
            </g>
          ))}
        </svg>
        {layout.nodes.map(({ id, centerX, y }) => {
          const { image, name } = members.get(id)!;
          const current = id === currentId;
          const parents = group.recipes
            .filter(({ productItemId }) => productItemId === id)
            .map(({ parentItemIds: [first, second] }) => {
              const firstName = members.get(first)!.name;
              return first === second
                ? `${firstName} ×2`
                : `${firstName}与${members.get(second)!.name}`;
            });
          return (
            <FlowerHybridizationCard
              key={id}
              name={name}
              image={image}
              destination={{
                ...destinationFor(id),
                "aria-current": current ? "page" : undefined,
                "aria-description": parents.length
                  ? `亲本组合为${parents.join("，或")}`
                  : undefined,
              }}
              style={{ left: centerX, top: y }}
              highlighted={parentIds.has(id)}
            />
          );
        })}
        {layout.links.map(({ junction, label, references, productId }) => (
          <div key={`${junction.x}:${junction.y}`}>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute flex size-5 -translate-1/2 items-center justify-center rounded-full border border-border bg-background text-[0.625rem] font-semibold text-muted-foreground"
              style={{ left: junction.x, top: junction.y }}
            >
              {label}
            </span>
            {references.map(({ id, edgeX }) => {
              const { image, name } = members.get(id)!;
              return (
                <FlowerHybridizationCard
                  key={id}
                  reference
                  name={name}
                  image={image}
                  destination={{
                    ...destinationFor(id),
                    "aria-label": `${name}（配方亲本）`,
                  }}
                  style={{
                    ...(edgeX < junction.x ? { right: layout.width - edgeX } : { left: edgeX }),
                    top: junction.y - flowerCardHeight / 2,
                  }}
                  highlighted={hoveredId === productId}
                />
              );
            })}
          </div>
        ))}
      </FlowerHybridizationViewport>
    </div>
  );
}
