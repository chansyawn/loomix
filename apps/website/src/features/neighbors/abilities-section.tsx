import { Badge } from "@/ui/components/badge";
import type { NeighborDetail } from "./data";

export function NeighborAbilitiesSection({ neighbor }: { neighbor: NeighborDetail }) {
  const { abilities } = neighbor;
  return (
    <section id="abilities" className="scroll-mt-4 space-y-4" aria-labelledby="abilities-heading">
      <h2 id="abilities-heading" className="text-lg font-semibold">
        能力与亲密度
      </h2>
      {abilities.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {abilities.map((ability) => (
            <article key={ability.key} className="min-w-0 space-y-2 rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{ability.name}</h3>
                <Badge variant="outline">亲密度 {ability.unlockLevel} 级解锁</Badge>
              </div>
              {ability.description && (
                <p className="text-sm/6 wrap-anywhere text-muted-foreground">
                  {ability.description}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border p-6 text-muted-foreground">当前资料暂未收录能力信息</p>
      )}
    </section>
  );
}
