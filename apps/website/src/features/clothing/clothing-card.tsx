import type { ClothingItem, ClothingSet, ClothingAppearance } from "@loomix/content-schema";
import { Link } from "@tanstack/react-router";
import { LayersIcon } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/ui/components/card";
import { QualityBar } from "@/ui/collection/quality";
import { RecordImage } from "@/ui/collection/record-image";
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
    <Card
      size="sm"
      role="article"
      className="relative h-full min-w-0 pt-0 transition-shadow hover:ring-2 hover:ring-primary/30 focus-within:ring-2 focus-within:ring-ring"
    >
      <div className="relative shrink-0">
        <RecordImage key={record.image} image={record.image} name={record.name} />
        <QualityBar quality={record.quality} />
      </div>
      <CardHeader className={"category" in record ? "h-12 shrink-0" : undefined}>
        <CardTitle className="min-w-0">
          <h2 className="truncate" title={record.name}>
            <Link
              to={to}
              params={{ id: String(record.id) }}
              state={{ clothingOrigin: origin }}
              className="outline-none after:absolute after:inset-0 after:rounded-4xl"
            >
              {record.name}
            </Link>
          </h2>
        </CardTitle>
        {"category" in record && (
          <CardDescription className="min-h-4 truncate text-xs">
            {record.category ?? "分类未提供"}
          </CardDescription>
        )}
      </CardHeader>
      {"componentIds" in record && (
        <>
          <CardContent>
            <CardDescription className="line-clamp-2 min-h-10">
              {record.description ?? "描述未提供"}
            </CardDescription>
          </CardContent>
          <CardFooter className="mt-auto gap-1.5 text-xs text-muted-foreground">
            <LayersIcon className="size-3.5" />
            {record.componentIds === null
              ? "成员信息未提供"
              : `${record.componentIds.length} 件服装`}
          </CardFooter>
        </>
      )}
    </Card>
  );
}
