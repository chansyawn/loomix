import { useElementScrollRestoration } from "@tanstack/react-router";
import {
  useTable,
  createColumnHelper,
  rowSortingFeature,
  tableFeatures,
  type ReactTable,
  type Row,
  type SortingState,
  type OnChangeFn,
} from "@tanstack/react-table";
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
import type { CollectionColumn } from "./table-columns";
import { useScrollGeometry } from "./use-scroll-geometry";

const collectionTableFeatures = tableFeatures({ rowSortingFeature });
type CollectionTableInstance<T extends object> = ReactTable<typeof collectionTableFeatures, T>;
type TableRowModel<T extends object> = Row<typeof collectionTableFeatures, T>;
const estimatedRowHeight = 64;

export function CollectionTable<T extends object>({
  resultKey,
  rows,
  columns: definitions,
  getRowId,
  label,
  sorting,
  onSortingChange,
}: {
  resultKey: string;
  rows: T[];
  columns: CollectionColumn<T>[];
  getRowId: (record: T) => string;
  label: string;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
}) {
  const helper = createColumnHelper<typeof collectionTableFeatures, T>();
  const columns = helper.columns(
    definitions.map((column) =>
      helper.accessor((record) => column.value?.(record), {
        id: column.id,
        header: column.header,
        enableSorting: column.sortable ?? false,
        cell: ({ row }) => column.cell(row.original),
      }),
    ),
  );
  const widths = Object.fromEntries(definitions.map((column) => [column.id, column.width]));
  const table = useTable({
    features: collectionTableFeatures,
    data: rows,
    columns,
    getRowId,
    defaultColumn: { enableSorting: false },
    manualSorting: true,
    enableMultiSort: false,
    sortDescFirst: false,
    state: { sorting },
    onSortingChange,
  });
  const leafColumns = table.getAllLeafColumns();
  const width = leafColumns.reduce((total, column) => total + widths[column.id]!, 0);

  return (
    <div className="mb-8 overflow-hidden rounded-xl border">
      <Table
        aria-label={label}
        aria-rowcount={rows.length + 1}
        className="table-fixed"
        style={{ minWidth: width }}
      >
        <colgroup>
          {leafColumns.map((column) => (
            <col key={column.id} style={{ width: widths[column.id] }} />
          ))}
        </colgroup>
        <TableHeader>
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
        <CollectionTableBody key={resultKey} table={table} rows={table.getRowModel().rows} />
      </Table>
    </div>
  );
}

function CollectionTableBody<T extends object>({
  table,
  rows,
}: {
  table: CollectionTableInstance<T>;
  rows: TableRowModel<T>[];
}) {
  "use no memo";
  // Virtual v3 mutates a stable instance; its range must be read on every scroll render.
  const { container: body, geometry } = useScrollGeometry<HTMLTableSectionElement>();
  const scrollEntry = useElementScrollRestoration({ id: "wiki-content" });
  const virtual = rows.length > 50;

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
