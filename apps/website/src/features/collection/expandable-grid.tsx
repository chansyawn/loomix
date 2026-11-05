import { useEffect, useRef, useState } from "react";
import type { Key, ReactNode } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Button } from "@/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/components/collapsible";

export function CollectionExpandableGrid<T>({
  items,
  getKey,
  renderItem,
  label,
  unit,
}: {
  items: readonly T[];
  getKey: (item: T) => Key;
  renderItem: (item: T) => ReactNode;
  label: string;
  unit: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [columnCount, setColumnCount] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateColumns = () => {
      setColumnCount(getComputedStyle(grid).gridTemplateColumns.split(" ").length);
    };

    updateColumns();
    const observer = new ResizeObserver(updateColumns);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [items.length]);

  if (items.length === 0) return null;
  const visibleCount = columnCount * 3;
  const hasMore = items.length > visibleCount;
  const renderItems = (entries: readonly T[]) =>
    entries.map((item) => (
      <div key={getKey(item)} className="min-w-0" role="listitem">
        {renderItem(item)}
      </div>
    ));

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="space-y-2">
        <div
          ref={gridRef}
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-4"
          role="list"
        >
          {renderItems(items.slice(0, visibleCount))}
          {hasMore && (
            <CollapsibleContent className="contents data-closed:hidden">
              {renderItems(items.slice(visibleCount))}
            </CollapsibleContent>
          )}
        </div>
        {hasMore && (
          <CollapsibleTrigger className="mt-2" render={<Button variant="ghost" size="lg" />}>
            {expanded ? (
              <ChevronUpIcon aria-hidden="true" className="size-5" />
            ) : (
              <ChevronDownIcon aria-hidden="true" className="size-5" />
            )}
            {expanded ? `收起${label}` : `展开全部${label}`} · 共 {items.length} {unit}
          </CollapsibleTrigger>
        )}
      </div>
    </Collapsible>
  );
}
