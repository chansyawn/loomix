import { Badge } from "@/ui/components/badge";
import type { NeighborDetail } from "./data";

export function NeighborAbilitiesSection({
  abilities,
}: {
  abilities: NeighborDetail["abilities"];
}) {
  return abilities.length ? (
    <div className="grid gap-3 @min-[30rem]/detail-content:grid-cols-2">
      {abilities.map((ability) => (
        <article key={ability.unlockLevel} className="min-w-0 space-y-2 rounded-xl border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{ability.name}</h3>
            <Badge variant="outline">亲密度 {ability.unlockLevel} 级解锁</Badge>
          </div>
          {ability.description && (
            <p className="text-sm/6 wrap-anywhere text-muted-foreground">{ability.description}</p>
          )}
        </article>
      ))}
    </div>
  ) : (
    <p className="rounded-2xl border p-6 text-muted-foreground">当前资料暂未收录能力信息</p>
  );
}
