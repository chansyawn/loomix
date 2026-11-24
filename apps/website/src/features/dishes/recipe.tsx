import { catalogEntryLocation } from "../omnidex/entry-location";
import { gameplayAnchor, useGameplayAccordion } from "../omnidex/gameplay-anchors";
import { GameplayRelationItem } from "../omnidex/gameplay-relation-item";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/ui/components/accordion";
import { Badge } from "@/ui/components/badge";
import type { DishesDetail } from "./detail";
import {
  buildDishRecipeSlots,
  type DishRecipeSlotView,
  type RecipeConditionToken,
} from "./recipe-presentation";

function ConditionToken({ token }: { token: RecipeConditionToken }) {
  if (token.kind === "tag")
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
  const conditionText = slot.conditionTokens
    .map((token) => (token.kind === "tag" ? token.label : token.value))
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

function CandidateItems({ slot, index }: { slot: DishRecipeSlotView; index: number }) {
  const matches = [...slot.candidates, ...slot.references];
  if (!matches.length)
    return <p className="py-4 text-sm text-muted-foreground">暂无已收录的匹配食材</p>;

  return (
    <ul
      aria-label={`食材条件 ${index + 1} 的候选食材`}
      className="grid max-h-80 grid-cols-[repeat(auto-fill,minmax(min(100%,11rem),1fr))] gap-2 overflow-y-auto overscroll-contain rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      tabIndex={0}
    >
      {matches.map((item) => (
        <li key={item.id} className="min-w-0">
          <GameplayRelationItem
            name={item.name}
            image={item.image}
            note={item.browsable === false ? "无图鉴详情" : undefined}
            destination={item.browsable === false ? undefined : catalogEntryLocation(item)}
          />
        </li>
      ))}
    </ul>
  );
}

export function DishRecipe({ detail }: { detail: Extract<DishesDetail, { kind: "item" }> }) {
  const slots = buildDishRecipeSlots(
    detail.record.slots,
    detail.ingredientTagSource.byId,
    detail.ingredientItemsById,
  );
  const expansion = useGameplayAccordion(
    "slot",
    slots.map((_, index) => index + 1),
  );
  if (slots.length === 0) return null;

  return (
    <Accordion multiple {...expansion}>
      {slots.map((slot, index) => {
        const anchor = gameplayAnchor("slot", index + 1);
        return (
          <AccordionItem key={anchor} id={anchor} value={anchor}>
            <AccordionTrigger className="items-start">
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span className="shrink-0 whitespace-nowrap">食材 {index + 1}：</span>
                <ConditionSummary slot={slot} />
                <Badge variant="outline">
                  {slot.candidates.length + slot.references.length} 项候选
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <CandidateItems slot={slot} index={index} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
