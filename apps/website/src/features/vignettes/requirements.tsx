import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { gameplayAnchor, useGameplayAccordion } from "@/features/omnidex/gameplay-anchors";
import { GameplayRelationItem } from "@/features/omnidex/gameplay-relation-item";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/ui/components/accordion";
import { Badge } from "@/ui/components/badge";
import type { VignetteDetail } from "./view";

type Requirement = VignetteDetail["requirements"][number];
type Condition = Requirement["target"];

function conditionName(condition: Condition) {
  return condition.kind === "item" ? condition.item.name : condition.labels.join(" 且 ");
}

function conditionItems(condition: Condition) {
  return condition.kind === "item" ? [condition.item] : condition.matches;
}

function MatchCount({ condition }: { condition: Condition }) {
  if (condition.kind === "item") return null;
  return (
    <Badge variant="outline">
      {condition.matches.length ? `匹配 ${condition.matches.length} 件` : "暂无已收录的匹配物品"}
    </Badge>
  );
}

function RequirementSummary({ row }: { row: Requirement }) {
  return (
    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm">
      <span className="font-semibold">{row.label}</span>
      {row.target.kind === "tags" && row.target.labels.length > 1 && (
        <Badge variant="secondary">{conditionName(row.target)}</Badge>
      )}
      <Badge variant="secondary">×{row.quantity.displayed}</Badge>
      <MatchCount condition={row.target} />
      {row.support && (
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span>需放在{conditionName(row.support)}上</span>
          <MatchCount condition={row.support} />
        </span>
      )}
      {row.area && <span className="text-muted-foreground">配置面积 {row.area}</span>}
      {row.quantity.displayed !== row.quantity.configured && (
        <span className="text-muted-foreground">玩法配置 ×{row.quantity.configured}</span>
      )}
    </span>
  );
}

function ConditionItems({ title, condition }: { title: string; condition: Condition }) {
  const items = conditionItems(condition);
  return (
    <section className="min-w-0 space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {items.length ? (
        <ul
          aria-label={title}
          tabIndex={0}
          className="grid max-h-80 grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-2 overflow-y-auto overscroll-contain rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {items.map((item) => (
            <li key={item.id} className="min-w-0">
              <GameplayRelationItem
                name={item.name}
                image={item.image}
                note={item.browsable ? undefined : "无图鉴详情"}
                destination={item.browsable ? catalogEntryLocation(item) : undefined}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">暂无已收录的匹配物品</p>
      )}
    </section>
  );
}

export function VignetteRequirements({
  requirements,
}: {
  requirements: VignetteDetail["requirements"];
}) {
  const expansion = useGameplayAccordion(
    "requirement",
    requirements.map((_, index) => index + 1),
  );
  return (
    <>
      <p className="text-sm text-muted-foreground">
        物品按图鉴标签匹配，布景完成还取决于游戏内条件。
      </p>
      <Accordion multiple {...expansion}>
        {requirements.map((row, index) => {
          const anchor = gameplayAnchor("requirement", index + 1);
          return (
            <AccordionItem key={anchor} id={anchor} value={anchor}>
              <AccordionTrigger className="items-start text-left">
                <RequirementSummary row={row} />
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 px-1">
                  <ConditionItems
                    title={
                      row.support
                        ? "摆放物"
                        : row.target.kind === "tags"
                          ? "摆放物 · 匹配物品"
                          : "摆放物 · 指定物品"
                    }
                    condition={row.target}
                  />
                  {row.support && <ConditionItems title="承载物" condition={row.support} />}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </>
  );
}
