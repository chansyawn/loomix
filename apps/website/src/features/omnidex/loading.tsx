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
import { ListToolbar } from "./toolbar";
import { FilterSummary } from "./filter-summary";
import type { GridLayout } from "./grid-layout";
import type { ListColumn } from "./table-columns";
import type { ListLayout } from "./layout";

export function ListLoading<V extends string, T>({
  title,
  tabs,
  view,
  layout,
  grid,
  card,
  columns,
  searchLabel,
  placeholder,
  query,
  sort,
  sortOptions,
}: {
  title: string;
  tabs?: ListTab<V>[];
  view?: V;
  layout: ListLayout;
  grid: GridLayout;
  card: ReactNode;
  columns: ListColumn<T>[];
  searchLabel: string;
  placeholder: string;
  query: string;
  sort: string;
  sortOptions: Partial<Record<string, string>>;
}) {
  return (
    <ListPage title={title} tabs={tabs} view={view} loading>
      <ListToolbar
        title={title}
        searchLabel={searchLabel}
        placeholder={placeholder}
        query={query}
        sort={sort}
        sortOptions={sortOptions}
        layout={layout}
        disabled
        filters={
          <Button variant="outline" disabled>
            <SlidersHorizontalIcon />
            筛选
          </Button>
        }
      />
      <FilterSummary status={<Skeleton className="h-4 w-24" />} chips={[]} onClear={() => {}} />
      <div aria-hidden="true">
        {layout === "table" ? (
          <div className="mb-8 overflow-hidden rounded-xl border">
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
          <div className={`${grid.className} pb-8`}>
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
