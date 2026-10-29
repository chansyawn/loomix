import { Link } from "@tanstack/react-router";
import type { NeighborDetail } from "./data";
import { NeighborImage } from "./image";
import { useNeighborsOrigin } from "./navigation";

export function NeighborCard({ neighbor }: { neighbor: NeighborDetail }) {
  const origin = useNeighborsOrigin();
  return (
    <Link
      to="/neighbors/$id"
      params={{ id: String(neighbor.id) }}
      state={{ neighborsOrigin: origin }}
      className="group min-w-0 overflow-hidden rounded-3xl border bg-card p-2 transition-[translate,box-shadow,border-color] duration-180 ease-out outline-none hover:border-foreground/15 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none dark:hover:border-foreground/25"
    >
      <NeighborImage
        image={neighbor.image}
        name={`${neighbor.name}的星湾插画`}
        className="aspect-156/41"
      />
      <div className="space-y-2 px-2 py-4">
        <h2 className="text-lg font-semibold group-hover:underline">{neighbor.name}</h2>
        {neighbor.stars.map((star) => (
          <p key={star.key} className="text-sm text-muted-foreground">
            {star.name}
            <span className="mt-1 block text-xs">
              {star.galaxy ? `${star.galaxy}星系` : "星系资料暂未收录"}
            </span>
          </p>
        ))}
      </div>
    </Link>
  );
}
