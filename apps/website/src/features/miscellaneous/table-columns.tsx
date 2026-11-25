import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { Link } from "@tanstack/react-router";
import type { MiscellaneousItem } from "../omnidex-view";
import { recordColumns } from "../omnidex/table-columns";
import { textColumn, tableLinkClassName } from "../list-page/table-columns";
import type { ListColumn } from "../list-page/table-columns";
import { useOmnidexOrigin } from "@/features/omnidex/navigation";

export type MiscellaneousRow = MiscellaneousItem;

function NameLink({ record }: { record: MiscellaneousRow }) {
  const origin = useOmnidexOrigin();
  return (
    <Link
      {...catalogEntryLocation(record)}
      state={{ omnidexOrigin: origin }}
      className={tableLinkClassName}
      title={record.name}
    >
      {record.name}
    </Link>
  );
}

export function miscellaneousTableColumns(): ListColumn<MiscellaneousRow>[] {
  const common = recordColumns<MiscellaneousRow>((record) => <NameLink record={record} />);
  return [
    ...common,
    textColumn("id", "编号", 112, (record) => record.id),
    textColumn("description", "描述", 320, (record) => record.description),
  ];
}
