import type { ReactNode } from "react";
import { SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/ui/components/button";
import { Skeleton } from "@/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/table";
import { ListPage } from "./page";
import type { ListTab } from "./page";
import { ListToolbar, type ListToolbarProps } from "./toolbar";
import { FilterSummary } from "./filter-summary";
import type { GridLayout } from "./grid-layout";
import type { ListColumnMetadata } from "./table-columns";

export function ListLoading<V extends string, S extends string>({
  title,
  tabs,
  view,
  grid,
  card,
  columns,
  toolbar,
}: {
  title?: string;
  tabs?: ListTab<V>[];
  view?: V;
  grid: GridLayout;
  card: ReactNode;
  columns: readonly ListColumnMetadata[];
  toolbar: ListToolbarProps<S>;
}) {
  return (
    <ListPage title={title ?? toolbar.title} tabs={tabs} view={view} loading>
      <ListToolbar
        {...toolbar}
        disabled
        filters={
          toolbar.filters ?? (
            <Button variant="outline" disabled>
              <SlidersHorizontalIcon />
              筛选
            </Button>
          )
        }
      />
      <FilterSummary status={<Skeleton className="h-4 w-24" />} chips={[]} onClear={() => {}} />
      <div aria-hidden="true">
        {toolbar.layout === "table" ? (
          <div className="overflow-hidden rounded-xl border">
            <Table
              className="table-fixed"
              style={{ minWidth: columns.reduce((total, column) => total + column.width, 0) }}
            >
              <colgroup>
                {columns.map((column) => (
                  <col key={column.id} style={{ width: column.width }} />
                ))}
              </colgroup>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.id}>
                      {column.sortable ? (
                        <span className="inline-flex h-8 items-center">{column.header}</span>
                      ) : (
                        column.header
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 12 }, (_, index) => (
                  <TableRow key={index} className="h-16">
                    {columns.map((column) => (
                      <TableCell key={column.id}>
                        {column.skeleton ?? <Skeleton className="h-4 w-2/3" />}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className={grid.className}>
            {Array.from({ length: 12 }, (_, index) => (
              <div key={index} className="min-w-0 [&>div]:h-full">
                {card}
              </div>
            ))}
          </div>
        )}
      </div>
    </ListPage>
  );
}
