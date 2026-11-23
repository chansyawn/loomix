import { InspoCardFace } from "@/features/omnidex/inspo-card-face";
import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { GameplayRelationItem } from "@/features/omnidex/gameplay-relation-item";
import { gameplayAnchor, useGameplayAccordion } from "@/features/omnidex/gameplay-anchors";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/ui/components/accordion";
import { Badge } from "@/ui/components/badge";
import type { FurnitureDetail } from "./detail";

type Recipe = Extract<FurnitureDetail, { kind: "item" }>["recipes"][number];
export function FurnitureRecipes({
  recipes,
  productName,
}: {
  recipes: Recipe[];
  productName: string;
}) {
  const expansion = useGameplayAccordion(
    "recipe",
    recipes.map(({ id }) => id),
  );
  return (
    <section
      aria-labelledby="furniture-recipes"
      className="@container/recipes flex min-w-0 flex-col gap-4"
    >
      <h2 id="furniture-recipes" className="text-lg font-semibold">
        制作配方
      </h2>
      <Accordion multiple {...expansion}>
        {recipes.map((recipe, index) => {
          const anchor = gameplayAnchor("recipe", recipe.id);
          return (
            <AccordionItem key={recipe.id} id={anchor} value={anchor} className="scroll-mt-4">
              <AccordionTrigger>
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span>
                    配方 {index + 1} · {recipe.name}
                  </span>
                  <Badge variant="outline">
                    {recipe.materials ? `${recipe.materials.length} 种材料` : "材料未确认"}
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 px-1 @min-[23rem]/recipes:grid-cols-[6rem_minmax(0,1fr)]">
                  <div className="w-24 max-w-full">
                    <InspoCardFace {...recipe.face} productName={productName} />
                  </div>
                  <div className="@container/materials flex min-w-0 flex-col gap-2">
                    <h3 className="text-sm font-medium">所需材料</h3>
                    {recipe.materials === null ? (
                      <p className="text-muted-foreground">材料信息未确认</p>
                    ) : (
                      <ul className="grid gap-2 @min-[21rem]/materials:grid-cols-2">
                        {recipe.materials.map(({ item, itemId, quantity }) => (
                          <li key={itemId} className="min-w-0">
                            <GameplayRelationItem
                              name={item?.name ?? `未知材料 #${itemId}`}
                              image={item?.image ?? null}
                              quantity={quantity}
                              note={item && item.browsable === false ? "无图鉴详情" : undefined}
                              destination={
                                item && item.browsable !== false
                                  ? catalogEntryLocation(item)
                                  : undefined
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
}
