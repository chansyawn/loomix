import { useElementScrollRestoration } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef, useState } from "react";
import type { FurnitureItem, FurnitureSet } from "@petit-orbit/content-schema";
import { FurnitureCard, FurnitureSetCard } from "./furniture-card";
import type { View } from "./search";

type GridProps = {
  rows: (FurnitureItem | FurnitureSet)[];
  view: View;
};

type Geometry = {
  width: number;
  scrollMargin: number;
  scrollElement: HTMLDivElement;
};

export function FurnitureVirtualGrid({ rows, view }: GridProps) {
  const container = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  useLayoutEffect(() => {
    const element = container.current;
    const scrollElement = element?.closest<HTMLDivElement>("[data-scroll-restoration-id]");
    if (!element || !scrollElement) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      const scrollMargin =
        rect.top -
        scrollElement.getBoundingClientRect().top -
        scrollElement.clientTop +
        scrollElement.scrollTop;
      setGeometry((previous) =>
        previous?.width === rect.width && previous.scrollMargin === scrollMargin
          ? previous
          : { width: rect.width, scrollMargin, scrollElement },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(scrollElement);
    if (element.parentElement) observer.observe(element.parentElement);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="mb-8">
      {geometry && geometry.width > 0 && (
        <VirtualRows rows={rows} view={view} geometry={geometry} />
      )}
    </div>
  );
}

function VirtualRows({ rows, view, geometry }: GridProps & { geometry: Geometry }) {
  const { width, scrollMargin, scrollElement } = geometry;
  const measuredWidth = useRef(width);
  const breakpoints = view === "items" ? [336, 540, 740, 940, 1140] : [600, 960];
  const columns = 1 + breakpoints.filter((breakpoint) => width >= breakpoint).length;
  const cardWidth = (width - (columns - 1) * 16) / columns;
  const scrollEntry = useElementScrollRestoration({ id: "wiki-content" });
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: Math.ceil(rows.length / columns),
    getScrollElement: () => scrollElement,
    estimateSize: () => (view === "items" ? cardWidth + 100 : cardWidth / 2 + 180),
    getItemKey: (index) =>
      rows
        .slice(index * columns, (index + 1) * columns)
        .map((row) => row.id)
        .join(":"),
    initialOffset: scrollEntry?.scrollY ?? scrollElement.scrollTop,
    scrollMargin,
    gap: 16,
    overscan: 3,
  });

  useLayoutEffect(() => {
    if (measuredWidth.current === width) return;
    measuredWidth.current = width;
    // Row refs reattach on the next commit to refill the cleared size cache.
    virtualizer.measure();
  }, [virtualizer, width]);

  return (
    <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((virtualRow) => (
        <div
          key={virtualRow.key}
          ref={(element) => virtualizer.measureElement(element)}
          data-index={virtualRow.index}
          className="absolute top-0 left-0 grid w-full gap-4"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            transform: `translateY(${virtualRow.start - scrollMargin}px)`,
          }}
        >
          {rows
            .slice(virtualRow.index * columns, (virtualRow.index + 1) * columns)
            .map((row) =>
              "category" in row ? (
                <FurnitureCard key={row.id} item={row} />
              ) : (
                <FurnitureSetCard key={row.id} set={row} />
              ),
            )}
        </div>
      ))}
    </div>
  );
}
