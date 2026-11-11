import { Link } from "@tanstack/react-router";
import { Card, CardDescription, CardHeader, CardTitle } from "@/ui/components/card";
import type { NeighborDetail } from "./data";
import { NeighborImage } from "./image";
import { useNeighborsOrigin } from "./navigation";

export function NeighborCard({ neighbor }: { neighbor: NeighborDetail }) {
  const origin = useNeighborsOrigin();
  return (
    <Card padding="flush" interactive role="article" className="relative min-w-0">
      <div className="mx-2 mt-2 shrink-0 overflow-hidden rounded-md">
        <NeighborImage
          image={neighbor.image}
          name={`${neighbor.name}的星湾插画`}
          className="aspect-156/41 bg-muted/50"
        />
      </div>
      <CardHeader>
        <CardTitle className="min-w-0">
          <h2
            className="truncate [&>a]:outline-none [&>a]:after:absolute [&>a]:after:inset-0 [&>a]:after:rounded-xl"
            title={neighbor.name}
          >
            <Link
              to="/neighbors/$id"
              params={{ id: String(neighbor.id) }}
              state={{ neighborsOrigin: origin }}
            >
              {neighbor.name}
            </Link>
          </h2>
        </CardTitle>
        {neighbor.stars.map((star) => (
          <CardDescription key={star.key}>
            {star.name}
            <span className="mt-1 block text-xs">
              {star.galaxy ? `${star.galaxy}星系` : "星系资料暂未收录"}
            </span>
          </CardDescription>
        ))}
      </CardHeader>
    </Card>
  );
}
