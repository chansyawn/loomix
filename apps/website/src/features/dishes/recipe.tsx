import { Link } from "@tanstack/react-router";
import { RecordImage } from "../collection/record-image";
import { collectionItemLocation } from "../collection/item-route";
import type { IngredientItem } from "../collection-view";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/ui/components/accordion";
import { Badge } from "@/ui/components/badge";
import { Item, ItemContent } from "@/ui/components/item";
import type { DishesDetail } from "./detail";
import { useDishesOrigin } from "./detail-navigation";
import {
  buildDishRecipeSlots,
  type DishRecipeSlotView,
  type RecipeConditionToken,
} from "./recipe-presentation";

function IngredientCard({ item }: { item: IngredientItem }) {
  const origin = useDishesOrigin();
  return (
    <Link
      {...collectionItemLocation(item)}
      state={{ dishesOrigin: origin }}
      className="group/recipe-item block min-w-0 rounded-xl no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Item variant="muted" size="sm" className="h-full">
        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border bg-muted/30">
          <RecordImage image={item.image} name={item.name} compact />
        </div>
        <ItemContent className="min-w-0">
          <span className="line-clamp-2 min-w-0 wrap-anywhere whitespace-normal" title={item.name}>
            {item.name}
          </span>
        </ItemContent>
      </Item>
    </Link>
  );
}

function ConditionToken({ token }: { token: RecipeConditionToken }) {
  if (token.kind === "category")
    return <Badge variant={token.resolved ? "secondary" : "outline"}>{token.label}</Badge>;
  return (
    <span
      className={
        token.kind === "operator" ? "px-0.5 text-xs text-foreground" : "text-muted-foreground"
      }
    >
      {token.value}
    </span>
  );
}

function ConditionSummary({ slot }: { slot: DishRecipeSlotView }) {
  if (slot.conditionStatus === "unparsed")
    return <span className="text-xs text-muted-foreground">条件未收录</span>;
  const conditionText = slot.conditionTokens
    .map((token) => (token.kind === "category" ? token.label : token.value))
    .join(" ");
  return (
    <span className="min-w-0">
      <span className="sr-only">{conditionText}</span>
      <span aria-hidden="true" className="flex min-w-0 flex-wrap items-center gap-1.5">
        {slot.conditionTokens.map((token, index) => (
          <ConditionToken key={`${token.kind}-${index}`} token={token} />
        ))}
      </span>
    </span>
  );
}

function candidateCountLabel(slot: DishRecipeSlotView): string {
  if (slot.candidateStatus === "ready") return String(slot.candidates.length);
  if (slot.candidateStatus === "unconfirmed") return "待确认";
  return "0";
}

function CandidateItems({ slot, index }: { slot: DishRecipeSlotView; index: number }) {
  if (slot.candidateStatus !== "ready")
    return (
      <p className="py-4 text-sm text-muted-foreground">
        {slot.candidateStatus === "unconfirmed" ? "候选食材尚未确认" : "暂无可浏览的收录食材"}
      </p>
    );

  return (
    <ul
      aria-label={`食材条件 ${index + 1} 的候选食材`}
      className="grid max-h-80 grid-cols-[repeat(auto-fill,minmax(min(100%,11rem),1fr))] gap-2 overflow-y-auto overscroll-contain rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      tabIndex={0}
    >
      {slot.candidates.map((item) => (
        <li key={item.id} className="min-w-0">
          <IngredientCard item={item} />
        </li>
      ))}
    </ul>
  );
}

export function DishRecipe({ detail }: { detail: Extract<DishesDetail, { kind: "item" }> }) {
  const slots = buildDishRecipeSlots(
    detail.record.recipe,
    detail.ingredientCategoriesById,
    detail.ingredientItemsById,
  );
  if (slots.length === 0) return null;

  return (
    <section aria-labelledby="dish-recipe" className="min-w-0 space-y-4">
      <h2 id="dish-recipe" className="text-lg font-semibold">
        配方
      </h2>
      <Accordion multiple>
        {slots.map((slot, index) => (
          <AccordionItem key={`${slot.field}-${index}`} value={`${slot.field}-${index}`}>
            <AccordionTrigger className="items-start">
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span className="shrink-0 whitespace-nowrap">食材 {index + 1}：</span>
                <ConditionSummary slot={slot} />
                <Badge variant="outline">{candidateCountLabel(slot)}</Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <CandidateItems slot={slot} index={index} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
