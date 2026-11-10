import { Link } from "@tanstack/react-router";
import type { MiscellaneousItem } from "../collection-view";
import { recordColumns, textColumn, tableLinkClassName } from "../collection/table-columns";
import type { CollectionColumn } from "../collection/table-columns";
import { useCollectionOrigin } from "@/features/collection/navigation";

export type MiscellanyRow = MiscellaneousItem;

function NameLink({ record }: { record: MiscellanyRow }) {
  const origin = useCollectionOrigin();
  return (
    <Link
      to={"/collections/records/$id"}
      params={{ id: String(record.id) }}
      state={{ collectionOrigin: origin }}
      className={tableLinkClassName}
      title={record.name}
    >
      {record.name}
    </Link>
  );
}

export function miscellanyTableColumns(): CollectionColumn<MiscellanyRow>[] {
  const common = recordColumns<MiscellanyRow>((record) => <NameLink record={record} />);
  return [
    ...common,
    textColumn("id", "编号", 112, (record) => record.id),
    textColumn("acquisition", "获取途径", 320, (record) => record.acquisition),
    textColumn("description", "描述", 320, (record) => record.description),
  ];
}
