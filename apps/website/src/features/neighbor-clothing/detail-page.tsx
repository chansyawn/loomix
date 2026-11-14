import { Link } from "@tanstack/react-router";
import { CollectionDetailExtras, CollectionDetailLayout } from "../collection/detail-layout";
import { RecordImage } from "../collection/record-image";
import { recordLocation } from "../collection/catalog";
import type { NeighborClothingDetail } from "./detail";

export function NeighborClothingDetailPage({ detail }: { detail: NeighborClothingDetail }) {
  const { record } = detail;
  const trade = record.record.trade?.offers?.[0]?.buyPrice;
  return (
    <CollectionDetailLayout
      image={<RecordImage key={record.image} image={record.image} name={record.name} eager />}
      title={record.name}
      quality={record.quality}
      description={
        <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
          {record.description || "描述未提供"}
        </p>
      }
      fields={[
        ["部位", detail.slotName],
        ["友邻", detail.neighborName],
        ["可用体型", detail.modelSizes],
        ["配置价格", trade === undefined ? null : `${trade} 友邻服饰币`],
      ]}
    >
      <CollectionDetailExtras
        sections={
          detail.counterpartId === null
            ? []
            : [
                {
                  key: "neighbor-clothing-counterpart",
                  content: (
                    <p className="text-sm text-muted-foreground">
                      对应玩家服饰：{" "}
                      <Link
                        {...recordLocation({
                          target: { recordId: detail.counterpartId },
                        })}
                        className="underline-offset-4 hover:underline"
                      >
                        查看对应服饰
                      </Link>
                    </p>
                  ),
                },
              ]
        }
      />
    </CollectionDetailLayout>
  );
}
