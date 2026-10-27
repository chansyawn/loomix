import { useElementScrollRestoration } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef } from "react";
import type { Key, ReactNode } from "react";
import { gridGeometry, gridRow } from "./grid-layout";
import type { GridLayout } from "./grid-layout";
import { useScrollGeometry } from "./use-scroll-geometry";

interface GridProps<T> {
  rows: T[];
  getKey: (row: T) => Key;
  renderCard: (row: T) => ReactNode;
  layout: GridLayout;
}

export function CollectionVirtualGrid<T>(props: GridProps<T>) {
  const { container, geometry } = useScrollGeometry<HTMLDivElement>();
  return (
    <div ref={container} className="mb-8">
      {geometry && geometry.width > 0 && <VirtualRows {...props} geometry={geometry} />}
    </div>
  );
}

function VirtualRows<T>({
  rows,
  getKey,
  renderCard,
  layout,
  geometry,
}: GridProps<T> & {
  geometry: { width: number; scrollMargin: number; scrollElement: HTMLDivElement };
}) {
  "use no memo";
  // Virtual v3 exposes a mutable instance; read its range on every scroll render.
  const { width, scrollMargin, scrollElement } = geometry;
  const { columns, rowHeight } = gridGeometry(width, layout);
  const measuredWidth = useRef(width);
  const scrollEntry = useElementScrollRestoration({ id: "wiki-content" });
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: Math.ceil(rows.length / columns),
    getScrollElement: () => scrollElement,
    estimateSize: () => rowHeight,
    getItemKey: (index) => JSON.stringify(gridRow(rows, index, columns).map(getKey)),
    initialOffset: scrollEntry?.scrollY ?? scrollElement.scrollTop,
    scrollMargin,
    gap: 16,
    overscan: 3,
  });
  useLayoutEffect(() => {
    if (measuredWidth.current === width) return;
    measuredWidth.current = width;
    virtualizer.measure();
  }, [virtualizer, width]);

  return (
    <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((row) => (
        <div
          key={row.key}
          ref={layout.fixedHeight ? undefined : (element) => virtualizer.measureElement(element)}
          data-index={row.index}
          className="absolute top-0 left-0 grid w-full gap-4"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            height: layout.fixedHeight ? row.size : undefined,
            transform: `translateY(${row.start - scrollMargin}px)`,
          }}
        >
          {gridRow(rows, row.index, columns).map((record) => (
            <div key={getKey(record)} className="flex min-w-0 flex-col [&>div]:h-full">
              {renderCard(record)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
