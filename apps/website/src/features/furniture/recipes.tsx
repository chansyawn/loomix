import { Link } from "@tanstack/react-router";
import { CreationCardFace } from "@/features/collection/creation-card-face";
import { recordLocation } from "@/features/collection/item-route";
import { useCollectionOrigin } from "@/features/collection/navigation";
import { RecordImage } from "@/features/collection/record-image";
import { Card, CardContent, CardHeader } from "@/ui/components/card";
import { Item, ItemMedia } from "@/ui/components/item";
import { Separator } from "@/ui/components/separator";
import type { FurnitureDetail } from "./detail";

type Recipe = Extract<FurnitureDetail, { kind: "item" }>["recipes"][number];
type Material = NonNullable<Recipe["materials"]>[number];

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
      <div className="grid gap-3">
        {recipes.map((recipe) => (
          <article key={recipe.id}>
            <Card size="sm">
              <div className="grid gap-3 @min-[17rem]/recipes:grid-cols-[8.5rem_auto_minmax(0,1fr)] @min-[17rem]/recipes:gap-0">
                <CardHeader className="justify-items-center self-start">
                  <div className="w-28 max-w-full">
                    <CreationCardFace {...recipe.face} productName={productName} />
                  </div>
                </CardHeader>
                <Separator className="mx-3 @min-[17rem]/recipes:hidden data-horizontal:w-auto" />
                <Separator orientation="vertical" className="hidden @min-[17rem]/recipes:block" />
                <CardContent className="@container/materials min-w-0 self-start">
                  <h3 className="mb-2 font-medium">所需材料</h3>
                  {recipe.materials === null ? (
                    <p className="text-muted-foreground">材料信息未确认</p>
                  ) : (
                    <ul className="grid gap-2 @min-[15rem]/materials:grid-cols-2">
                      {recipe.materials.map((material) => (
                        <li key={material.itemId} className="min-w-0">
                          <RecipeMaterial {...material} />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </div>
            </Card>
          </article>
        ))}
      </div>
    </section>
  );
}

function RecipeMaterial({ item, itemId, quantity }: Material) {
  const origin = useCollectionOrigin();
  const name = item?.name ?? `未知材料 #${itemId}`;
  const link =
    item && item.browsable !== false ? (
      <Link {...recordLocation(item)} state={{ collectionOrigin: origin }} />
    ) : undefined;

  return (
    <Item
      variant="muted"
      size="xs"
      render={link}
      className="grid h-full min-h-11 grid-cols-[1.5rem_minmax(0,1fr)]"
    >
      <ItemMedia aria-hidden="true" className="size-6">
        <RecordImage
          image={item?.image ?? null}
          name=""
          inset="none"
          background="none"
          fallback="icon"
        />
      </ItemMedia>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="min-w-0 flex-auto text-xs wrap-anywhere">{name}</span>
        <span className="ml-auto shrink-0 text-xs font-medium whitespace-nowrap tabular-nums">
          ×{quantity}
        </span>
      </div>
    </Item>
  );
}
