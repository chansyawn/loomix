import type { ComponentProps, ReactNode } from "react";
import type { GridLayout } from "./grid-layout";
import type { ListLayout } from "./layout";
import { ListTable } from "./table";
import { VirtualGrid } from "./virtual-grid";

export function ListResults<T extends object>({
  layout,
  grid,
  virtual = false,
  renderCard,
  empty,
  ...table
}: ComponentProps<typeof ListTable<T>> & {
  layout: ListLayout;
  grid: GridLayout;
  virtual?: boolean;
  renderCard: (row: T) => ReactNode;
  empty: ReactNode;
}) {
  if (table.rows.length === 0) return empty;
  if (layout === "table") return <ListTable {...table} />;
  if (virtual)
    return (
      <VirtualGrid
        key={table.resultKey}
        rows={table.rows}
        getKey={table.getRowId}
        renderCard={renderCard}
        layout={grid}
      />
    );

  return (
    <div className={grid.className}>
      {table.rows.map((row) => (
        <div key={table.getRowId(row)} className="min-w-0 [&>div]:h-full">
          {renderCard(row)}
        </div>
      ))}
    </div>
  );
}
