import { useLayoutEffect, useRef, useState } from "react";
import { useElementScrollRestoration } from "@tanstack/react-router";
import { useTable, type ReactTable, type Row, type SortingState } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDownIcon, ArrowDownUpIcon, ArrowUpIcon } from "lucide-react";
import { Button } from "@/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/table";
import type { FurnitureSet } from "../collection-view";
import {
  furnitureColumnWidths,
  furnitureTableColumns,
  furnitureTableFeatures,
  type FurnitureRow,
} from "./furniture-table-columns";
import type { Sort, View } from "./search";

type FurnitureTableInstance = ReactTable<typeof furnitureTableFeatures, FurnitureRow>;
type TableRowModel = Row<typeof furnitureTableFeatures, FurnitureRow>;
type Geometry = { scrollElement: HTMLDivElement; scrollMargin: number };
const estimatedRowHeight = 64;

export function FurnitureTable({
  resultKey,
  rows,
  view,
  memberships,
  sort,
  onSortChange,
}: {
  resultKey: string;
  rows: FurnitureRow[];
  view: View;
  memberships: Map<number, FurnitureSet[]>;
  sort: Sort;
  onSortChange: (sort: Sort) => void;
}) {
  const columns = furnitureTableColumns(view, memberships);
  const sorting: SortingState =
    sort === "original"
      ? []
      : [
          {
            id: sort.startsWith("name") ? "name" : "quality",
            desc: sort.endsWith("desc"),
          },
        ];
  const table = useTable({
    features: furnitureTableFeatures,
    data: rows,
    columns,
    getRowId: (row) => String(row.id),
    defaultColumn: { enableSorting: false },
    manualSorting: true,
    enableMultiSort: false,
    sortDescFirst: false,
    state: { sorting },
    onSortingChange: (updater) => {
      const [next] = typeof updater === "function" ? updater(sorting) : updater;
      onSortChange(
        next && (next.id === "name" || next.id === "quality")
          ? `${next.id}-${next.desc ? "desc" : "asc"}`
          : "original",
      );
    },
  });
  const leafColumns = table.getAllLeafColumns();
  const width = leafColumns.reduce((total, column) => total + furnitureColumnWidths[column.id]!, 0);

  return (
    <div className="mb-8 overflow-hidden rounded-xl border">
      <Table
        aria-label={view === "items" ? "家具单件表格" : "家具套装表格"}
        aria-rowcount={rows.length + 1}
        className="table-fixed"
        style={{ minWidth: width }}
      >
        <colgroup>
          {leafColumns.map((column) => (
            <col key={column.id} style={{ width: furnitureColumnWidths[column.id] }} />
          ))}
        </colgroup>
        <TableHeader className="bg-muted/50">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} aria-rowindex={1}>
              {group.headers.map((header) => {
                const direction = sorting.find((entry) => entry.id === header.column.id);
                const Icon = direction
                  ? direction.desc
                    ? ArrowDownIcon
                    : ArrowUpIcon
                  : ArrowDownUpIcon;
                return (
                  <TableHead
                    key={header.id}
                    scope="col"
                    aria-sort={
                      header.column.getCanSort()
                        ? direction
                          ? direction.desc
                            ? "descending"
                            : "ascending"
                          : "none"
                        : undefined
                    }
                  >
                    {header.column.getCanSort() ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <table.FlexRender header={header} />
                        <Icon className="size-3.5" />
                      </Button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <FurnitureTableBody key={resultKey} table={table} rows={table.getRowModel().rows} />
      </Table>
    </div>
  );
}

function FurnitureTableBody({
  table,
  rows,
}: {
  table: FurnitureTableInstance;
  rows: TableRowModel[];
}) {
  "use no memo";
  // Virtual v3 mutates a stable instance; its range must be read on every scroll render.
  const body = useRef<HTMLTableSectionElement>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const scrollEntry = useElementScrollRestoration({ id: "wiki-content" });
  const virtual = rows.length > 50;

  useLayoutEffect(() => {
    const element = body.current;
    const scrollElement = element?.closest<HTMLDivElement>("[data-scroll-restoration-id]");
    if (!element || !scrollElement || !virtual) return;
    const measure = () => {
      const scrollMargin =
        element.getBoundingClientRect().top -
        scrollElement.getBoundingClientRect().top -
        scrollElement.clientTop +
        scrollElement.scrollTop;
      setGeometry((previous) =>
        previous?.scrollMargin === scrollMargin && previous.scrollElement === scrollElement
          ? previous
          : { scrollElement, scrollMargin },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scrollElement);
    if (element.parentElement) observer.observe(element.parentElement);
    return () => observer.disconnect();
  }, [virtual]);

  const virtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    getScrollElement: () => geometry?.scrollElement ?? null,
    estimateSize: () => estimatedRowHeight,
    getItemKey: (index) => rows[index]!.id,
    scrollMargin: geometry?.scrollMargin ?? 0,
    initialOffset: scrollEntry?.scrollY ?? geometry?.scrollElement.scrollTop ?? 0,
    overscan: 6,
    enabled: virtual && geometry !== null,
  });
  const items = virtualizer.getVirtualItems();
  const ready = virtual && geometry !== null && items.length > 0;
  const visibleRows = ready
    ? items.map((item) => ({ row: rows[item.index]!, index: item.index }))
    : rows.slice(0, virtual ? 20 : rows.length).map((row, index) => ({ row, index }));
  const paddingTop = ready ? Math.max(0, items[0]!.start - geometry.scrollMargin) : 0;
  const paddingBottom = ready
    ? Math.max(0, virtualizer.getTotalSize() - (items.at(-1)!.end - geometry.scrollMargin))
    : Math.max(0, (rows.length - visibleRows.length) * estimatedRowHeight);
  const columnCount = table.getAllLeafColumns().length;

  return (
    <TableBody ref={body}>
      {paddingTop > 0 && <Spacer height={paddingTop} columns={columnCount} />}
      {visibleRows.map(({ row, index }) => (
        <TableRow
          key={row.id}
          data-index={index}
          aria-rowindex={index + 2}
          ref={virtual ? (element) => virtualizer.measureElement(element) : undefined}
          className="h-16"
        >
          {row.getAllCells().map((cell) => (
            <TableCell key={cell.id}>
              <table.FlexRender cell={cell} />
            </TableCell>
          ))}
        </TableRow>
      ))}
      {paddingBottom > 0 && <Spacer height={paddingBottom} columns={columnCount} />}
    </TableBody>
  );
}

function Spacer({ height, columns }: { height: number; columns: number }) {
  return (
    <tr aria-hidden="true">
      <td colSpan={columns} className="border-0 p-0" style={{ height }} />
    </tr>
  );
}
