import { Badge } from "@/ui/components/badge";
import { Item, ItemContent, ItemMedia } from "@/ui/components/item";
import type { NeighborDetail } from "./data";
import { NeighborImage } from "./image";

export function NeighborHouseSection({
  stages,
}: {
  stages: NonNullable<NeighborDetail["house"]>["stages"];
}) {
  return (
    <div className="grid gap-3 @min-[34rem]/detail-content:grid-cols-2">
      {stages.map((stage) => (
        <Item key={stage.id} render={<article />} variant="outline" className="min-w-0 items-start">
          <ItemMedia>
            <NeighborImage
              image={stage.image}
              name={`${stage.name}插图`}
              className="size-20 rounded-lg bg-muted sm:size-24"
            />
          </ItemMedia>
          <ItemContent className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 font-medium">
              <h3 className="min-w-0 wrap-anywhere">{stage.name}</h3>
              <Badge variant="outline">等级 {stage.level}</Badge>
            </div>
            {stage.description && (
              <p className="wrap-anywhere whitespace-pre-line text-muted-foreground">
                {stage.description}
              </p>
            )}
          </ItemContent>
        </Item>
      ))}
    </div>
  );
}
