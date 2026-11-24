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
    <section
      aria-labelledby="furniture-recipes"
      className="@container/recipes flex min-w-0 flex-col gap-4"
    >
      <h2 id="furniture-recipes" className="text-lg font-semibold">
        制作配方
      </h2>
      <ul className="flex flex-col gap-4">
        {recipes.map((recipe) => (
          <li
            key={recipe.id}
            id={gameplayAnchor("recipe", recipe.id)}
            className="grid scroll-mt-4 grid-cols-1 items-start gap-3 @min-[26rem]/recipes:grid-cols-[7.5rem_minmax(0,1fr)] @min-[26rem]/recipes:gap-4"
          >
            <InspoCardFace
              {...recipe.face}
              productName={productName}
              className="mx-auto max-w-30 @min-[26rem]/recipes:mx-0 @min-[26rem]/recipes:max-w-none"
            />
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
          </li>
        ))}
      </ul>
    </section>
  );
}
