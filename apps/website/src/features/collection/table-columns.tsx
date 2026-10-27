import type { ReactNode } from "react";
import { Skeleton } from "@/ui/components/skeleton";
import { QualityBadge } from "./quality";
import { RecordImage } from "./record-image";

export interface CollectionColumn<T> {
  id: string;
  header: string;
  width: number;
  sortable?: boolean;
  value?: (record: T) => string | number | null;
  cell: (record: T) => ReactNode;
  skeleton?: ReactNode;
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
): CollectionColumn<T> {
  return { id, header, width, cell: (record) => <TextCell value={value(record)} /> };
}

export function recordColumns<
  T extends { name: string; image: string | null; quality: number | null },
>(link: (record: T) => ReactNode): CollectionColumn<T>[] {
  return [
    {
      id: "name",
      header: "名称",
      width: 240,
      sortable: true,
      value: (record) => record.name,
      cell: (record) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-10 shrink-0 overflow-hidden rounded-md" aria-hidden="true">
            <RecordImage image={record.image} name={record.name} compact />
          </div>
          {link(record)}
        </div>
      ),
      skeleton: (
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-md" />
          <Skeleton className="h-4 w-24" />
        </div>
      ),
    },
    {
      id: "quality",
      header: "品阶",
      width: 112,
      sortable: true,
      value: (record) => record.quality,
      cell: (record) =>
        record.quality === null ? (
          <TextCell value={null} />
        ) : (
          <QualityBadge quality={record.quality} />
        ),
      skeleton: <Skeleton className="h-5 w-14 rounded-full" />,
    },
  ];
}

export const tableLinkClassName =
  "truncate rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function membershipStatus(hasMemberships: boolean, complete: boolean, noun: string) {
  return hasMemberships ? undefined : complete ? `未归入${noun}` : "成员信息未提供";
}

export function MembershipCell<T>({
  groups,
  complete,
  noun,
  renderLink,
}: {
  groups: T[];
  complete: boolean;
  noun: string;
  renderLink: (group: T) => ReactNode;
}) {
  const status = membershipStatus(groups.length > 0, complete, noun);
  return status ? (
    <span className="text-muted-foreground">{status}</span>
  ) : (
    <div className="flex flex-wrap gap-x-3 gap-y-1">{groups.map(renderLink)}</div>
  );
}
