import type { ReactNode } from "react";

export interface ListColumnMetadata {
  id: string;
  header: string;
  width: number;
  sortable?: boolean;
  skeleton?: ReactNode;
}

export interface ListColumn<T> extends ListColumnMetadata {
  value?: (record: T) => string | number | null;
  cell: (record: T) => ReactNode;
}

export function TextCell({ value }: { value: string | number | null | undefined }) {
  return value !== null && value !== undefined && value !== "" ? (
    <span className="block truncate" title={String(value)}>
      {value}
    </span>
  ) : (
    <span className="text-muted-foreground">未提供</span>
  );
}

export function textColumn<T>(
  id: string,
  header: string,
  width: number,
  value: (record: T) => string | number | null | undefined,
): ListColumn<T> {
  return { id, header, width, cell: (record) => <TextCell value={value(record)} /> };
}

export const tableLinkClassName =
  "truncate font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
