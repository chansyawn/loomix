import { Badge } from "@/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader } from "@/ui/components/empty";
import type { NeighborDetail } from "./data";

export function NeighborAbilitiesSection({
  abilities,
}: {
  abilities: NeighborDetail["abilities"];
}) {
  return abilities.length ? (
    <div className="grid gap-3 @min-[30rem]/detail-content:grid-cols-2">
      {abilities.map((ability) => (
        <Card key={ability.unlockLevel} role="article" size="sm" className="min-w-0">
          <CardHeader>
            <CardTitle>
              <h3 className="wrap-anywhere">{ability.name}</h3>
            </CardTitle>
            <Badge variant="outline">亲密度 {ability.unlockLevel} 级解锁</Badge>
          </CardHeader>
          {ability.description && (
            <CardContent>
              <p className="text-sm/6 wrap-anywhere text-muted-foreground">{ability.description}</p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  ) : (
    <Empty>
      <EmptyHeader>
        <EmptyDescription>当前资料暂未收录能力信息</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
