import type { ReactNode } from "react";
import { Skeleton } from "@/ui/components/skeleton";
import { QualityBadge } from "./quality";
import { RecordImage } from "./record-image";
import { TextCell, type ListColumn } from "../list-page/table-columns";

export function recordColumns<
  T extends { name: string; image: string | null; quality: number | null },
>(link: (record: T) => ReactNode): ListColumn<T>[] {
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
            <RecordImage image={record.image} name={record.name} inset="sm" fallback="icon" />
          </div>
          {link(record)}
        </div>
      ),
      skeleton: (
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0" />
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
      skeleton: <Skeleton className="h-5 w-14" />,
    },
  ];
}

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
