import { InspoCardFace } from "@/features/omnidex/inspo-card-face";
import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { GameplayRelationItem } from "@/features/omnidex/gameplay-relation-item";
import { gameplayAnchor } from "@/features/omnidex/gameplay-anchors";
import type { FurnitureDetail } from "./detail";

type Recipe = Extract<FurnitureDetail, { kind: "item" }>["recipes"][number];
export function FurnitureRecipes({
  recipes,
  productName,
}: {
  recipes: Recipe[];
  productName: string;
}) {
  return (
    <ul className="@container/recipes flex min-w-0 flex-col gap-4">
      {recipes.map((recipe) => (
        <li
          key={recipe.id}
          id={gameplayAnchor("recipe", recipe.id)}
          className="grid grid-cols-1 items-start gap-3 @min-[26rem]/recipes:grid-cols-[7.5rem_minmax(0,1fr)] @min-[26rem]/recipes:gap-4"
        >
          <InspoCardFace
            {...recipe.face}
            productName={productName}
            className="mx-auto max-w-30 @min-[26rem]/recipes:mx-0 @min-[26rem]/recipes:max-w-none"
          />
          <div className="flex min-w-0 flex-col gap-3">
            <h3 className="font-semibold">{recipe.name}</h3>
            {recipe.inspoBoxName && <p className="text-sm">所属创想卡集 · {recipe.inspoBoxName}</p>}
            {recipe.inspoBoxHint && (
              <p className="text-sm whitespace-pre-line text-muted-foreground">
                卡集获取提示 · {recipe.inspoBoxHint}
              </p>
            )}
            {recipe.sourceTrees.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-medium">此卡的来源树木</h4>
                <ul className="flex flex-wrap gap-3">
                  {recipe.sourceTrees.map((tree) => (
                    <li key={tree.id}>
                      <GameplayRelationItem
                        variant="inline"
                        name={tree.name}
                        image={tree.image}
                        destination={catalogEntryLocation(tree)}
                        note={tree.sources
                          .map((source) => (source === "felling" ? "砍树掉落" : "果实产物"))
                          .join("、")}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <h4 className="text-sm font-medium">制作材料</h4>
            {recipe.materials === null ? (
              <p className="text-sm text-muted-foreground">材料信息未确认</p>
            ) : recipe.materials.length === 0 ? (
              <p className="text-sm text-muted-foreground">无需材料</p>
            ) : (
              <ul
                aria-label="制作材料"
                className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-2"
              >
                {recipe.materials.map(({ item, itemId, quantity }) => (
                  <li key={itemId} className="min-w-0">
                    <GameplayRelationItem
                      name={item?.name ?? `未知材料 #${itemId}`}
                      image={item?.image ?? null}
                      quantity={quantity}
                      note={item && item.browsable === false ? "无图鉴详情" : undefined}
                      destination={
                        item && item.browsable !== false ? catalogEntryLocation(item) : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
