import type { ClothingItem, ClothingSet, ClothingAppearance } from "../collection-view.ts";
import { Link } from "@tanstack/react-router";
import { LayersIcon } from "lucide-react";
import { CardDescription, CardContent } from "@/ui/components/card";
import { CollectionCard } from "@/features/collection/collection-card";
import { RecordImage } from "@/features/collection/record-image";
import { useClothingOrigin } from "./detail-navigation";

export function ClothingCard({
  record,
}: {
  record: ClothingItem | ClothingSet | ClothingAppearance;
}) {
  const origin = useClothingOrigin();
  const to =
    "componentIds" in record
      ? "/collection/clothing/sets/$id"
      : "styles" in record
        ? "/collection/clothing/items/$id"
        : "/collection/clothing/appearances/$id";
  return (
    <CollectionCard
      name={record.name}
      quality={record.quality}
      image={<RecordImage key={record.image} image={record.image} name={record.name} />}
      titleLink={
        <Link to={to} params={{ id: String(record.id) }} state={{ clothingOrigin: origin }}>
          {record.name}
        </Link>
      }
      className="h-full"
      headerClassName={"category" in record ? "h-12 shrink-0" : undefined}
      description={
        "category" in record && (
          <CardDescription className="min-h-4 truncate text-xs">
            {record.category ?? "分类未提供"}
          </CardDescription>
        )
      }
      footer={
        "componentIds" in record && (
          <>
            <LayersIcon className="size-3.5" />
            {record.componentIds === null
              ? "成员信息未提供"
              : `${record.componentIds.length} 件服装`}
          </>
        )
      }
    >
      {"componentIds" in record && (
        <CardContent>
          <CardDescription className="line-clamp-2 min-h-10">
            {record.description ?? "描述未提供"}
          </CardDescription>
        </CardContent>
      )}
    </CollectionCard>
  );
}
