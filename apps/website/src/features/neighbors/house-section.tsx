import { Badge } from "@/ui/components/badge";
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
        <article key={stage.id} className="flex min-w-0 items-start gap-3 rounded-2xl border p-3">
          <NeighborImage
            image={stage.image}
            name={`${stage.name}插图`}
            className="size-20 shrink-0 rounded-lg bg-muted/30 sm:size-24"
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{stage.name}</h3>
              <Badge variant="outline">等级 {stage.level}</Badge>
            </div>
            {stage.description && (
              <p className="text-sm/6 wrap-anywhere whitespace-pre-line text-muted-foreground">
                {stage.description}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
