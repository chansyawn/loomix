import { Button } from "@/ui/components/button";
import { useDetailResource } from "../detail-page/use-detail-resource";
import { GameplayRelationItem } from "../omnidex/gameplay-relation-item";
import type { readOutfitNeighbor } from "./detail";

export type ReadOutfitOwner = () => ReturnType<typeof readOutfitNeighbor>;

export function OutfitOwner({ read }: { read: ReadOutfitOwner }) {
  const state = useDetailResource(read);
  if (state?.status === "error")
    return (
      <span>
        友邻资料暂时无法加载{" "}
        <Button variant="link" size="sm" onClick={state.retry}>
          重试
        </Button>
      </span>
    );
  if (state?.status !== "ready") return <span role="status">正在加载友邻</span>;
  const neighbor = state.value;
  return neighbor ? (
    <GameplayRelationItem
      name={neighbor.name}
      image={neighbor.image}
      variant="inline"
      destination={{ to: "/neighbors/$id", params: { id: String(neighbor.id) } }}
    />
  ) : (
    "友邻资料暂未收录"
  );
}
